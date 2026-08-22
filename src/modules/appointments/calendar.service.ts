import { createHash, randomBytes } from 'node:crypto';

import type { CalendarCallbackQuery, ExternalEventsQuery } from './appointment.schemas';
import { AppointmentError } from './appointment.types';
import { AesGcmTokenCipher, TokenCipher } from './calendar.crypto';
import {
  CalendarProvider,
  CalendarProviderError,
  GoogleCalendarProvider,
} from './calendar.provider';
import {
  CalendarRepository,
  SequelizeCalendarRepository,
} from './calendar.repository';

export interface CalendarServiceDependencies {
  cipher?: TokenCipher;
  provider?: CalendarProvider;
  repository?: CalendarRepository;
  clock?: () => Date;
}

export class CalendarService {
  private readonly cipher: TokenCipher;
  private readonly provider: CalendarProvider;
  private readonly repository: CalendarRepository;
  private readonly clock: () => Date;

  constructor(dependencies: CalendarServiceDependencies = {}) {
    this.cipher = dependencies.cipher ?? new AesGcmTokenCipher();
    this.provider = dependencies.provider ?? new GoogleCalendarProvider();
    this.repository = dependencies.repository ?? new SequelizeCalendarRepository();
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async authorization(userId: number) {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(64).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    await this.repository.storeState(
      userId,
      state,
      this.cipher.encrypt(verifier),
      new Date(this.clock().getTime() + 10 * 60_000)
    );
    return { authorizationUrl: this.provider.authorizationUrl(state, challenge) };
  }

  async callback(query: CalendarCallbackQuery) {
    const state = await this.repository.consumeState(query.state);
    if (query.error || !query.code) {
      throw new AppointmentError('CALENDAR_OAUTH_DENIED', 'La autorizacion de Google fue cancelada');
    }
    const result = await this.provider.exchangeCode(query.code, this.cipher.decrypt(state.encryptedVerifier));
    if (!result.refreshToken) {
      throw new AppointmentError('CALENDAR_OAUTH_TOKEN_MISSING', 'Google no devolvio un refresh token; vuelve a autorizar la conexion');
    }
    await this.repository.connect(state.userId, this.cipher.encrypt(result.refreshToken), result.scopes);
    await this.repository.enqueueAll(state.userId);
    return { userId: state.userId };
  }

  async status(userId: number) {
    const connection = await this.repository.getConnection(userId);
    if (!connection) return { provider: 'GOOGLE' as const, status: 'DISCONNECTED' as const, connectedAt: null, lastSyncAt: null, errorCode: null };
    return {
      provider: 'GOOGLE' as const,
      status: connection.status,
      connectedAt: connection.connectedAt.toISOString(),
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      errorCode: connection.lastErrorCode,
    };
  }

  async disconnect(userId: number) {
    const connection = await this.repository.getConnection(userId);
    if (!connection || connection.status === 'DISCONNECTED') return;
    try {
      await this.provider.revoke(this.cipher.decrypt(connection.encryptedRefreshToken));
    } catch {
      // Local revocation is authoritative; provider revocation is best effort.
    }
    await this.repository.disconnect(userId);
  }

  async synchronize(userId: number) {
    const connection = await this.activeConnection(userId);
    const refreshToken = this.cipher.decrypt(connection.encryptedRefreshToken);
    const work = await this.repository.claim(userId, 25);
    let synchronized = 0;
    let failed = 0;
    for (const item of work) {
      try {
        if (item.operation === 'DELETE') {
          if (item.externalEventId) await this.provider.remove(refreshToken, item.externalEventId);
          await this.repository.complete(item, null, null);
        } else {
          const result = await this.provider.upsert(refreshToken, item);
          await this.repository.complete(item, result.externalEventId, result.etag);
        }
        synchronized += 1;
      } catch (error) {
        failed += 1;
        const code = error instanceof CalendarProviderError ? error.code : 'PROVIDER_ERROR';
        const reauth = code === 'REAUTH_REQUIRED';
        const delay = reauth
          ? 24 * 60 * 60_000
          : Math.min(
              60 * 60_000,
              2 ** Math.min(item.attempts + 1, 12) * 1000 +
                Math.floor(Math.random() * 1000)
            );
        await this.repository.fail(item, code, new Date(this.clock().getTime() + delay), reauth);
      }
    }
    return { claimed: work.length, synchronized, failed };
  }

  async externalEvents(userId: number, query: ExternalEventsQuery) {
    const connection = await this.activeConnection(userId);
    try {
      return await this.provider.list(
        this.cipher.decrypt(connection.encryptedRefreshToken),
        query.from,
        query.to,
        query.timeZone
      );
    } catch (error) {
      if (
        error instanceof CalendarProviderError &&
        error.code === 'REAUTH_REQUIRED'
      ) {
        await this.repository.requireResync(userId);
        throw new AppointmentError(
          'CALENDAR_REAUTH_REQUIRED',
          'Google Calendar requiere autorizacion nuevamente'
        );
      }
      throw new AppointmentError(
        'CALENDAR_PROVIDER_UNAVAILABLE',
        'Google Calendar no esta disponible temporalmente'
      );
    }
  }

  private async activeConnection(userId: number) {
    const connection = await this.repository.getConnection(userId);
    if (!connection || connection.status === 'DISCONNECTED') {
      throw new AppointmentError('CALENDAR_NOT_CONNECTED', 'Google Calendar no esta conectado');
    }
    if (connection.status === 'REAUTH_REQUIRED') {
      throw new AppointmentError('CALENDAR_REAUTH_REQUIRED', 'Google Calendar requiere autorizacion nuevamente');
    }
    return connection;
  }
}

import { createHash } from 'node:crypto';

import { Op, Transaction } from 'sequelize';

import db from '../../db/connection';
import Appointment from '../../models/appointment.model';
import CalendarConnection from '../../models/calendar-connection.model';
import CalendarSyncJob from '../../models/calendar-sync-job.model';
import OAuthState from '../../models/oauth-state.model';
import { AppointmentError } from './appointment.types';

export interface CalendarConnectionData {
  encryptedRefreshToken: string;
  status: 'ACTIVE' | 'REAUTH_REQUIRED' | 'DISCONNECTED';
  scopes: string[];
  connectedAt: Date;
  disconnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastErrorCode: string | null;
}

export interface CalendarSyncWork {
  jobId: number;
  attempts: number;
  version: number;
  operation: 'UPSERT' | 'DELETE';
  appointmentId: number;
  userId: number;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  externalEventId: string | null;
}

export interface CalendarRepository {
  storeState(userId: number, state: string, encryptedVerifier: string, expiresAt: Date): Promise<void>;
  consumeState(state: string): Promise<{ userId: number; encryptedVerifier: string }>;
  getConnection(userId: number): Promise<CalendarConnectionData | null>;
  connect(userId: number, encryptedRefreshToken: string, scopes: string[]): Promise<void>;
  disconnect(userId: number): Promise<void>;
  requireResync(userId: number): Promise<void>;
  enqueueAll(userId: number): Promise<void>;
  claim(userId: number, limit: number): Promise<CalendarSyncWork[]>;
  complete(work: CalendarSyncWork, externalEventId: string | null, etag: string | null): Promise<void>;
  fail(work: CalendarSyncWork, code: string, retryAt: Date, reauth: boolean): Promise<void>;
}

const stateHash = (state: string) => createHash('sha256').update(state).digest('hex');

const mapConnection = (value: CalendarConnection): CalendarConnectionData => ({
  encryptedRefreshToken: value.encrypted_refresh_token,
  status: value.status,
  scopes: value.scopes,
  connectedAt: value.connected_at,
  disconnectedAt: value.disconnected_at,
  lastSyncAt: value.last_sync_at,
  lastErrorCode: value.last_error_code,
});

export class SequelizeCalendarRepository implements CalendarRepository {
  async storeState(userId: number, state: string, encryptedVerifier: string, expiresAt: Date) {
    await OAuthState.create({
      user_id: userId,
      state_hash: stateHash(state),
      provider: 'GOOGLE',
      code_verifier_ciphertext: encryptedVerifier,
      expires_at: expiresAt,
    });
  }

  async consumeState(state: string) {
    let result: { userId: number; encryptedVerifier: string } | null = null;
    await db.transaction(async (transaction) => {
      const stored = await OAuthState.findOne({
        where: { state_hash: stateHash(state), provider: 'GOOGLE' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!stored || stored.used_at || stored.expires_at <= new Date() || !stored.code_verifier_ciphertext) {
        throw new AppointmentError('CALENDAR_OAUTH_STATE_INVALID', 'Estado OAuth invalido o expirado');
      }
      await stored.update({ used_at: new Date() }, { transaction });
      result = { userId: stored.user_id, encryptedVerifier: stored.code_verifier_ciphertext };
    });
    return result!;
  }

  async getConnection(userId: number) {
    const connection = await CalendarConnection.findOne({ where: { user_id: userId } });
    return connection ? mapConnection(connection) : null;
  }

  async connect(userId: number, encryptedRefreshToken: string, scopes: string[]) {
    const now = new Date();
    const existing = await CalendarConnection.findOne({ where: { user_id: userId } });
    const values = {
      encrypted_refresh_token: encryptedRefreshToken,
      token_key_version: 1,
      calendar_id: 'primary',
      scopes,
      status: 'ACTIVE' as const,
      connected_at: now,
      disconnected_at: null,
      last_error_code: null,
    };
    if (existing) await existing.update(values);
    else await CalendarConnection.create({ user_id: userId, ...values });
  }

  async disconnect(userId: number) {
    await db.transaction(async (transaction) => {
      await CalendarConnection.destroy({ where: { user_id: userId }, transaction });
      await CalendarSyncJob.destroy({ where: { user_id: userId }, transaction });
      await Appointment.update(
        { sync_status: 'NOT_CONNECTED', sync_error_code: null },
        { where: { user_id: userId }, transaction }
      );
    });
  }

  async requireResync(userId: number) {
    await CalendarConnection.update(
      { status: 'REAUTH_REQUIRED', last_error_code: 'REAUTH_REQUIRED' },
      { where: { user_id: userId } }
    );
  }

  async enqueueAll(userId: number) {
    await db.transaction(async (transaction) => {
      const appointments = await Appointment.findAll({
        where: { user_id: userId, status: { [Op.ne]: 'CANCELLED' } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      for (const appointment of appointments) {
        await appointment.update({ sync_status: 'PENDING', sync_error_code: null }, { transaction });
        await this.upsertJob(appointment, 'UPSERT', transaction);
      }
    });
  }

  async claim(userId: number, limit: number) {
    const work: CalendarSyncWork[] = [];
    await db.transaction(async (transaction) => {
      const jobs = await CalendarSyncJob.findAll({
        where: {
          user_id: userId,
          processed_at: null,
          available_at: { [Op.lte]: new Date() },
          [Op.or]: [
            { locked_at: null },
            { locked_at: { [Op.lt]: new Date(Date.now() - 5 * 60_000) } },
          ],
        },
        limit,
        order: [['available_at', 'ASC'], ['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      for (const job of jobs) {
        const appointment = await Appointment.findOne({
          where: { id: job.appointment_id, user_id: userId },
          transaction,
        });
        if (!appointment) {
          await job.destroy({ transaction });
          continue;
        }
        await job.update({ locked_at: new Date() }, { transaction });
        work.push({
          jobId: job.id,
          attempts: job.attempts,
          version: job.version,
          operation: job.operation,
          appointmentId: appointment.id,
          userId,
          startsAt: appointment.appointment_datetime,
          endsAt: appointment.appointment_end_datetime,
          timeZone: appointment.time_zone,
          externalEventId: appointment.google_event_id,
        });
      }
    });
    return work;
  }

  async complete(work: CalendarSyncWork, externalEventId: string | null, etag: string | null) {
    await db.transaction(async (transaction) => {
      const job = await this.currentJob(work, transaction);
      if (!job) return;
      await Appointment.update(
        {
          google_event_id: work.operation === 'DELETE' ? null : externalEventId,
          external_etag: work.operation === 'DELETE' ? null : etag,
          sync_status: 'SYNCED',
          synced_at: new Date(),
          sync_error_code: null,
        },
        { where: { id: work.appointmentId, user_id: work.userId, sync_version: work.version }, transaction }
      );
      await job.update({ processed_at: new Date(), locked_at: null, last_error_code: null }, { transaction });
      await CalendarConnection.update(
        { last_sync_at: new Date(), last_error_code: null },
        { where: { user_id: work.userId }, transaction }
      );
    });
  }

  async fail(work: CalendarSyncWork, code: string, retryAt: Date, reauth: boolean) {
    await db.transaction(async (transaction) => {
      const job = await this.currentJob(work, transaction);
      if (!job) return;
      await job.update(
        { attempts: job.attempts + 1, available_at: retryAt, locked_at: null, last_error_code: code },
        { transaction }
      );
      await Appointment.update(
        { sync_status: 'FAILED', sync_error_code: code },
        { where: { id: work.appointmentId, user_id: work.userId, sync_version: work.version }, transaction }
      );
      await CalendarConnection.update(
        { ...(reauth && { status: 'REAUTH_REQUIRED' }), last_error_code: code },
        { where: { user_id: work.userId }, transaction }
      );
    });
  }

  private async upsertJob(appointment: Appointment, operation: 'UPSERT' | 'DELETE', transaction: Transaction) {
    const existing = await CalendarSyncJob.findOne({
      where: { appointment_id: appointment.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const values = {
      user_id: appointment.user_id,
      operation,
      version: appointment.sync_version,
      attempts: 0,
      available_at: new Date(),
      locked_at: null,
      processed_at: null,
      last_error_code: null,
    } as const;
    if (existing) await existing.update(values, { transaction });
    else await CalendarSyncJob.create({ ...values, appointment_id: appointment.id }, { transaction });
  }

  private async currentJob(work: CalendarSyncWork, transaction: Transaction) {
    return CalendarSyncJob.findOne({
      where: { id: work.jobId, version: work.version, processed_at: null },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }
}

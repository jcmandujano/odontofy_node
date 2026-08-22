import { createHash } from 'node:crypto';

import { google } from 'googleapis';
import { CodeChallengeMethod } from 'google-auth-library';
import { AppointmentError } from './appointment.types';

export interface CalendarEventInput {
  appointmentId: number;
  userId: number;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  externalEventId: string | null;
}

export interface ExternalCalendarEvent {
  id: string;
  summary: string | null;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
}

export interface CalendarProvider {
  authorizationUrl(state: string, codeChallenge: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<{ refreshToken: string | null; scopes: string[] }>;
  revoke(refreshToken: string): Promise<void>;
  upsert(refreshToken: string, event: CalendarEventInput): Promise<{ externalEventId: string; etag: string | null }>;
  remove(refreshToken: string, externalEventId: string): Promise<void>;
  list(refreshToken: string, from: string, to: string, timeZone: string): Promise<ExternalCalendarEvent[]>;
}

export class CalendarProviderError extends Error {
  constructor(readonly code: 'REAUTH_REQUIRED' | 'RATE_LIMITED' | 'PROVIDER_ERROR') {
    super(code);
    this.name = 'CalendarProviderError';
  }
}

const eventId = (userId: number, appointmentId: number) =>
  `odo${createHash('sha256').update(`${userId}:${appointmentId}`).digest('hex').slice(0, 40)}`;

const providerError = (error: unknown): CalendarProviderError => {
  const status = typeof error === 'object' && error && 'code' in error ? Number(error.code) : 0;
  if (status === 401) return new CalendarProviderError('REAUTH_REQUIRED');
  if (status === 403 || status === 429) return new CalendarProviderError('RATE_LIMITED');
  return new CalendarProviderError('PROVIDER_ERROR');
};

export class GoogleCalendarProvider implements CalendarProvider {
  private client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/v1/calendar/google/callback`;
    if (!clientId || !clientSecret) {
      throw new AppointmentError(
        'CALENDAR_CONFIGURATION_INVALID',
        'Google Calendar OAuth no esta configurado'
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  authorizationUrl(state: string, codeChallenge: string) {
    return this.client().generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
  }

  async exchangeCode(code: string, codeVerifier: string) {
    try {
      const { tokens } = await this.client().getToken({ code, codeVerifier });
      return {
        refreshToken: tokens.refresh_token ?? null,
        scopes: tokens.scope?.split(' ').filter(Boolean) ?? ['https://www.googleapis.com/auth/calendar.events'],
      };
    } catch (error) {
      throw providerError(error);
    }
  }

  async revoke(refreshToken: string) {
    try {
      await this.client().revokeToken(refreshToken);
    } catch (error) {
      throw providerError(error);
    }
  }

  async upsert(refreshToken: string, event: CalendarEventInput) {
    const auth = this.client();
    auth.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth });
    const requestedId = event.externalEventId ?? eventId(event.userId, event.appointmentId);
    const requestBody = {
      summary: 'Cita Odontofy',
      start: { dateTime: event.startsAt.toISOString(), timeZone: event.timeZone },
      end: { dateTime: event.endsAt.toISOString(), timeZone: event.timeZone },
      extendedProperties: { private: { odontofyAppointmentId: String(event.appointmentId), odontofyManaged: 'true' } },
    };
    try {
      const response = event.externalEventId
        ? await calendar.events.update({ calendarId: 'primary', eventId: requestedId, requestBody })
        : await calendar.events.insert({ calendarId: 'primary', requestBody: { ...requestBody, id: requestedId } });
      return { externalEventId: response.data.id ?? requestedId, etag: response.data.etag ?? null };
    } catch (error) {
      const status = typeof error === 'object' && error && 'code' in error ? Number(error.code) : 0;
      if (!event.externalEventId && status === 409) {
        const response = await calendar.events.update({ calendarId: 'primary', eventId: requestedId, requestBody });
        return { externalEventId: response.data.id ?? requestedId, etag: response.data.etag ?? null };
      }
      throw providerError(error);
    }
  }

  async remove(refreshToken: string, externalEventId: string) {
    const auth = this.client();
    auth.setCredentials({ refresh_token: refreshToken });
    try {
      await google.calendar({ version: 'v3', auth }).events.delete({ calendarId: 'primary', eventId: externalEventId });
    } catch (error) {
      const status = typeof error === 'object' && error && 'code' in error ? Number(error.code) : 0;
      if (status !== 404 && status !== 410) throw providerError(error);
    }
  }

  async list(refreshToken: string, from: string, to: string, timeZone: string) {
    const auth = this.client();
    auth.setCredentials({ refresh_token: refreshToken });
    try {
      const response = await google.calendar({ version: 'v3', auth }).events.list({
        calendarId: 'primary',
        timeMin: from,
        timeMax: to,
        timeZone,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });
      return (response.data.items ?? [])
        .filter((item) => item.status !== 'cancelled' && !item.extendedProperties?.private?.odontofyManaged)
        .map((item) => ({
          id: item.id ?? '',
          summary: item.summary ?? null,
          startsAt: item.start?.dateTime ?? item.start?.date ?? null,
          endsAt: item.end?.dateTime ?? item.end?.date ?? null,
          allDay: Boolean(item.start?.date && !item.start?.dateTime),
        }))
        .filter((item) => item.id);
    } catch (error) {
      throw providerError(error);
    }
  }
}

export const deterministicGoogleEventId = eventId;

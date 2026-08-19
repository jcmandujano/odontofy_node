import { randomBytes, randomUUID } from 'node:crypto';

import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import Appointment from '../../src/models/appointment.model';
import CalendarConnection from '../../src/models/calendar-connection.model';
import CalendarSyncJob from '../../src/models/calendar-sync-job.model';
import Patient from '../../src/models/patient.model';
import User from '../../src/models/user.model';
import { AesGcmTokenCipher } from '../../src/modules/appointments/calendar.crypto';
import type {
  CalendarEventInput,
  CalendarProvider,
} from '../../src/modules/appointments/calendar.provider';
import { deterministicGoogleEventId } from '../../src/modules/appointments/calendar.provider';
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens';

class FakeCalendarProvider implements CalendarProvider {
  failUpserts = false;
  exchangedVerifier: string | null = null;
  upsertedIds: string[] = [];
  removedIds: string[] = [];

  authorizationUrl(state: string, codeChallenge: string) {
    return `https://accounts.example.test/authorize?state=${state}&code_challenge=${codeChallenge}`;
  }

  async exchangeCode(_code: string, codeVerifier: string) {
    this.exchangedVerifier = codeVerifier;
    return { refreshToken: 'synthetic-refresh-secret', scopes: ['calendar.events'] };
  }

  async revoke(_refreshToken: string) {}

  async upsert(_refreshToken: string, event: CalendarEventInput) {
    if (this.failUpserts) throw new Error('Synthetic provider outage');
    const id = event.externalEventId ?? deterministicGoogleEventId(event.userId, event.appointmentId);
    this.upsertedIds.push(id);
    return { externalEventId: id, etag: `etag-${event.appointmentId}` };
  }

  async remove(_refreshToken: string, externalEventId: string) {
    this.removedIds.push(externalEventId);
  }

  async list() {
    return [
      {
        id: 'external-only',
        summary: 'Bloque externo',
        startsAt: '2026-08-22T16:00:00.000Z',
        endsAt: '2026-08-22T17:00:00.000Z',
        allDay: false,
      },
    ];
  }
}

const originalEnvironment = { ...process.env };
const logger = pino({ level: 'silent' });
const provider = new FakeCalendarProvider();
const cipher = new AesGcmTokenCipher(randomBytes(32).toString('base64'));

let app: ReturnType<typeof createApp>;
let ownerA: User;
let ownerB: User;
let patientA: Patient;
let patientB: Patient;
let tokenA: string;
let tokenB: string;
let appointmentId: number;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const owner = (suffix: string) =>
  User.create({
    name: `Agenda ${suffix}`,
    middle_name: '',
    last_name: 'F9',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `agenda-${suffix}-${randomUUID()}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  });
const patient = (userId: number, suffix: string) =>
  Patient.create({
    user_id: userId,
    name: `Paciente ${suffix}`,
    middle_name: null,
    last_name: 'F9',
    status: true,
    debt: 0,
  });
const payload = (patientId: number) => ({
  patientId,
  startsAt: '2026-08-22T10:00:00-06:00',
  endsAt: '2026-08-22T11:00:00-06:00',
  timeZone: 'America/Mexico_City',
  reason: 'Revision',
});

beforeAll(async () => {
  process.env.JWT_SECRET = 'appointments-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-appointments-test';
  process.env.JWT_AUDIENCE = 'odontofy-appointments-client';
  await import('../../src/models/appointment.model');
  await dbAuthenticate();
  ownerA = await owner('a');
  ownerB = await owner('b');
  patientA = await patient(ownerA.id, 'A');
  patientB = await patient(ownerB.id, 'B');
  const tokens = new JwtAccessTokenService();
  tokenA = tokens.issue(ownerA.id, 0);
  tokenB = tokens.issue(ownerB.id, 0);
  app = createApp({
    logger,
    readinessCheck: async () => undefined,
    appointmentModule: { calendar: { cipher, provider } },
  });
});

afterAll(async () => {
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

async function dbAuthenticate() {
  const { default: db } = await import('../../src/db/connection');
  await db.authenticate();
}

describe('appointments v1 and durable calendar synchronization', () => {
  it('enforces strict DTOs, patient ownership and local source of truth', async () => {
    const massAssignment = await request(app)
      .post('/api/v1/appointments')
      .set(bearer(tokenA))
      .send({ ...payload(patientA.id), userId: ownerB.id });
    const foreignPatient = await request(app)
      .post('/api/v1/appointments')
      .set(bearer(tokenA))
      .send(payload(patientB.id));
    const created = await request(app)
      .post('/api/v1/appointments')
      .set(bearer(tokenA))
      .send(payload(patientA.id));

    expect(massAssignment.status).toBe(400);
    expect(foreignPatient.status).toBe(404);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      patientId: patientA.id,
      status: 'SCHEDULED',
      sync: { status: 'NOT_CONNECTED', version: 1 },
    });
    expect(created.body.data).not.toHaveProperty('userId');
    appointmentId = created.body.data.id;

    const hidden = await request(app)
      .get(`/api/v1/appointments/${appointmentId}`)
      .set(bearer(tokenB));
    expect(hidden.status).toBe(404);
  });

  it('uses one-time PKCE state and stores only encrypted refresh credentials', async () => {
    const authorization = await request(app)
      .post('/api/v1/calendar/connection/authorization')
      .set(bearer(tokenA));
    const url = new URL(authorization.body.data.authorizationUrl);
    const state = url.searchParams.get('state')!;

    expect(authorization.status).toBe(200);
    expect(url.searchParams.get('code_challenge')).toBeTruthy();

    const callback = await request(app)
      .get('/api/v1/calendar/google/callback')
      .query({ code: 'synthetic-code', state })
      .set('Accept', 'text/html');
    const replay = await request(app)
      .get('/api/v1/calendar/google/callback')
      .query({ code: 'synthetic-code', state })
      .set('Accept', 'text/html');
    const stored = await CalendarConnection.findOne({ where: { user_id: ownerA.id } });

    expect(callback.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(provider.exchangedVerifier).toBeTruthy();
    expect(stored?.status).toBe('ACTIVE');
    expect(stored?.encrypted_refresh_token).not.toContain('synthetic-refresh-secret');
    expect(await CalendarSyncJob.count({ where: { appointment_id: appointmentId } })).toBe(1);
  });

  it('keeps local writes after provider failure and retries idempotently', async () => {
    provider.failUpserts = true;
    const failedSync = await request(app)
      .post('/api/v1/calendar/sync')
      .set(bearer(tokenA));
    let stored = await Appointment.findByPk(appointmentId);

    expect(failedSync.body.data).toMatchObject({ claimed: 1, synchronized: 0, failed: 1 });
    expect(stored?.sync_status).toBe('FAILED');
    expect(stored?.status).toBe('SCHEDULED');

    await CalendarSyncJob.update(
      { available_at: new Date(Date.now() - 1000) },
      { where: { appointment_id: appointmentId } }
    );
    provider.failUpserts = false;
    const retried = await request(app)
      .post('/api/v1/calendar/sync')
      .set(bearer(tokenA));
    stored = await Appointment.findByPk(appointmentId);

    expect(retried.body.data.synchronized).toBe(1);
    expect(stored?.sync_status).toBe('SYNCED');
    expect(stored?.google_event_id).toBe(deterministicGoogleEventId(ownerA.id, appointmentId));

    await request(app)
      .patch(`/api/v1/appointments/${appointmentId}`)
      .set(bearer(tokenA))
      .send({ reason: 'Revision actualizada' });
    await request(app).post('/api/v1/calendar/sync').set(bearer(tokenA));
    expect(provider.upsertedIds.at(-1)).toBe(deterministicGoogleEventId(ownerA.id, appointmentId));
  });

  it('soft-cancels locally and deletes the external event through the outbox', async () => {
    const cancelled = await request(app)
      .delete(`/api/v1/appointments/${appointmentId}`)
      .set(bearer(tokenA));
    await request(app).post('/api/v1/calendar/sync').set(bearer(tokenA));
    const stored = await Appointment.findByPk(appointmentId);

    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(stored).not.toBeNull();
    expect(stored?.cancelled_at).not.toBeNull();
    expect(stored?.sync_status).toBe('SYNCED');
    expect(provider.removedIds).toContain(deterministicGoogleEventId(ownerA.id, appointmentId));
  });

  it('returns provider-only events from a separate endpoint', async () => {
    const local = await request(app)
      .get('/api/v1/appointments')
      .query({ from: '2026-08-22T00:00:00Z', to: '2026-08-23T00:00:00Z' })
      .set(bearer(tokenA));
    const external = await request(app)
      .get('/api/v1/calendar/external-events')
      .query({
        from: '2026-08-22T00:00:00Z',
        to: '2026-08-23T00:00:00Z',
        timeZone: 'America/Mexico_City',
      })
      .set(bearer(tokenA));

    expect(local.body.data.some((item: { id?: string }) => item.id === 'external-only')).toBe(false);
    expect(external.body.data).toEqual([
      expect.objectContaining({ id: 'external-only', summary: 'Bloque externo' }),
    ]);
  });
});

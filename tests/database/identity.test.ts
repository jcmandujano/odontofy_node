import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request, { SuperAgentTest } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import db from '../../src/db/connection';
import AuthSession from '../../src/models/auth-session.model';
import User from '../../src/models/user.model';
import {
  IdentityEmailSender,
  IdentityUser,
} from '../../src/modules/identity/identity.types';

interface RecordedEmail {
  email: string;
  token: string;
}

class RecordingEmailSender implements IdentityEmailSender {
  readonly verification: RecordedEmail[] = [];
  readonly passwordReset: RecordedEmail[] = [];

  async sendAccountVerification(
    user: IdentityUser,
    token: string
  ): Promise<void> {
    this.verification.push({ email: user.email, token });
  }

  async sendPasswordReset(
    user: IdentityUser,
    token: string
  ): Promise<void> {
    this.passwordReset.push({ email: user.email, token });
  }
}

const silentLogger = pino({ level: 'silent' });
const email = `identity-${randomUUID()}@example.test`;
const initialPassword = 'CorrectHorseBattery1!';
const nextPassword = 'another secure passphrase 2026';
const originalEnvironment = { ...process.env };
const emails = new RecordingEmailSender();

let app: ReturnType<typeof createApp>;
let agent: SuperAgentTest;
let userId: number;
let accessToken: string;
let initialRefreshCookie: string;
let rotatedRefreshCookie: string;

const firstCookie = (response: request.Response): string => {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new Error('Expected Set-Cookie header');
  return value.split(';')[0];
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'database-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-database-test';
  process.env.JWT_AUDIENCE = 'odontofy-database-client';
  process.env.JWT_ACCESS_TTL_SECONDS = '600';
  process.env.BCRYPT_ROUNDS = '10';
  await db.authenticate();
  app = createApp({
    identity: { emailSender: emails },
    logger: silentLogger,
    readinessCheck: async () => undefined,
  });
  agent = request.agent(app);
});

afterAll(async () => {
  await User.destroy({ where: { email }, force: true });
  process.env = { ...originalEnvironment };
});

describe('identity v1 lifecycle', () => {
  it('rejects mass assignment before creating an account', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Ada',
      lastName: 'Lovelace',
      email,
      password: initialPassword,
      status: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].code).toBe('VALIDATION_ERROR');
    expect(await User.count({ where: { email } })).toBe(0);
  });

  it('registers a pending account with a hashed password and generic response', async () => {
    const payload = {
      name: 'Ada',
      middleName: '',
      lastName: 'Lovelace',
      dateOfBirth: '1990-12-10',
      phone: '0000000000',
      avatar: '',
      email,
      password: initialPassword,
    };
    const created = await request(app).post('/api/v1/auth/register').send(payload);
    const duplicate = await request(app).post('/api/v1/auth/register').send(payload);
    const user = await User.findOne({ where: { email } });

    expect(created.status).toBe(202);
    expect(duplicate.status).toBe(202);
    expect(created.body.message).toBe(duplicate.body.message);
    expect(user).not.toBeNull();
    expect(user?.status).toBe(false);
    expect(user?.password).not.toBe(initialPassword);
    expect(user?.auth_version).toBe(0);
    expect(emails.verification).toHaveLength(1);
    userId = user?.id as number;
  });

  it('does not reveal whether credentials are missing, wrong, or inactive', async () => {
    const missing = await request(app).post('/api/v1/auth/login').send({
      email: `missing-${randomUUID()}@example.test`,
      password: initialPassword,
    });
    const inactive = await request(app).post('/api/v1/auth/login').send({
      email,
      password: initialPassword,
    });

    expect(missing.status).toBe(401);
    expect(inactive.status).toBe(401);
    expect(missing.body.message).toBe(inactive.body.message);
    expect(missing.body.errors[0].code).toBe('INVALID_CREDENTIALS');
    expect(inactive.body.errors[0].code).toBe('INVALID_CREDENTIALS');
  });

  it('consumes account verification exactly once', async () => {
    const token = emails.verification[0].token;
    const confirmed = await request(app)
      .post('/api/v1/auth/account-verification/confirm')
      .send({ userId, token });
    const replay = await request(app)
      .post('/api/v1/auth/account-verification/confirm')
      .send({ userId, token });

    expect(confirmed.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(replay.body.errors[0].code).toBe('INVALID_TOKEN');
    expect((await User.findByPk(userId))?.status).toBe(true);
  });

  it('logs in, sets a protected refresh cookie, and returns a safe DTO', async () => {
    const response = await agent.post('/api/v1/auth/login').send({
      email,
      password: initialPassword,
    });
    const cookieHeader = response.headers['set-cookie'] as unknown as string[];

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: userId,
      email,
      middleName: '',
      dateOfBirth: '1990-12-10',
      showFinanceStats: false,
      isGoogleSynced: false,
    });
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(response.body.data.user).not.toHaveProperty('googleRefreshToken');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(cookieHeader[0]).toContain('HttpOnly');
    expect(cookieHeader[0]).toContain('SameSite=Strict');
    expect(cookieHeader[0]).toContain('Path=/api/v1/auth');

    accessToken = response.body.data.accessToken;
    initialRefreshCookie = firstCookie(response);
  });

  it('protects profile and only updates allowlisted camelCase fields', async () => {
    const unauthorized = await request(app).get('/api/v1/me');
    const profile = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    const rejected = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'changed@example.test', status: false });
    const updated = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ada Actualizada', phone: '1111111111' });

    expect(unauthorized.status).toBe(401);
    expect(profile.status).toBe(200);
    expect(rejected.status).toBe(400);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      name: 'Ada Actualizada',
      phone: '1111111111',
      email,
    });
  });

  it('rotates refresh tokens and revokes the family when an old token is replayed', async () => {
    const rotated = await agent.post('/api/v1/auth/refresh').send({});
    rotatedRefreshCookie = firstCookie(rotated);
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', initialRefreshCookie)
      .send({});
    const familyRevoked = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedRefreshCookie)
      .send({});

    expect(rotated.status).toBe(200);
    expect(rotatedRefreshCookie).not.toBe(initialRefreshCookie);
    expect(replay.status).toBe(401);
    expect(replay.body.errors[0].code).toBe('INVALID_SESSION');
    expect(familyRevoked.status).toBe(401);
    expect(await AuthSession.count({ where: { user_id: userId, revoked_at: null } })).toBe(
      0
    );
  });

  it('uses a generic recovery response and records only real accounts', async () => {
    const before = emails.passwordReset.length;
    const missing = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: `missing-${randomUUID()}@example.test` });
    const existing = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email });

    expect(missing.status).toBe(202);
    expect(existing.status).toBe(202);
    expect(missing.body.message).toBe(existing.body.message);
    expect(emails.passwordReset).toHaveLength(before + 1);
  });

  it('resets the password once and invalidates prior access and refresh tokens', async () => {
    const freshAgent = request.agent(app);
    const signedIn = await freshAgent.post('/api/v1/auth/login').send({
      email,
      password: initialPassword,
    });
    const oldAccessToken = signedIn.body.data.accessToken;
    const resetToken = emails.passwordReset.at(-1)?.token as string;

    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: resetToken, password: nextPassword });
    const replay = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: resetToken, password: nextPassword });
    const oldAccess = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${oldAccessToken}`);
    const oldRefresh = await freshAgent.post('/api/v1/auth/refresh').send({});
    const oldPassword = await request(app).post('/api/v1/auth/login').send({
      email,
      password: initialPassword,
    });
    const newPassword = await request(app).post('/api/v1/auth/login').send({
      email,
      password: nextPassword,
    });

    expect(reset.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(oldAccess.status).toBe(401);
    expect(oldRefresh.status).toBe(401);
    expect(oldPassword.status).toBe(401);
    expect(newPassword.status).toBe(200);
    expect((await User.findByPk(userId))?.auth_version).toBe(1);
  });

  it('logs out idempotently and clears the refresh cookie', async () => {
    const logoutAgent = request.agent(app);
    await logoutAgent.post('/api/v1/auth/login').send({
      email,
      password: nextPassword,
    });
    const first = await logoutAgent.post('/api/v1/auth/logout').send({});
    const second = await logoutAgent.post('/api/v1/auth/logout').send({});

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers['set-cookie'][0]).toContain(
      'odontofy_refresh_v1=; Path=/api/v1/auth; Expires='
    );
  });
});

import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import db from '../../src/db/connection';
import Patient from '../../src/models/patient.model';
import User from '../../src/models/user.model';
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens';

const originalEnvironment = { ...process.env };
const silentLogger = pino({ level: 'silent' });
const runId = randomUUID();

let app: ReturnType<typeof createApp>;
let ownerA: User;
let ownerB: User;
let tokenA: string;
let tokenB: string;
let patientAId: number;
let patientBId: number;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Patients Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `patients-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  });

beforeAll(async () => {
  process.env.JWT_SECRET = 'patients-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-patients-test';
  process.env.JWT_AUDIENCE = 'odontofy-patients-client';
  process.env.JWT_ACCESS_TTL_SECONDS = '600';

  await db.authenticate();
  ownerA = await createOwner('a');
  ownerB = await createOwner('b');

  const tokens = new JwtAccessTokenService();
  tokenA = tokens.issue(ownerA.id, ownerA.auth_version);
  tokenB = tokens.issue(ownerB.id, ownerB.auth_version);
  app = createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
  });
});

afterAll(async () => {
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

describe('patients v1 ownership lifecycle', () => {
  it('requires v1 authentication and bounds list resources', async () => {
    const unauthenticated = await request(app).get('/api/v1/patients');
    const oversized = await request(app)
      .get('/api/v1/patients?pageSize=101')
      .set(bearer(tokenA));

    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.errors[0].code).toBe('UNAUTHENTICATED');
    expect(oversized.status).toBe(400);
    expect(oversized.body.errors[0].code).toBe('VALIDATION_ERROR');
  });

  it('rejects mass assignment and creates safe owner-scoped DTOs', async () => {
    const rejected = await request(app)
      .post('/api/v1/patients')
      .set(bearer(tokenA))
      .send({
        name: 'Ada',
        lastName: 'Lovelace',
        userId: ownerB.id,
        currentBalance: '9000.00',
      });
    const createdA = await request(app)
      .post('/api/v1/patients')
      .set(bearer(tokenA))
      .send({
        name: 'Ada',
        middleName: '',
        lastName: 'Lovelace',
        dateOfBirth: '1990-12-10',
        email: ' ADA.PATIENT@EXAMPLE.TEST ',
        phone: '+52 555 010 1000',
      });
    const createdB = await request(app)
      .post('/api/v1/patients')
      .set(bearer(tokenB))
      .send({ name: 'Grace', lastName: 'Hopper' });

    expect(rejected.status).toBe(400);
    expect(createdA.status).toBe(201);
    expect(createdA.headers['cache-control']).toBe('no-store');
    expect(createdA.body.data).toMatchObject({
      name: 'Ada',
      middleName: null,
      dateOfBirth: '1990-12-10',
      email: 'ada.patient@example.test',
      active: true,
      currentBalance: '0.00',
    });
    expect(createdA.body.data).not.toHaveProperty('userId');
    expect(createdA.body.data).not.toHaveProperty('user_id');

    patientAId = createdA.body.data.id;
    patientBId = createdB.body.data.id;
    expect((await Patient.findByPk(patientAId))?.user_id).toBe(ownerA.id);
  });

  it('lists only owned patients with stable pagination and search', async () => {
    await request(app)
      .post('/api/v1/patients')
      .set(bearer(tokenA))
      .send({ name: 'Katherine', lastName: 'Johnson' });

    const firstPage = await request(app)
      .get('/api/v1/patients?page=1&pageSize=1')
      .set(bearer(tokenA));
    const search = await request(app)
      .get('/api/v1/patients?search=Lovelace')
      .set(bearer(tokenA));
    const literalWildcard = await request(app)
      .get('/api/v1/patients?search=%25')
      .set(bearer(tokenA));

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].id).toBe(patientAId);
    expect(search.body.data[0]).not.toHaveProperty('familyMedicalHistory');
    expect(search.body.data[0]).not.toHaveProperty('personalMedicalHistory');
    expect(literalWildcard.body.data).toHaveLength(0);
    expect(search.body.data.some((patient: { id: number }) => patient.id === patientBId)).toBe(
      false
    );
  });

  it('returns the same not-found response for foreign and missing IDs', async () => {
    const foreign = await request(app)
      .get(`/api/v1/patients/${patientBId}`)
      .set(bearer(tokenA));
    const missing = await request(app)
      .get('/api/v1/patients/4294967295')
      .set(bearer(tokenA));

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body.message).toBe(missing.body.message);
    expect(foreign.body.errors[0].code).toBe('PATIENT_NOT_FOUND');
    expect(missing.body.errors[0].code).toBe('PATIENT_NOT_FOUND');
  });

  it('updates only allowlisted fields on an owned patient', async () => {
    const unknownField = await request(app)
      .patch(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA))
      .send({ debt: 500 });
    const foreign = await request(app)
      .patch(`/api/v1/patients/${patientBId}`)
      .set(bearer(tokenA))
      .send({ name: 'Changed' });
    const updated = await request(app)
      .patch(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA))
      .send({ occupation: 'Mathematician', phone: '' });

    expect(unknownField.status).toBe(400);
    expect(foreign.status).toBe(404);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: patientAId,
      occupation: 'Mathematician',
      phone: null,
      currentBalance: '0.00',
    });
    expect((await Patient.findByPk(patientBId))?.name).toBe('Grace');
  });

  it('archives idempotently, filters inactive records, and restores explicitly', async () => {
    const foreign = await request(app)
      .delete(`/api/v1/patients/${patientBId}`)
      .set(bearer(tokenA));
    const archived = await request(app)
      .delete(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA));
    const replay = await request(app)
      .delete(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA));
    const activeList = await request(app)
      .get('/api/v1/patients?status=active')
      .set(bearer(tokenA));
    const inactiveList = await request(app)
      .get('/api/v1/patients?status=inactive')
      .set(bearer(tokenA));
    const restored = await request(app)
      .patch(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA))
      .send({ active: true });

    expect(foreign.status).toBe(404);
    expect(archived.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(activeList.body.data.map((patient: { id: number }) => patient.id)).not.toContain(
      patientAId
    );
    expect(inactiveList.body.data.map((patient: { id: number }) => patient.id)).toContain(
      patientAId
    );
    expect(restored.body.data).toMatchObject({ id: patientAId, active: true });
    expect((await Patient.findByPk(patientBId))?.status).toBe(true);
  });
});

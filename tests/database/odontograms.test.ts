import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import db from '../../src/db/connection';
import Odontogram from '../../src/models/odontogram.model';
import Patient from '../../src/models/patient.model';
import User from '../../src/models/user.model';
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens';

const originalEnvironment = { ...process.env };
const silentLogger = pino({ level: 'silent' });
const runId = randomUUID();

let app: ReturnType<typeof createApp>;
let ownerA: User;
let ownerB: User;
let patientA: Patient;
let patientB: Patient;
let tokenA: string;
let tokenB: string;
let adultId: number;
let pediatricId: number;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Odontograms Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `odontograms-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  });

const createPatient = (userId: number, suffix: string) =>
  Patient.create({
    user_id: userId,
    name: `Patient ${suffix}`,
    middle_name: null,
    last_name: 'Odontograms Test',
    gender: null,
    date_of_birth: null,
    phone: null,
    marital_status: null,
    occupation: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relationship: null,
    reason_for_consultation: null,
    rfc: null,
    family_medical_history: null,
    personal_medical_history: null,
    email: null,
    status: true,
    debt: 0,
  });

beforeAll(async () => {
  process.env.JWT_SECRET = 'odontograms-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-odontograms-test';
  process.env.JWT_AUDIENCE = 'odontofy-odontograms-client';
  process.env.JWT_ACCESS_TTL_SECONDS = '600';

  await db.authenticate();
  ownerA = await createOwner('a');
  ownerB = await createOwner('b');
  patientA = await createPatient(ownerA.id, 'A');
  patientB = await createPatient(ownerB.id, 'B');

  const tokens = new JwtAccessTokenService();
  tokenA = tokens.issue(ownerA.id, ownerA.auth_version);
  tokenB = tokens.issue(ownerB.id, ownerB.auth_version);
  app = createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
  });
});

afterAll(async () => {
  if (ownerA) await Odontogram.destroy({ where: { user_id: ownerA.id } });
  if (ownerB) await Odontogram.destroy({ where: { user_id: ownerB.id } });
  if (patientA) await patientA.destroy();
  if (patientB) await patientB.destroy();
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

describe('odontograms v1 ownership and lifecycle', () => {
  it('creates multiple adult and pediatric charts for one patient', async () => {
    const adult = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: 'ADULT',
        title: 'Inicial adulto',
        findings: [
          {
            toothCode: '16',
            condition: 'CARIES',
            surface: 'OCCLUSAL_INCISAL',
          },
        ],
      });
    const pediatric = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: 'PEDIATRIC',
        title: 'Control infantil',
        findings: [{ toothCode: '55', condition: 'NOT_ERUPTED' }],
      });

    expect(adult.status).toBe(201);
    expect(adult.headers['cache-control']).toBe('no-store');
    expect(adult.body.data.findings[0]).toMatchObject({
      toothCode: '16',
      condition: 'CARIES',
    });
    expect(pediatric.status).toBe(201);
    adultId = adult.body.data.id;
    pediatricId = pediatric.body.data.id;

    const list = await request(app)
      .get(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.pagination.total).toBe(2);
  });

  it('hides foreign patients and odontograms with the same 404 boundary', async () => {
    const foreignPatient = await request(app)
      .get(`/api/v1/patients/${patientB.id}/odontograms`)
      .set(bearer(tokenA));
    const foreignChart = await request(app)
      .get(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenB));

    expect(foreignPatient.status).toBe(404);
    expect(foreignPatient.body.errors[0].code).toBe('PATIENT_NOT_FOUND');
    expect(foreignChart.status).toBe(404);
    expect(foreignChart.body.errors[0].code).toBe('ODONTOGRAM_NOT_FOUND');
  });

  it('validates dentition and archives without affecting other records', async () => {
    const invalid = await request(app)
      .patch(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA))
      .send({ findings: [{ toothCode: '55', condition: 'CARIES' }] });
    const archived = await request(app)
      .delete(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA));
    const replay = await request(app)
      .delete(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA));
    const active = await request(app)
      .get(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA));
    const restored = await request(app)
      .post(`/api/v1/odontograms/${adultId}/restore`)
      .set(bearer(tokenA));

    expect(invalid.status).toBe(400);
    expect(invalid.body.errors[0].code).toBe('INVALID_TOOTH_CODE');
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toBeTypeOf('string');
    expect(replay.status).toBe(200);
    expect(active.body.data.map((chart: { id: number }) => chart.id)).toEqual([
      pediatricId,
    ]);
    expect(restored.status).toBe(200);
    expect(restored.body.data.archivedAt).toBeNull();
  });
});

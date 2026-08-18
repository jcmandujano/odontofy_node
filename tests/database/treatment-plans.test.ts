import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import db from '../../src/db/connection';
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model';
import User from '../../src/models/user.model';
import UserConcept from '../../src/models/user_concept.model';
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
let planAId: number;
let planBId: number;
let itemAId: number;
let secondItemAId: number;
let itemBId: number;
let conceptA: UserConcept;
let conceptB: UserConcept;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Treatment Plans Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `treatment-plans-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  });

const createPatient = async (token: string, name: string) => {
  const response = await request(app)
    .post('/api/v1/patients')
    .set(bearer(token))
    .send({ name, lastName: 'Treatment Test' });
  expect(response.status).toBe(201);
  return response.body.data.id as number;
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'treatment-plan-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-treatment-plan-test';
  process.env.JWT_AUDIENCE = 'odontofy-treatment-plan-client';
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
  patientAId = await createPatient(tokenA, 'Ada');
  patientBId = await createPatient(tokenB, 'Grace');
  conceptA = await UserConcept.create({
    user_id: ownerA.id,
    concept_id: null,
    description: 'Concept A',
    unit_price: 100,
    is_custom: true,
  });
  conceptB = await UserConcept.create({
    user_id: ownerB.id,
    concept_id: null,
    description: 'Concept B',
    unit_price: 100,
    is_custom: true,
  });
});

afterAll(async () => {
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

describe('treatment plans v1 transactional ownership', () => {
  it('requires authentication, bounds lists, and rejects mass assignment', async () => {
    const unauthenticated = await request(app).get(
      `/api/v1/patients/${patientAId}/treatment-plans`
    );
    const oversized = await request(app)
      .get(`/api/v1/patients/${patientAId}/treatment-plans?pageSize=101`)
      .set(bearer(tokenA));
    const rejected = await request(app)
      .post(`/api/v1/patients/${patientAId}/treatment-plans`)
      .set(bearer(tokenA))
      .send({ title: 'Injected', userId: ownerB.id, total: '900.00' });

    expect(unauthenticated.status).toBe(401);
    expect(oversized.status).toBe(400);
    expect(rejected.status).toBe(400);
  });

  it('creates owner-scoped plans and rejects foreign patients', async () => {
    const foreign = await request(app)
      .post(`/api/v1/patients/${patientBId}/treatment-plans`)
      .set(bearer(tokenA))
      .send({ title: 'Foreign plan' });
    const createdA = await request(app)
      .post(`/api/v1/patients/${patientAId}/treatment-plans`)
      .set(bearer(tokenA))
      .send({ title: 'Plan A', description: '', discount: '0.00' });
    const createdB = await request(app)
      .post(`/api/v1/patients/${patientBId}/treatment-plans`)
      .set(bearer(tokenB))
      .send({ title: 'Plan B' });

    expect(foreign.status).toBe(404);
    expect(createdA.status).toBe(201);
    expect(createdA.headers['cache-control']).toBe('no-store');
    expect(createdA.body.data).toMatchObject({
      patientId: patientAId,
      status: 'DRAFT',
      subtotal: '0.00',
      discount: '0.00',
      total: '0.00',
      items: [],
    });
    expect(createdA.body.data).not.toHaveProperty('userId');
    expect(createdA.body.data).not.toHaveProperty('user_id');
    planAId = createdA.body.data.id;
    planBId = createdB.body.data.id;
  });

  it('separates bounded summaries from owned details', async () => {
    const list = await request(app)
      .get(`/api/v1/patients/${patientAId}/treatment-plans?pageSize=1`)
      .set(bearer(tokenA));
    const foreign = await request(app)
      .get(`/api/v1/treatment-plans/${planBId}`)
      .set(bearer(tokenA));
    const missing = await request(app)
      .get('/api/v1/treatment-plans/4294967295')
      .set(bearer(tokenA));

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty('items');
    expect(list.body.data[0]).not.toHaveProperty('diagnosis');
    expect(list.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body.message).toBe(missing.body.message);
    expect(foreign.body.errors[0].code).toBe('TREATMENT_PLAN_NOT_FOUND');
  });

  it('creates exact item amounts and validates concept ownership', async () => {
    const foreignConcept = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: conceptB.id,
        name: 'Foreign concept',
        quantity: '1.00',
        unitPrice: '10.00',
      });
    const missingConcept = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: 4_294_967_295,
        name: 'Missing concept',
        quantity: '1.00',
        unitPrice: '10.00',
      });
    const created = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: conceptA.id,
        name: 'Exact item',
        quantity: '3.33',
        unitPrice: '19.99',
      });
    const second = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({
        name: 'Second item',
        quantity: '1.00',
        unitPrice: '33.43',
        sortOrder: 2,
      });

    expect(foreignConcept.status).toBe(404);
    expect(missingConcept.status).toBe(404);
    expect(foreignConcept.body.message).toBe(missingConcept.body.message);
    expect(created.status).toBe(201);
    expect(created.body.data.item).toMatchObject({
      quantity: '3.33',
      unitPrice: '19.99',
      subtotal: '66.57',
    });
    expect(second.body.data.treatmentPlan).toMatchObject({
      subtotal: '100.00',
      total: '100.00',
    });
    itemAId = created.body.data.item.id;
    secondItemAId = second.body.data.item.id;

    const createdB = await request(app)
      .post(`/api/v1/treatment-plans/${planBId}/items`)
      .set(bearer(tokenB))
      .send({ name: 'Owner B item', unitPrice: '20.00' });
    itemBId = createdB.body.data.item.id;
  });

  it('rolls back item cancellation when the discount would become invalid', async () => {
    const discounted = await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA))
      .send({ discount: '70.00' });
    const rejected = await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}/items/${secondItemAId}`)
      .set(bearer(tokenA));
    const persistedItem = await TreatmentPlanItem.findByPk(secondItemAId);
    const detail = await request(app)
      .get(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA));

    expect(discounted.status).toBe(200);
    expect(rejected.status).toBe(409);
    expect(rejected.body.errors[0].code).toBe(
      'TREATMENT_PLAN_DISCOUNT_EXCEEDS_SUBTOTAL'
    );
    expect(persistedItem?.status).toBe('PENDING');
    expect(detail.body.data).toMatchObject({
      subtotal: '100.00',
      discount: '70.00',
      total: '30.00',
    });
  });

  it('enforces nonnegative plan totals at the database boundary', async () => {
    await expect(
      db.query(
        `UPDATE treatment_plans
         SET discount_amount = subtotal_amount + 0.01,
             total_amount = -0.01
         WHERE id = :planId`,
        { replacements: { planId: planAId } }
      )
    ).rejects.toThrow();
  });

  it('conceals foreign items and cancels owned items idempotently', async () => {
    const foreign = await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}/items/${itemBId}/status`)
      .set(bearer(tokenA))
      .send({ status: 'COMPLETED' });
    const missing = await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}/items/4294967295/status`)
      .set(bearer(tokenA))
      .send({ status: 'COMPLETED' });
    await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA))
      .send({ discount: '10.00' });
    const cancelled = await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}/items/${secondItemAId}`)
      .set(bearer(tokenA));
    const replay = await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}/items/${secondItemAId}`)
      .set(bearer(tokenA));

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body.message).toBe(missing.body.message);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.item.status).toBe('CANCELLED');
    expect(cancelled.body.data.treatmentPlan).toMatchObject({
      subtotal: '66.57',
      discount: '10.00',
      total: '56.57',
    });
    expect(replay.status).toBe(200);
    expect(replay.body.data.treatmentPlan.total).toBe('56.57');
  });

  it('keeps completion timestamps coherent and cancels plans idempotently', async () => {
    const completed = await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}/items/${itemAId}/status`)
      .set(bearer(tokenA))
      .send({ status: 'COMPLETED' });
    const reopened = await request(app)
      .patch(`/api/v1/treatment-plans/${planAId}/items/${itemAId}/status`)
      .set(bearer(tokenA))
      .send({ status: 'IN_PROGRESS' });
    const cancelled = await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA));
    const replay = await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA));
    const blocked = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({ name: 'Blocked item', unitPrice: '1.00' });

    expect(completed.body.data.item.completedAt).toBeTypeOf('string');
    expect(reopened.body.data.item.completedAt).toBeNull();
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(replay.body.data.rejectedAt).toBe(cancelled.body.data.rejectedAt);
    expect(blocked.status).toBe(409);
    expect(blocked.body.errors[0].code).toBe('TREATMENT_PLAN_NOT_EDITABLE');
  });
});

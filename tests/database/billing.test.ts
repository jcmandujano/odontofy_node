import { randomUUID } from 'node:crypto'

import { Op } from 'sequelize'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app'
import db from '../../src/db/connection'
import Patient from '../../src/models/patient.model'
import PaymentRevision from '../../src/models/payment-revision.model'
import PaymentUser from '../../src/models/payment-user.model'
import Payment from '../../src/models/payment.model'
import UserConcept from '../../src/models/user_concept.model'
import User from '../../src/models/user.model'
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens'

const originalEnvironment = { ...process.env }
const silentLogger = pino({ level: 'silent' })
const runId = randomUUID()
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

let app: ReturnType<typeof createApp>
let ownerA: User
let ownerB: User
let tokenA: string
let tokenB: string
let patientAId: number
let patientBId: number
let conceptAId: number
let conceptBId: number
let firstRecordId: number
let backdatedRecordId: number

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Billing Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `billing-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  })

const createPatient = async (token: string, name: string) => {
  const response = await request(app)
    .post('/api/v1/patients')
    .set(bearer(token))
    .send({ name, lastName: 'Billing Test' })
  expect(response.status).toBe(201)
  return response.body.data.id as number
}

const createConcept = async (
  token: string,
  description: string,
  unitPrice: string
) => {
  const response = await request(app)
    .post('/api/v1/billing-concepts')
    .set(bearer(token))
    .send({ description, unitPrice })
  expect(response.status).toBe(201)
  return response.body.data.id as number
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'billing-test-secret-with-at-least-32-bytes'
  process.env.JWT_ISSUER = 'odontofy-billing-test'
  process.env.JWT_AUDIENCE = 'odontofy-billing-client'
  process.env.JWT_ACCESS_TTL_SECONDS = '600'
  await db.authenticate()
  ownerA = await createOwner('a')
  ownerB = await createOwner('b')
  const tokens = new JwtAccessTokenService()
  tokenA = tokens.issue(ownerA.id, ownerA.auth_version)
  tokenB = tokens.issue(ownerB.id, ownerB.auth_version)
  app = createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
  })
  patientAId = await createPatient(tokenA, 'Ada')
  patientBId = await createPatient(tokenB, 'Grace')
  conceptAId = await createConcept(tokenA, 'Profilaxis', '10.10')
  conceptBId = await createConcept(tokenA, 'Radiografia', '5.00')
})

afterAll(async () => {
  const ownerIds = [ownerA?.id, ownerB?.id].filter(Boolean) as number[]
  const payments = await Payment.findAll({
    where: { user_id: { [Op.in]: ownerIds } },
    attributes: ['id'],
  })
  const paymentIds = payments.map((payment) => payment.id)
  if (paymentIds.length > 0) {
    await PaymentRevision.destroy({
      where: { payment_id: { [Op.in]: paymentIds } },
    })
    await PaymentUser.destroy({ where: { paymentId: { [Op.in]: paymentIds } } })
    await Payment.destroy({ where: { id: { [Op.in]: paymentIds } } })
  }
  await UserConcept.destroy({ where: { user_id: { [Op.in]: ownerIds } } })
  await Patient.destroy({ where: { user_id: { [Op.in]: ownerIds } } })
  if (ownerA) await ownerA.destroy()
  if (ownerB) await ownerB.destroy()
  process.env = { ...originalEnvironment }
})

describe('billing v1 ownership, history, and balances', () => {
  it('creates an exact record once and preserves catalog snapshots', async () => {
    const key = randomUUID()
    const payload = {
      occurredOn: '2026-08-10',
      discount: '0.20',
      amountReceived: '10.00',
      paymentMethod: 'CASH',
      items: [{ conceptId: conceptAId, quantity: 2 }],
    }
    const created = await request(app)
      .post(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', key)
      .send(payload)
    const replay = await request(app)
      .post(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', key)
      .send(payload)
    const conflict = await request(app)
      .post(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', key)
      .send({ ...payload, amountReceived: '11.00' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      subtotal: '20.20',
      discount: '0.20',
      total: '20.00',
      amountReceived: '10.00',
      balanceAfter: '10.00',
      version: 1,
    })
    expect(replay.body.data.id).toBe(created.body.data.id)
    expect(conflict.status).toBe(409)
    expect(conflict.body.errors[0].code).toBe('IDEMPOTENCY_KEY_REUSED')
    firstRecordId = created.body.data.id

    await request(app)
      .patch(`/api/v1/billing-concepts/${conceptAId}`)
      .set(bearer(tokenA))
      .send({ description: 'Profilaxis actualizada', unitPrice: '20.00' })
    const detail = await request(app)
      .get(`/api/v1/patients/${patientAId}/billing-records/${firstRecordId}`)
      .set(bearer(tokenA))
    expect(detail.body.data.items[0]).toMatchObject({
      description: 'Profilaxis',
      unitPrice: '10.10',
      subtotal: '20.20',
    })
  })

  it('recalculates chronological balances after a backdated record and correction', async () => {
    const backdated = await request(app)
      .post(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: '2026-08-05',
        items: [{ conceptId: conceptBId, quantity: 1 }],
      })
    expect(backdated.status).toBe(201)
    expect(backdated.body.data.balanceAfter).toBe('5.00')
    backdatedRecordId = backdated.body.data.id

    const corrected = await request(app)
      .put(
        `/api/v1/patients/${patientAId}/billing-records/${firstRecordId}/correction`
      )
      .set(bearer(tokenA))
      .send({
        occurredOn: '2026-08-10',
        amountReceived: '5.00',
        paymentMethod: 'CASH',
        items: [{ conceptId: conceptAId, quantity: 1 }],
        changeReason: 'Precio vigente confirmado por el consultorio',
      })
    const patient = await request(app)
      .get(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA))
    expect(corrected.body.data).toMatchObject({
      total: '20.00',
      balanceChange: '15.00',
      balanceAfter: '20.00',
      version: 2,
    })
    expect(patient.body.data.currentBalance).toBe('20.00')
  })

  it('cancels logically, keeps revisions, and excludes the record by default', async () => {
    const cancelled = await request(app)
      .post(
        `/api/v1/patients/${patientAId}/billing-records/${backdatedRecordId}/cancellation`
      )
      .set(bearer(tokenA))
      .send({ changeReason: 'Registro duplicado durante captura' })
    const replay = await request(app)
      .post(
        `/api/v1/patients/${patientAId}/billing-records/${backdatedRecordId}/cancellation`
      )
      .set(bearer(tokenA))
      .send({ changeReason: 'Solicitud repetida' })
    const list = await request(app)
      .get(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
    const revisions = await request(app)
      .get(
        `/api/v1/patients/${patientAId}/billing-records/${backdatedRecordId}/revisions`
      )
      .set(bearer(tokenA))

    expect(cancelled.body.data).toMatchObject({
      status: 'CANCELLED',
      version: 2,
    })
    expect(replay.body.data.version).toBe(2)
    expect(list.body.data.map((record: { id: number }) => record.id)).toEqual([
      firstRecordId,
    ])
    expect(
      revisions.body.data.map((revision: { action: string }) => revision.action)
    ).toEqual(['CANCELLED', 'CREATED'])
  })

  it('enforces ownership and reports a consistent exact summary', async () => {
    const foreignRecord = await request(app)
      .get(`/api/v1/patients/${patientAId}/billing-records/${firstRecordId}`)
      .set(bearer(tokenB))
    const foreignConcept = await request(app)
      .post(`/api/v1/patients/${patientBId}/billing-records`)
      .set(bearer(tokenB))
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: '2026-08-10',
        items: [{ conceptId: conceptAId, quantity: 1 }],
      })
    const summary = await request(app)
      .get('/api/v1/billing/summary')
      .set(bearer(tokenA))

    expect(foreignRecord.status).toBe(404)
    expect(foreignConcept.status).toBe(404)
    expect(summary.body.data).toEqual({
      totalBilled: '20.00',
      totalReceived: '5.00',
      totalDiscount: '0.00',
      netChange: '15.00',
      currentBalance: '15.00',
    })
  })

  it('archives catalogs without deleting history or allowing new use', async () => {
    const archived = await request(app)
      .delete(`/api/v1/billing-concepts/${conceptBId}`)
      .set(bearer(tokenA))
    const rejected = await request(app)
      .post(`/api/v1/patients/${patientAId}/billing-records`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: '2026-08-11',
        items: [{ conceptId: conceptBId, quantity: 1 }],
      })
    expect(archived.body.data.active).toBe(false)
    expect(rejected.status).toBe(409)
    expect(rejected.body.errors[0].code).toBe('BILLING_CONCEPT_ARCHIVED')
  })
})

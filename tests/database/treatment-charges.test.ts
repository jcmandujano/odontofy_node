import { randomUUID } from 'node:crypto'
import { Op } from 'sequelize'
import pino from 'pino'
import request from 'supertest'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createApp } from '../../src/app'
import db from '../../src/db/connection'
import User from '../../src/models/user.model'
import Patient from '../../src/models/patient.model'
import Payment from '../../src/models/payment.model'
import PaymentRevision from '../../src/models/payment-revision.model'
import TreatmentCharge from '../../src/models/treatment-charge.model'
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model'
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens'
import { createCatalogEntry } from './catalog-helper'
import { cents } from '../../src/platform/finance-money'

const originalEnvironment = { ...process.env }
let app: ReturnType<typeof createApp>
let owner: User
let other: User
let token: string
let otherToken: string
const today = new Date().toISOString().slice(0, 10)
const auth = () => ({ Authorization: `Bearer ${token}` })
beforeAll(async () => {
  process.env.JWT_SECRET = 'charge-tests-secret-with-at-least-32-bytes'
  process.env.JWT_ISSUER = 'charge-tests'
  process.env.JWT_AUDIENCE = 'charge-client'
  await db.authenticate()
  const createOwner = (suffix: string) =>
    User.create({
      name: 'Synthetic',
      middle_name: '',
      last_name: 'Charges',
      date_of_birth: null,
      phone: '',
      avatar: '',
      email: `charges-${suffix}-${randomUUID()}@example.test`,
      password: 'unused',
      status: true,
      auth_version: 0,
      show_finance_stats: false,
    })
  owner = await createOwner('a')
  other = await createOwner('b')
  const tokens = new JwtAccessTokenService()
  token = tokens.issue(owner.id, 0)
  otherToken = tokens.issue(other.id, 0)
  app = createApp({
    logger: pino({ level: 'silent' }),
    readinessCheck: async () => undefined,
  })
})
afterAll(async () => {
  if (owner) {
    const payments = await Payment.findAll({
      where: { user_id: owner.id },
      attributes: ['id'],
    })
    if (payments.length)
      await PaymentRevision.destroy({
        where: {
          payment_id: { [Op.in]: payments.map((payment) => payment.id) },
        },
      })
    await owner.destroy()
  }
  if (other) await other.destroy()
  process.env = { ...originalEnvironment }
})
const patient = async () => {
  const response = await request(app)
    .post('/api/v1/patients')
    .set(auth())
    .send({ name: 'Synthetic', lastName: 'Charge patient' })
  expect(response.status).toBe(201)
  return response.body.data.id as number
}
const treatment = async (
  patientId: number,
  price = '1000.00',
  planId?: number
) => {
  const conceptId = await createCatalogEntry(
    app,
    token,
    'Synthetic restoration',
    price
  )
  const response = await request(app)
    .post(
      planId
        ? `/api/v1/treatment-plans/${planId}/items`
        : `/api/v1/patients/${patientId}/treatments`
    )
    .set(auth())
    .send({ userConceptId: conceptId })
  expect(response.status).toBe(201)
  return planId ? response.body.data.item : response.body.data
}
const confirm = (
  patientId: number,
  treatmentId: number,
  expectedTotal = '1000.00'
) =>
  request(app)
    .post(
      `/api/v1/patients/${patientId}/treatment-charges/${treatmentId}/confirmation`
    )
    .set(auth())
    .send({ occurredOn: today, expectedTotal })
const pay = (
  patientId: number,
  allocations: Array<{ chargeId: number; amount: string }>,
  key = randomUUID()
) =>
  request(app)
    .post(`/api/v1/patients/${patientId}/treatment-payments`)
    .set(auth())
    .set('Idempotency-Key', key)
    .send({ occurredOn: today, paymentMethod: 'CASH', allocations })
const list = (patientId: number) =>
  request(app)
    .get(`/api/v1/patients/${patientId}/treatment-charges`)
    .set(auth())

describe('confirmed treatment charges and receipts', () => {
  it('does not charge proposals; confirms once with ownership and stale-quote protection', async () => {
    const id = await patient()
    const item = await treatment(id)
    expect((await list(id)).body.meta.summary.balance).toBe('0.00')
    expect(Number((await Patient.findByPk(id))!.debt)).toBe(0)
    expect(
      (await request(app).get(`/api/v1/patients/${id}/treatment-charges`))
        .status
    ).toBe(401)
    expect(
      (
        await request(app)
          .post(
            `/api/v1/patients/${id}/treatment-charges/${item.id}/confirmation`
          )
          .set('Authorization', `Bearer ${otherToken}`)
          .send({ occurredOn: today, expectedTotal: '1000.00' })
      ).status
    ).toBe(404)
    expect((await confirm(id, item.id, '900.00')).status).toBe(409)
    const responses = await Promise.all([
      confirm(id, item.id),
      confirm(id, item.id),
    ])
    expect(responses.map((row) => row.status)).toEqual([200, 200])
    expect(responses[0].body.data.chargeId).toBe(
      responses[1].body.data.chargeId
    )
    expect(await TreatmentCharge.count({ where: { patient_id: id } })).toBe(1)
    expect(Number((await Patient.findByPk(id))!.debt)).toBe(1000)
  })

  it('allocates multiple partial receipts without billing the same service again', async () => {
    const id = await patient()
    const a = await treatment(id)
    const b = await treatment(id, '500.00')
    const ca = (await confirm(id, a.id)).body.data.chargeId
    const cb = (await confirm(id, b.id, '500.00')).body.data.chargeId
    const key = randomUUID()
    const input = [
      { chargeId: ca, amount: '400.00' },
      { chargeId: cb, amount: '100.00' },
    ]
    const first = await pay(id, input, key)
    expect(first.status).toBe(201)
    expect((await pay(id, input, key)).body.data.billingRecordId).toBe(
      first.body.data.billingRecordId
    )
    expect(
      (await pay(id, [{ chargeId: ca, amount: '1.00' }], key)).status
    ).toBe(409)
    expect((await pay(id, [{ chargeId: ca, amount: '600.00' }])).status).toBe(
      201
    )
    const result = await list(id)
    expect(result.body.meta.summary).toEqual({
      charged: '1500.00',
      paid: '1100.00',
      balance: '400.00',
    })
    expect(
      result.body.data.find(
        (row: { treatmentId: number }) => row.treatmentId === a.id
      ).financialStatus
    ).toBe('PAID')
    expect(Number((await Patient.findByPk(id))!.debt)).toBe(400)
    expect((await pay(id, [{ chargeId: cb, amount: '400.01' }])).status).toBe(
      409
    )
    const receipt = await request(app)
      .get(
        `/api/v1/patients/${id}/billing-records/${first.body.data.billingRecordId}`
      )
      .set(auth())
    expect(receipt.body.data).toMatchObject({
      total: '0.00',
      amountReceived: '500.00',
      recordKind: 'TREATMENT_PAYMENT',
    })
    expect(receipt.body.data.allocations).toHaveLength(2)
  })

  it('serializes competing payments and reverses cancellations without deleting audit history', async () => {
    const id = await patient()
    const item = await treatment(id)
    const chargeId = (await confirm(id, item.id)).body.data.chargeId
    const results = await Promise.all([
      pay(id, [{ chargeId, amount: '800.00' }]),
      pay(id, [{ chargeId, amount: '800.00' }]),
    ])
    expect(results.map((row) => row.status).sort()).toEqual([201, 409])
    const paymentId = results.find((row) => row.status === 201)!.body.data
      .billingRecordId
    expect(
      (
        await request(app)
          .put(`/api/v1/patients/${id}/billing-records/${paymentId}/correction`)
          .set(auth())
          .send({
            occurredOn: today,
            items: [{ conceptId: item.userConceptId, quantity: 1 }],
            changeReason: 'Attempt to overwrite',
          })
      ).status
    ).toBe(409)
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(app)
            .post(
              `/api/v1/patients/${id}/billing-records/${paymentId}/cancellation`
            )
            .set(auth())
            .send({ changeReason: 'Synthetic correction' })
        ).status
      ).toBe(200)
    expect((await list(id)).body.meta.summary.balance).toBe('1000.00')
    const revisions = await request(app)
      .get(`/api/v1/patients/${id}/billing-records/${paymentId}/revisions`)
      .set(auth())
    expect(revisions.body.data).toHaveLength(2)
    expect(revisions.body.data[0].allocations[0]).toMatchObject({
      chargeId,
      treatmentId: item.id,
    })
  })

  it('freezes plan discount distribution without coupling clinical and financial states', async () => {
    const id = await patient()
    const plan = await request(app)
      .post(`/api/v1/patients/${id}/treatment-plans`)
      .set(auth())
      .send({ title: 'Synthetic plan' })
    const planId = plan.body.data.id
    const a = await treatment(id, '1000.00', planId)
    const b = await treatment(id, '500.00', planId)
    await request(app)
      .patch(`/api/v1/treatment-plans/${planId}`)
      .set(auth())
      .send({ discount: '100.00' })
    expect(
      (await list(id)).body.data.map((row: { total: string }) => row.total)
    ).toEqual(['933.34', '466.66'])
    expect((await confirm(id, a.id, '900.00')).status).toBe(409)
    expect(await TreatmentPlanItem.count({ where: { treatment_plan_id: planId, charge_discount_amount: { [Op.ne]: null } } })).toBe(0)
    expect((await confirm(id, a.id, '933.34')).status).toBe(200)
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-plans/${planId}`)
          .set(auth())
          .send({ discount: '90.00' })
      ).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-plans/${planId}/items/${b.id}`)
          .set(auth())
          .send({ quantity: '2' })
      ).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .post(`/api/v1/treatment-plans/${planId}/items`)
          .set(auth())
          .send({ userConceptId: a.userConceptId })
      ).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-plans/${planId}/items/${a.id}/status`)
          .set(auth())
          .send({ status: 'COMPLETED' })
      ).status
    ).toBe(200)
    expect((await confirm(id, b.id, '466.66')).status).toBe(200)
    expect((await list(id)).body.meta.summary.charged).toBe('1400.00')
    expect(
      (
        await request(app)
          .patch(`/api/v1/treatment-plans/${planId}/items/${a.id}`)
          .set(auth())
          .send({ notes: 'Clinical note' })
      ).status
    ).toBe(200)
    for (const itemId of [a.id, b.id]) {
      expect((await request(app).patch(`/api/v1/treatment-plans/${planId}/items/${itemId}/status`).set(auth()).send({ status: 'CANCELLED' })).status).toBe(200)
    }
    const cancelledClinical = await list(id)
    expect(cancelledClinical.status).toBe(200)
    expect(cancelledClinical.body.meta.summary.charged).toBe('1400.00')
  })

  it('preserves legacy financial totals and prevents a legacy receipt from rebilling a pending charge', async () => {
    const before = (
      await request(app).get('/api/v1/billing/summary').set(auth())
    ).body.data
    const id = await patient()
    const legacyConcept = await createCatalogEntry(
      app,
      token,
      'Historical service',
      '50.00'
    )
    const legacy = await request(app)
      .post(`/api/v1/patients/${id}/billing-records`)
      .set(auth())
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: today,
        items: [{ conceptId: legacyConcept, quantity: 1 }],
        amountReceived: '20.00',
        paymentMethod: 'CASH',
      })
    expect(legacy.status).toBe(201)
    const item = await treatment(id)
    await confirm(id, item.id)
    const rebill = await request(app)
      .post(`/api/v1/patients/${id}/billing-records`)
      .set(auth())
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: today,
        items: [{ conceptId: item.userConceptId, quantity: 1 }],
        amountReceived: '100.00',
        paymentMethod: 'CASH',
      })
    expect(rebill.status).toBe(409)
    expect(Number((await Patient.findByPk(id))!.debt)).toBe(1030)
    const original = await request(app)
      .get(`/api/v1/patients/${id}/billing-records/${legacy.body.data.id}`)
      .set(auth())
    expect(original.body.data).toMatchObject({
      total: '50.00',
      amountReceived: '20.00',
      recordKind: 'LEGACY',
    })
    const after = (
      await request(app).get('/api/v1/billing/summary').set(auth())
    ).body.data
    expect(cents(after.totalBilled) - cents(before.totalBilled)).toBe(105000n)
    expect(cents(after.totalReceived) - cents(before.totalReceived)).toBe(2000n)
    expect(cents(after.netChange) - cents(before.netChange)).toBe(103000n)
  })

  it('rejects charges on manual historical or cancelled treatments and freezes independent quantities', async () => {
    const id = await patient()
    const item = await treatment(id)
    await confirm(id, item.id)
    expect(
      (
        await request(app)
          .patch(`/api/v1/patients/${id}/treatments/${item.id}`)
          .set(auth())
          .send({ quantity: '2.00' })
      ).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .patch(`/api/v1/patients/${id}/treatments/${item.id}/status`)
          .set(auth())
          .send({ status: 'CANCELLED' })
      ).status
    ).toBe(200)
    expect(Number((await Patient.findByPk(id))!.debt)).toBe(1000)
    const historical = await treatment(id)
    await TreatmentPlanItem.update(
      { user_concept_id: null },
      { where: { id: historical.id } }
    )
    expect((await confirm(id, historical.id)).status).toBe(409)
    const cancelled = await treatment(id)
    await request(app)
      .patch(`/api/v1/patients/${id}/treatments/${cancelled.id}/status`)
      .set(auth())
      .send({ status: 'CANCELLED' })
    expect((await confirm(id, cancelled.id)).status).toBe(409)
  })
})

import { randomUUID } from 'node:crypto'
import { Op } from 'sequelize'
import pino from 'pino'
import request from 'supertest'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createApp } from '../../src/app'
import db from '../../src/db/connection'
import User from '../../src/models/user.model'
import Odontogram from '../../src/models/odontogram.model'
import TreatmentPlan from '../../src/models/treatment-plan.model'
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model'
import Payment from '../../src/models/payment.model'
import PaymentRevision from '../../src/models/payment-revision.model'
import Patient from '../../src/models/patient.model'
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens'
import { createCatalogEntry } from './catalog-helper'

const originalEnvironment = { ...process.env }
let app: ReturnType<typeof createApp>,
  owner: User,
  foreign: User,
  token: string,
  foreignToken: string
const auth = () => ({ Authorization: `Bearer ${token}` })
const today = new Date().toISOString().slice(0, 10)
beforeAll(async () => {
  process.env.JWT_SECRET = 'odontogram-plan-test-secret-at-least-32-bytes'
  process.env.JWT_ISSUER = 'odontogram-plan-test'
  process.env.JWT_AUDIENCE = 'odontogram-plan-client'
  await db.authenticate()
  const make = () =>
    User.create({
      name: 'Synthetic',
      middle_name: '',
      last_name: 'Plan test',
      date_of_birth: null,
      phone: '',
      avatar: '',
      email: `odontogram-plan-${randomUUID()}@example.test`,
      password: 'unused',
      status: true,
      auth_version: 0,
      show_finance_stats: false,
    })
  owner = await make()
  foreign = await make()
  const tokens = new JwtAccessTokenService()
  token = tokens.issue(owner.id, 0)
  foreignToken = tokens.issue(foreign.id, 0)
  app = createApp({
    logger: pino({ level: 'silent' }),
    readinessCheck: async () => undefined,
  })
})
afterAll(async () => {
  if (owner) {
    await Odontogram.destroy({ where: { user_id: owner.id } })
    const payments = await Payment.findAll({ where: { user_id: owner.id } })
    if (payments.length)
      await PaymentRevision.destroy({
        where: { payment_id: { [Op.in]: payments.map((row) => row.id) } },
      })
    await Payment.destroy({ where: { user_id: owner.id } })
    await owner.destroy()
  }
  if (foreign) await foreign.destroy()
  process.env = { ...originalEnvironment }
})
const fixture = async () => {
  const p = await request(app)
    .post('/api/v1/patients')
    .set(auth())
    .send({ name: 'Synthetic', lastName: 'Draft plan' })
  const patientId = p.body.data.id as number
  const c = await request(app)
    .post(`/api/v1/patients/${patientId}/odontograms`)
    .set(auth())
    .send({
      dentition: 'ADULT',
      findings: [
        { toothCode: '16', condition: 'CARIES', surface: 'MESIAL' },
        { toothCode: '15', condition: 'FRACTURE' },
      ],
    })
  expect(c.status).toBe(201)
  return { patientId, chart: c.body.data }
}
const treatment = async (patientId: number, price = '250.00') => {
  const catalog = await createCatalogEntry(
    app,
    token,
    'Synthetic catalog treatment',
    price
  )
  const created = await request(app)
    .post(`/api/v1/patients/${patientId}/treatments`)
    .set(auth())
    .send({
      userConceptId: catalog,
      tooth: '16',
      notes: 'Conservar nota clínica',
    })
  expect(created.status).toBe(201)
  return created.body.data
}
const link = (
  chart: { id: number; findings: Array<{ id: number }> },
  treatmentId: number,
  index = 0
) =>
  request(app)
    .put(
      `/api/v1/odontograms/${chart.id}/findings/${chart.findings[index].id}/treatment-items/${treatmentId}`
    )
    .set(auth())
const preview = (chartId: number) =>
  request(app)
    .get(`/api/v1/odontograms/${chartId}/treatment-plan-preview`)
    .set(auth())
const create = (
  chartId: number,
  treatments: Array<{ treatmentId: number; revision: string }>,
  subtotal = '250.00',
  key = randomUUID(),
  title = 'Plan revisado'
) =>
  request(app)
    .post(`/api/v1/odontograms/${chartId}/treatment-plans`)
    .set(auth())
    .set('Idempotency-Key', key)
    .send({
      title,
      treatments: treatments.map((row) => ({
        treatmentId: row.treatmentId,
        revision: row.revision,
      })),
      expectedSubtotal: subtotal,
    })

describe('draft treatment plans from odontograms', () => {
  it('deduplicates shared treatments in review and reuses their IDs without financial side effects', async () => {
    const { patientId, chart } = await fixture()
    const item = await treatment(patientId)
    await link(chart, item.id)
    await link(chart, item.id, 1)
    const before = await preview(chart.id)
    expect(before.body.data.treatments).toHaveLength(1)
    expect(before.body.data.treatments[0].findings).toHaveLength(2)
    expect(
      await TreatmentPlan.count({ where: { patient_id: patientId } })
    ).toBe(0)
    const created = await create(chart.id, before.body.data.treatments)
    expect(created.status).toBe(201)
    const detail = await request(app)
      .get(`/api/v1/treatment-plans/${created.body.data.treatmentPlanId}`)
      .set(auth())
    expect(detail.body.data).toMatchObject({
      status: 'DRAFT',
      sourceOdontogramId: chart.id,
      subtotal: '250.00',
      discount: '0.00',
      total: '250.00',
      acceptedAt: null,
    })
    expect(detail.body.data.items).toHaveLength(1)
    expect(detail.body.data.items[0]).toMatchObject({
      id: item.id,
      notes: 'Conservar nota clínica',
      status: 'PENDING',
    })
    expect(detail.body.data.items[0].odontogramReferences).toHaveLength(2)
    expect(
      await TreatmentPlanItem.count({ where: { patient_id: patientId } })
    ).toBe(1)
    expect(String((await Patient.findByPk(patientId))!.debt)).toBe('0.00')
    expect(await Payment.count({ where: { patientId } })).toBe(0)
    expect((await preview(chart.id)).body.data.treatments[0].reason).toBe(
      'ALREADY_IN_PLAN'
    )
  })
  it('preserves advance receipts and clinical status when grouping and allows later charge confirmation', async () => {
    const { patientId, chart } = await fixture()
    const item = await treatment(patientId)
    await link(chart, item.id)
    await request(app)
      .patch(`/api/v1/patients/${patientId}/treatments/${item.id}/status`)
      .set(auth())
      .send({ status: 'IN_PROGRESS' })
    const payment = await request(app)
      .post(`/api/v1/patients/${patientId}/treatment-payments`)
      .set(auth())
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: today,
        paymentMethod: 'CASH',
        sourceTreatmentId: item.id,
        amountReceived: '100.00',
        allocations: [],
      })
    expect(payment.status).toBe(201)
    const review = (await preview(chart.id)).body.data.treatments
    const created = await create(chart.id, review)
    expect(created.status).toBe(201)
    expect((await TreatmentPlanItem.findByPk(item.id))!.status).toBe(
      'IN_PROGRESS'
    )
    expect(
      (await Payment.findByPk(payment.body.data.billingRecordId))!
        .advance_treatment_id
    ).toBe(item.id)
    expect(String((await Patient.findByPk(patientId))!.debt)).toBe('-100.00')
    const charge = await request(app)
      .post(
        `/api/v1/patients/${patientId}/treatment-charges/${item.id}/confirmation`
      )
      .set(auth())
      .send({ occurredOn: today, expectedTotal: '250.00' })
    expect(charge.status).toBe(200)
    const credits = await request(app)
      .get(`/api/v1/patients/${patientId}/treatment-credits`)
      .set(auth())
    expect(credits.body.meta.availableCredit).toBe('100.00')
  })
  it('rejects stale or incorrect review atomically without an empty plan or partially moved treatments', async () => {
    const { patientId, chart } = await fixture()
    const a = await treatment(patientId),
      b = await treatment(patientId)
    await link(chart, a.id)
    await link(chart, b.id)
    const review = (await preview(chart.id)).body.data.treatments
    expect((await create(chart.id, review, '499.99')).status).toBe(409)
    await request(app)
      .patch(`/api/v1/patients/${patientId}/treatments/${b.id}`)
      .set(auth())
      .send({ notes: 'Nota modificada después de revisar' })
    expect((await create(chart.id, review, '500.00')).status).toBe(409)
    expect(
      await TreatmentPlan.count({ where: { patient_id: patientId } })
    ).toBe(0)
    expect(
      (await TreatmentPlanItem.findByPk(a.id))!.treatment_plan_id
    ).toBeNull()
    expect(
      (await TreatmentPlanItem.findByPk(b.id))!.treatment_plan_id
    ).toBeNull()
  })
  it('serializes idempotent retries and competing groupings into one plan', async () => {
    const { patientId, chart } = await fixture()
    const item = await treatment(patientId)
    await link(chart, item.id)
    const review = (await preview(chart.id)).body.data.treatments
    const key = randomUUID()
    const [a, b] = await Promise.all([
      create(chart.id, review, '250.00', key),
      create(chart.id, review, '250.00', key),
    ])
    expect([a.status, b.status]).toEqual([201, 201])
    expect(a.body.data).toEqual(b.body.data)
    expect(
      (await create(chart.id, review, '250.00', key, 'Otro título')).status
    ).toBe(409)
    expect((await create(chart.id, review)).status).toBe(409)
    expect(
      await TreatmentPlan.count({ where: { patient_id: patientId } })
    ).toBe(1)
    const second = await fixture(),
      next = await treatment(second.patientId)
    await link(second.chart, next.id)
    const selections = (await preview(second.chart.id)).body.data.treatments
    const attempts = await Promise.all([
      create(second.chart.id, selections),
      create(second.chart.id, selections),
    ])
    expect(attempts.map((result) => result.status).sort()).toEqual([201, 409])
    expect(
      await TreatmentPlan.count({ where: { patient_id: second.patientId } })
    ).toBe(1)
  })
  it('protects ownership, archived charts, missing links and confirmed charges', async () => {
    const { patientId, chart } = await fixture()
    const item = await treatment(patientId)
    await link(chart, item.id)
    const review = (await preview(chart.id)).body.data.treatments
    expect(
      (
        await request(app).get(
          `/api/v1/odontograms/${chart.id}/treatment-plan-preview`
        )
      ).status
    ).toBe(401)
    expect(
      (
        await request(app)
          .get(`/api/v1/odontograms/${chart.id}/treatment-plan-preview`)
          .set('Authorization', `Bearer ${foreignToken}`)
      ).status
    ).toBe(404)
    expect(
      (
        await request(app)
          .post(`/api/v1/odontograms/${chart.id}/treatment-plans`)
          .set('Authorization', `Bearer ${foreignToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            title: 'Foreign',
            expectedSubtotal: '250.00',
            treatments: review.map(
              (row: { treatmentId: number; revision: string }) => ({
                treatmentId: row.treatmentId,
                revision: row.revision,
              })
            ),
          })
      ).status
    ).toBe(404)
    await request(app).delete(`/api/v1/odontograms/${chart.id}`).set(auth())
    expect((await create(chart.id, review)).status).toBe(409)
    await request(app)
      .post(`/api/v1/odontograms/${chart.id}/restore`)
      .set(auth())
    await request(app)
      .delete(
        `/api/v1/odontograms/${chart.id}/findings/${chart.findings[0].id}/treatment-items/${item.id}`
      )
      .set(auth())
    expect((await create(chart.id, review)).status).toBe(404)
    await link(chart, item.id)
    await request(app)
      .post(
        `/api/v1/patients/${patientId}/treatment-charges/${item.id}/confirmation`
      )
      .set(auth())
      .send({ occurredOn: today, expectedTotal: '250.00' })
    expect((await preview(chart.id)).body.data.treatments[0].reason).toBe(
      'CHARGE_CONFIRMED'
    )
    expect((await create(chart.id, review)).status).toBe(409)
    expect(
      await TreatmentPlan.count({ where: { patient_id: patientId } })
    ).toBe(0)
  })
})

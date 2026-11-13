import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { Op } from 'sequelize'
import pino from 'pino'
import request from 'supertest'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createApp } from '../../src/app'
import db from '../../src/db/connection'
import User from '../../src/models/user.model'
import Patient from '../../src/models/patient.model'
import Payment from '../../src/models/payment.model'
import PaymentUser from '../../src/models/payment-user.model'
import PaymentRevision from '../../src/models/payment-revision.model'
import UserConcept from '../../src/models/user_concept.model'
import TreatmentCharge from '../../src/models/treatment-charge.model'
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model'
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens'

const originalEnvironment = { ...process.env }
const app = createApp({ logger: pino({ level: 'silent' }), readinessCheck: async () => undefined })
let owner: User
let other: User
let token: string
let otherToken: string
let patientId: number
let otherPatientId: number
let conceptId: number
const auth = () => ({ Authorization: `Bearer ${token}` })
const pathFor = (id: number) => `/api/v1/patients/${patientId}/billing-records/${id}`
const abono = (id: number, amountReceived = '600.00', key = randomUUID(), occurredOn = '2026-08-11') => request(app).post(`${pathFor(id)}/installments`).set(auth()).set('Idempotency-Key', key).send({ occurredOn, amountReceived, paymentMethod: 'CASH' })
const source = async () => {
  const res = await request(app).post(`/api/v1/patients/${patientId}/billing-records`).set(auth()).set('Idempotency-Key', randomUUID()).send({ occurredOn: '2026-08-10', amountReceived: '400.00', paymentMethod: 'CASH', items: [{ conceptId, quantity: 1 }] })
  expect(res.status, JSON.stringify(res.body)).toBe(201)
  return res.body.data.id as number
}
beforeAll(async () => {
  process.env.JWT_SECRET = 'billing-installments-test-secret-at-least-32-bytes'
  process.env.JWT_ISSUER = 'installments-test'
  process.env.JWT_AUDIENCE = 'installments-client'
  await db.authenticate()
  const makeOwner = (name: string) => User.create({ name, middle_name: '', last_name: 'Test', email: `${name}-${randomUUID()}@example.test`, password: 'unused-test-password', date_of_birth: null, phone: '', avatar: '', status: true, auth_version: 0, show_finance_stats: false })
  owner = await makeOwner('Installments'); other = await makeOwner('OtherInstallments')
  const tokens = new JwtAccessTokenService()
  token = tokens.issue(owner.id, 0); otherToken = tokens.issue(other.id, 0)
  patientId = (await request(app).post('/api/v1/patients').set(auth()).send({ name: 'Synthetic', lastName: 'Installments' })).body.data.id
  otherPatientId = (await request(app).post('/api/v1/patients').set(auth()).send({ name: 'Other', lastName: 'Patient' })).body.data.id
  conceptId = (await request(app).post('/api/v1/billing-concepts').set(auth()).send({ description: 'Resina', unitPrice: '1000.00' })).body.data.id
})
afterAll(async () => {
  const ids = [owner?.id, other?.id].filter(Boolean)
  const payments = await Payment.findAll({ where: { user_id: { [Op.in]: ids } } })
  const paymentIds = payments.map(row => row.id)
  await PaymentRevision.destroy({ where: { payment_id: { [Op.in]: paymentIds } } })
  await PaymentUser.destroy({ where: { paymentId: { [Op.in]: paymentIds } } })
  await Payment.destroy({ where: { user_id: { [Op.in]: ids }, source_billing_record_id: { [Op.ne]: null } } })
  await Payment.destroy({ where: { user_id: { [Op.in]: ids } } })
  await TreatmentCharge.destroy({ where: { patient_id: { [Op.in]: [patientId, otherPatientId].filter(Boolean) } } })
  await TreatmentPlanItem.destroy({ where: { patient_id: { [Op.in]: [patientId, otherPatientId].filter(Boolean) } } })
  await UserConcept.destroy({ where: { user_id: { [Op.in]: ids } } })
  await Patient.destroy({ where: { user_id: { [Op.in]: ids } } })
  await User.destroy({ where: { id: { [Op.in]: ids } } })
  process.env = { ...originalEnvironment }
})

describe('catalog payment installments', () => {
  it('records 400 + 600 once, preserves snapshots and replays after catalog archival', async () => {
    const id = await source()
    const patientBefore = await Patient.findByPk(patientId)
    const balanceBefore = Number(patientBefore!.debt)
    await request(app).patch(`/api/v1/billing-concepts/${conceptId}`).set(auth()).send({ description: 'Resina nueva', unitPrice: '2000.00' })
    await request(app).delete(`/api/v1/billing-concepts/${conceptId}`).set(auth())
    const key = randomUUID()
    const [first, retry] = await Promise.all([abono(id, '600.00', key), abono(id, '600.00', key)])
    expect(first.status, JSON.stringify(first.body)).toBe(201)
    expect(retry.body.data.id).toBe(first.body.data.id)
    expect(first.body.data).toMatchObject({ total: '0.00', amountReceived: '600.00', sourceBillingRecordId: id, sourceDescription: 'Resina', items: [] })
    const migration = createRequire(import.meta.url)('../../database/migrations/202611120001-billing-installments.js') as { down: (queryInterface: ReturnType<typeof db.getQueryInterface>) => Promise<void> }
    await expect(migration.down(db.getQueryInterface())).rejects.toThrow('Cannot rollback while billing installments exist')
    const detail = await request(app).get(pathFor(id)).set(auth())
    expect(detail.body.data).toMatchObject({ total: '1000.00', amountPaid: '1000.00', outstandingAmount: '0.00', hasInstallments: true })
    expect(detail.body.data.items[0]).toMatchObject({ description: 'Resina', unitPrice: '1000.00' })
    expect(Number((await Patient.findByPk(patientId))!.debt)).toBe(balanceBefore - 600)
    const summary = await request(app).get('/api/v1/billing/summary').set(auth())
    expect(summary.body.data).toMatchObject({ totalBilled: '1000.00', totalReceived: '1000.00', currentBalance: '0.00' })
    expect((await abono(id, '1.00')).status).toBe(409)
    expect((await abono(id, '1.00', key)).status).toBe(409)
    const listed = await request(app).get(`/api/v1/patients/${patientId}/billing-records?pageSize=1`).set(auth())
    expect(listed.body.meta.hasTreatmentFinance).toBe(false)
    expect(listed.body.data[0].sourceBillingRecordId).toBe(id)
    await request(app).post(`/api/v1/billing-concepts/${conceptId}/reactivate`).set(auth())
    await request(app).patch(`/api/v1/billing-concepts/${conceptId}`).set(auth()).send({ description: 'Resina', unitPrice: '1000.00' })
  })

  it('serializes concurrent payments so the pending balance cannot be exceeded', async () => {
    const id = await source()
    const results = await Promise.all([abono(id, '400.00'), abono(id, '400.00')])
    expect(results.map(res => res.status).sort()).toEqual([201, 409])
    expect((await request(app).get(pathFor(id)).set(auth())).body.data.outstandingAmount).toBe('200.00')
  })

  it('protects ownership, source identity, dates, and strict monetary input', async () => {
    const id = await source()
    expect((await request(app).post(`${pathFor(id)}/installments`).set({ Authorization: `Bearer ${otherToken}` }).set('Idempotency-Key', randomUUID()).send({ occurredOn: '2026-08-11', amountReceived: '1.00', paymentMethod: 'CASH' })).status).toBe(404)
    expect((await request(app).post(`/api/v1/patients/${otherPatientId}/billing-records/${id}/installments`).set(auth()).set('Idempotency-Key', randomUUID()).send({ occurredOn: '2026-08-11', amountReceived: '1.00', paymentMethod: 'CASH' })).status).toBe(404)
    expect((await abono(id, '1.00', randomUUID(), '2026-08-09')).status).toBe(422)
    expect((await abono(id, '0.00')).status).toBe(400)
    expect((await abono(id, '0.001')).status).toBe(400)
    const receipt = await abono(id, '100.00')
    expect((await abono(receipt.body.data.id, '1.00')).status).toBe(409)
  })

  it('cancels receipts with audit, restores the pending amount and guards parent changes', async () => {
    const id = await source()
    const key = randomUUID()
    const receipt = await abono(id, '600.00', key)
    const cancel = (recordId: number) => request(app).post(`${pathFor(recordId)}/cancellation`).set(auth()).send({ changeReason: 'Corrección de prueba' })
    expect((await cancel(id)).status).toBe(409)
    expect((await request(app).put(`${pathFor(id)}/correction`).set(auth()).send({ occurredOn: '2026-08-10', amountReceived: '400.00', paymentMethod: 'CASH', changeReason: 'Cambio de prueba', items: [{ conceptId, quantity: 2 }] })).status).toBe(409)
    expect((await cancel(receipt.body.data.id)).status).toBe(200)
    expect((await abono(id, '600.00', key)).body.data.status).toBe('CANCELLED')
    expect((await request(app).get(pathFor(id)).set(auth())).body.data.outstandingAmount).toBe('600.00')
    const history = await request(app).get(`${pathFor(receipt.body.data.id)}/revisions`).set(auth())
    expect(history.body.data.map((row: { action: string }) => row.action)).toEqual(['CANCELLED', 'CREATED'])
    expect((await cancel(id)).status).toBe(200)
    expect((await abono(id)).status).toBe(409)
  })

  it('exposes historical finance independently of the payment page and paginates only confirmed charges', async () => {
    const endpoint = `/api/v1/patients/${patientId}`
    const first = await request(app).post(`${endpoint}/treatments`).set(auth()).send({ userConceptId: conceptId, quantity: '1.00' })
    const second = await request(app).post(`${endpoint}/treatments`).set(auth()).send({ userConceptId: conceptId, quantity: '1.00' })
    expect(first.status).toBe(201); expect(second.status).toBe(201)
    const confirmation = await request(app).post(`${endpoint}/treatment-charges/${first.body.data.id}/confirmation`).set(auth()).send({ occurredOn: '2026-08-11', expectedTotal: '1000.00' })
    expect(confirmation.status, JSON.stringify(confirmation.body)).toBe(200)
    const list = await request(app).get(`${endpoint}/billing-records?dateFrom=2026-11-12&pageSize=1`).set(auth())
    expect(list.body.data).toEqual([])
    expect(list.body.meta.hasTreatmentFinance).toBe(true)
    const charges = await request(app).get(`${endpoint}/treatment-charges?confirmedOnly=true&pageSize=1`).set(auth())
    expect(charges.status).toBe(200)
    expect(charges.body.meta.pagination.total).toBe(1)
    expect(charges.body.data.map((row: { treatmentId: number }) => row.treatmentId)).toEqual([first.body.data.id])
    const blocked = await request(app).post(`${endpoint}/billing-records`).set(auth()).set('Idempotency-Key', randomUUID()).send({ occurredOn: '2026-08-12', items: [{ conceptId, quantity: 1 }] })
    expect(blocked.status).toBe(409)
    expect(blocked.body.errors[0].code).toBe('CHARGE_PAYMENT_REQUIRED')
  })
})

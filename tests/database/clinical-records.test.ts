import { randomUUID } from 'node:crypto'
import { Op } from 'sequelize'
import pino from 'pino'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app'
import db from '../../src/db/connection'
import EvolutionNoteRevision from '../../src/models/evolution-note-revision.model'
import EvolutionNote from '../../src/models/evolution-note.model'
import MedicalHistoryRevision from '../../src/models/medical-history-revision.model'
import User from '../../src/models/user.model'
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens'

const originalEnvironment = { ...process.env }
const silentLogger = pino({ level: 'silent' })
const runId = randomUUID()

let app: ReturnType<typeof createApp>
let ownerA: User
let ownerB: User
let tokenA: string
let tokenB: string
let patientAId: number
let patientBId: number
let planAId: number
let planBId: number
let itemAId: number
let itemBId: number
let noteAId: number

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Clinical Records Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `clinical-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  })

const createPatient = async (token: string, name: string) => {
  const response = await request(app)
    .post('/api/v1/patients')
    .set(bearer(token))
    .send({ name, lastName: 'Clinical Test' })
  expect(response.status).toBe(201)
  return response.body.data.id as number
}

const createPlanAndItem = async (
  token: string,
  patientId: number,
  suffix: string
) => {
  const plan = await request(app)
    .post(`/api/v1/patients/${patientId}/treatment-plans`)
    .set(bearer(token))
    .send({ title: `Clinical plan ${suffix}` })
  expect(plan.status).toBe(201)
  const item = await request(app)
    .post(`/api/v1/treatment-plans/${plan.body.data.id}/items`)
    .set(bearer(token))
    .send({ name: `Clinical item ${suffix}`, unitPrice: '100.00' })
  expect(item.status).toBe(201)
  return {
    planId: plan.body.data.id as number,
    itemId: item.body.data.item.id as number,
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'clinical-records-test-secret-with-at-least-32-bytes'
  process.env.JWT_ISSUER = 'odontofy-clinical-records-test'
  process.env.JWT_AUDIENCE = 'odontofy-clinical-records-client'
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
  ;({ planId: planAId, itemId: itemAId } = await createPlanAndItem(
    tokenA,
    patientAId,
    'A'
  ))
  ;({ planId: planBId, itemId: itemBId } = await createPlanAndItem(
    tokenB,
    patientBId,
    'B'
  ))
})

afterAll(async () => {
  const ownerIds = [ownerA?.id, ownerB?.id].filter(Boolean) as number[]
  if (ownerIds.length > 0) {
    await EvolutionNoteRevision.destroy({
      where: { author_user_id: { [Op.in]: ownerIds } },
    })
    await EvolutionNote.destroy({
      where: { author_user_id: { [Op.in]: ownerIds } },
    })
    await MedicalHistoryRevision.destroy({
      where: { author_user_id: { [Op.in]: ownerIds } },
    })
  }
  if (ownerA) await ownerA.destroy()
  if (ownerB) await ownerB.destroy()
  process.env = { ...originalEnvironment }
})

describe('clinical records v1 ownership and provenance', () => {
  it('versions structured medical history and blocks generic or foreign writes', async () => {
    const initial = await request(app)
      .get(`/api/v1/patients/${patientAId}/medical-history`)
      .set(bearer(tokenA))
    const genericWrite = await request(app)
      .patch(`/api/v1/patients/${patientAId}`)
      .set(bearer(tokenA))
      .send({ familyMedicalHistory: { diabetes: true } })
    const foreign = await request(app)
      .get(`/api/v1/patients/${patientBId}/medical-history`)
      .set(bearer(tokenA))
    const updated = await request(app)
      .put(`/api/v1/patients/${patientAId}/medical-history`)
      .set(bearer(tokenA))
      .send({
        questionnaireVersion: '1.0',
        familyHistory: 'Madre con diabetes',
        answers: [
          { questionId: 'DIABETES', answer: 'NO', notes: null },
          { questionId: 'ALLERGIES', answer: 'YES', notes: 'Penicilina' },
        ],
        otherNotes: null,
        changeReason: 'Registro inicial del interrogatorio',
      })
    const revised = await request(app)
      .put(`/api/v1/patients/${patientAId}/medical-history`)
      .set(bearer(tokenA))
      .send({
        questionnaireVersion: '1.0',
        familyHistory: 'Madre con diabetes',
        answers: [
          { questionId: 'ALLERGIES', answer: 'YES', notes: 'Penicilina' },
        ],
        otherNotes: 'Se retiro una respuesta no confirmada',
        changeReason: 'Correccion solicitada por el paciente',
      })
    const revisions = await request(app)
      .get(`/api/v1/patients/${patientAId}/medical-history/revisions`)
      .set(bearer(tokenA))

    expect(initial.status).toBe(200)
    expect(initial.body.data.version).toBe(0)
    expect(genericWrite.status).toBe(400)
    expect(foreign.status).toBe(404)
    expect(updated.body.data).toMatchObject({
      version: 1,
      questionnaireVersion: '1.0',
    })
    expect(updated.body.data.author).toMatchObject({ userId: ownerA.id })
    expect(revised.body.data.version).toBe(2)
    expect(
      revisions.body.data.map((entry: { version: number }) => entry.version)
    ).toEqual([2, 1])
  })

  it('creates a note and completes its treatment item atomically', async () => {
    const created = await request(app)
      .post(`/api/v1/patients/${patientAId}/evolution-notes`)
      .set(bearer(tokenA))
      .send({
        note: 'Se concluye el procedimiento sin complicaciones.',
        treatmentPlanId: planAId,
        treatmentPlanItemId: itemAId,
        completeTreatmentItem: true,
      })
    const plan = await request(app)
      .get(`/api/v1/treatment-plans/${planAId}`)
      .set(bearer(tokenA))

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      patientId: patientAId,
      treatmentPlanId: planAId,
      treatmentPlanItemId: itemAId,
      version: 1,
      archivedAt: null,
    })
    expect(created.body.data.author).toMatchObject({ userId: ownerA.id })
    expect(
      plan.body.data.items.find((item: { id: number }) => item.id === itemAId)
    ).toMatchObject({ status: 'COMPLETED' })
    noteAId = created.body.data.id
  })

  it('hides foreign plans, items, and notes behind not-found responses', async () => {
    const foreignPlan = await request(app)
      .post(`/api/v1/patients/${patientAId}/evolution-notes`)
      .set(bearer(tokenA))
      .send({ note: 'Foreign', treatmentPlanId: planBId })
    const mismatchedItem = await request(app)
      .post(`/api/v1/patients/${patientAId}/evolution-notes`)
      .set(bearer(tokenA))
      .send({
        note: 'Foreign item',
        treatmentPlanId: planAId,
        treatmentPlanItemId: itemBId,
      })
    const foreignNote = await request(app)
      .get(`/api/v1/patients/${patientAId}/evolution-notes/${noteAId}`)
      .set(bearer(tokenB))

    expect(foreignPlan.status).toBe(404)
    expect(mismatchedItem.status).toBe(404)
    expect(foreignNote.status).toBe(404)
  })

  it('rolls back note creation when a cancelled item cannot be completed', async () => {
    const item = await request(app)
      .post(`/api/v1/treatment-plans/${planAId}/items`)
      .set(bearer(tokenA))
      .send({ name: 'Cancelled item', unitPrice: '20.00' })
    const cancelledItemId = item.body.data.item.id as number
    await request(app)
      .delete(`/api/v1/treatment-plans/${planAId}/items/${cancelledItemId}`)
      .set(bearer(tokenA))
    const before = await EvolutionNote.count({
      where: { patient_id: patientAId },
    })
    const rejected = await request(app)
      .post(`/api/v1/patients/${patientAId}/evolution-notes`)
      .set(bearer(tokenA))
      .send({
        note: 'No debe persistir',
        treatmentPlanId: planAId,
        treatmentPlanItemId: cancelledItemId,
        completeTreatmentItem: true,
      })

    expect(rejected.status).toBe(409)
    expect(rejected.body.errors[0].code).toBe('TREATMENT_NOT_COMPLETABLE')
    expect(
      await EvolutionNote.count({ where: { patient_id: patientAId } })
    ).toBe(before)
  })

  it('amends, archives, restores, and preserves an append-only revision trail', async () => {
    const amended = await request(app)
      .patch(`/api/v1/patients/${patientAId}/evolution-notes/${noteAId}`)
      .set(bearer(tokenA))
      .send({
        note: 'Se concluye el procedimiento sin complicaciones ni dolor.',
        changeReason: 'Aclarar estado posterior al procedimiento',
      })
    const archived = await request(app)
      .delete(`/api/v1/patients/${patientAId}/evolution-notes/${noteAId}`)
      .set(bearer(tokenA))
      .send({ changeReason: 'Archivado de prueba' })
    const archivedAgain = await request(app)
      .delete(`/api/v1/patients/${patientAId}/evolution-notes/${noteAId}`)
      .set(bearer(tokenA))
      .send({ changeReason: 'Solicitud repetida' })
    const activeList = await request(app)
      .get(`/api/v1/patients/${patientAId}/evolution-notes`)
      .set(bearer(tokenA))
    const archivedList = await request(app)
      .get(`/api/v1/patients/${patientAId}/evolution-notes?status=archived`)
      .set(bearer(tokenA))
    const restored = await request(app)
      .post(`/api/v1/patients/${patientAId}/evolution-notes/${noteAId}/restore`)
      .set(bearer(tokenA))
      .send({ changeReason: 'Nota vigente nuevamente' })
    const revisions = await request(app)
      .get(
        `/api/v1/patients/${patientAId}/evolution-notes/${noteAId}/revisions`
      )
      .set(bearer(tokenA))

    expect(amended.body.data.version).toBe(2)
    expect(archived.body.data.version).toBe(3)
    expect(archivedAgain.body.data.version).toBe(3)
    expect(
      activeList.body.data.some((note: { id: number }) => note.id === noteAId)
    ).toBe(false)
    expect(
      archivedList.body.data.some((note: { id: number }) => note.id === noteAId)
    ).toBe(true)
    expect(restored.body.data).toMatchObject({ version: 4, archivedAt: null })
    expect(
      revisions.body.data.map((entry: { action: string }) => entry.action)
    ).toEqual(['RESTORED', 'ARCHIVED', 'AMENDED', 'CREATED'])
  })
})

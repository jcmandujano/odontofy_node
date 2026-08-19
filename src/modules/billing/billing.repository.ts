import { Op, Transaction, UniqueConstraintError, WhereOptions } from 'sequelize'

import db from '../../db/connection'
import Patient from '../../models/patient.model'
import PaymentRevision from '../../models/payment-revision.model'
import Payment from '../../models/payment.model'
import PaymentUser from '../../models/payment-user.model'
import User from '../../models/user.model'
import UserConcept from '../../models/user_concept.model'
import type { BillingPaymentMethod } from '../../types/billing.enums'
import type { PaymentMethod } from '../../types/payment.enums'
import {
  BillingSummaryQuery,
  CancelBillingRecordInput,
  CorrectBillingRecordInput,
  CreateBillingConceptInput,
  CreateBillingRecordInput,
  ListBillingConceptsQuery,
  ListBillingRecordsQuery,
  ListBillingRevisionsQuery,
  UpdateBillingConceptInput,
} from './billing.schemas'
import {
  addBillingMoney,
  multiplyBillingMoney,
  normalizeBillingDecimal,
  subtractBillingMoney,
  sumBillingMoney,
} from './billing.money'
import {
  BillingConceptData,
  BillingError,
  BillingItemData,
  BillingPage,
  BillingRecordData,
  BillingRecordRevisionData,
} from './billing.types'

const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`)

const conceptNotFound = () =>
  new BillingError(
    'BILLING_CONCEPT_NOT_FOUND',
    'Concepto de cobro no encontrado'
  )
const recordNotFound = () =>
  new BillingError(
    'BILLING_RECORD_NOT_FOUND',
    'Registro financiero no encontrado'
  )

const mapConcept = (concept: UserConcept): BillingConceptData => ({
  id: concept.id,
  description: concept.description,
  unitPrice: normalizeBillingDecimal(concept.unit_price),
  active: concept.active,
  createdAt: concept.createdAt,
  updatedAt: concept.updatedAt,
})

const mapItem = (item: PaymentUser): BillingItemData => ({
  id: item.id,
  billingRecordId: item.paymentId,
  conceptId: item.conceptId,
  description: item.description_snapshot,
  unitPrice: normalizeBillingDecimal(item.unit_price_snapshot),
  quantity: item.quantity,
  subtotal: normalizeBillingDecimal(item.subtotal),
})

const mapRecord = (
  payment: Payment,
  items: PaymentUser[]
): BillingRecordData => ({
  id: payment.id,
  patientId: payment.patientId,
  occurredOn: payment.payment_date,
  subtotal: normalizeBillingDecimal(payment.subtotal),
  discount: normalizeBillingDecimal(payment.discount),
  total: normalizeBillingDecimal(payment.total),
  amountReceived: normalizeBillingDecimal(payment.income),
  balanceChange: subtractBillingMoney(payment.total, payment.income),
  balanceAfter: normalizeBillingDecimal(payment.debt),
  paymentMethod: payment.payment_method,
  status: payment.status,
  version: payment.version,
  author: { userId: payment.author_user_id, name: payment.author_name },
  cancelledAt: payment.cancelled_at,
  cancelledBy: payment.cancelled_by_user_id
    ? { userId: payment.cancelled_by_user_id }
    : null,
  cancellationReason: payment.cancellation_reason,
  items: items.map(mapItem),
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
})

const actor = async (userId: number, transaction: Transaction) => {
  const user = await User.findByPk(userId, { transaction })
  if (!user)
    throw new BillingError('PATIENT_NOT_FOUND', 'Paciente no encontrado')
  return {
    userId,
    name: [user.name, user.middle_name, user.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' '),
  }
}

const lockPatient = async (
  userId: number,
  patientId: number,
  transaction: Transaction
) => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!patient)
    throw new BillingError('PATIENT_NOT_FOUND', 'Paciente no encontrado')
  return patient
}

const lockRecord = async (
  userId: number,
  patientId: number,
  recordId: number,
  transaction: Transaction
) => {
  const payment = await Payment.findOne({
    where: { id: recordId, user_id: userId, patientId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!payment) throw recordNotFound()
  return payment
}

const legacyPaymentMethod = (
  method: BillingPaymentMethod | null
): PaymentMethod => {
  if (method === 'DEBIT_CARD') return 'DEBIT'
  if (method === 'CREDIT_CARD') return 'CREDIT'
  if (method === 'BANK_TRANSFER') return 'TRANSFERENCE'
  return 'CASH'
}

interface CalculatedRecord {
  subtotal: string
  discount: string
  total: string
  amountReceived: string
  balanceChange: string
  items: Array<{
    conceptId: number
    description: string
    unitPrice: string
    quantity: number
    subtotal: string
  }>
}

const calculateRecord = async (
  userId: number,
  input: CreateBillingRecordInput | CorrectBillingRecordInput,
  transaction: Transaction
): Promise<CalculatedRecord> => {
  const conceptIds = input.items.map((item) => item.conceptId)
  const concepts = await UserConcept.findAll({
    where: { id: { [Op.in]: conceptIds }, user_id: userId },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (concepts.length !== conceptIds.length) throw conceptNotFound()
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  const archived = concepts.find((concept) => !concept.active)
  if (archived) {
    throw new BillingError(
      'BILLING_CONCEPT_ARCHIVED',
      'Un concepto archivado no puede usarse en registros nuevos'
    )
  }

  try {
    const items = input.items.map((requested) => {
      const concept = byId.get(requested.conceptId)!
      const unitPrice = normalizeBillingDecimal(concept.unit_price)
      return {
        conceptId: concept.id,
        description: concept.description,
        unitPrice,
        quantity: requested.quantity,
        subtotal: multiplyBillingMoney(requested.quantity, unitPrice),
      }
    })
    const subtotal = addBillingMoney(...items.map((item) => item.subtotal))
    const total = subtractBillingMoney(subtotal, input.discount)
    if (total.startsWith('-')) {
      throw new BillingError(
        'BILLING_DISCOUNT_EXCEEDS_SUBTOTAL',
        'El descuento no puede exceder el subtotal'
      )
    }
    const amountReceived = normalizeBillingDecimal(input.amountReceived)
    return {
      subtotal,
      discount: input.discount,
      total,
      amountReceived,
      balanceChange: subtractBillingMoney(total, amountReceived),
      items,
    }
  } catch (error) {
    if (error instanceof RangeError) {
      throw new BillingError(
        'BILLING_AMOUNT_LIMIT_EXCEEDED',
        'El importe excede el limite permitido'
      )
    }
    throw error
  }
}

const saveItems = async (
  paymentId: number,
  calculated: CalculatedRecord,
  method: BillingPaymentMethod | null,
  transaction: Transaction
) => {
  await PaymentUser.bulkCreate(
    calculated.items.map((item) => ({
      paymentId,
      conceptId: item.conceptId,
      paymentMethod: legacyPaymentMethod(method),
      quantity: item.quantity,
      description_snapshot: item.description,
      unit_price_snapshot: item.unitPrice,
      subtotal: item.subtotal,
    })),
    { transaction }
  )
}

const snapshot = (record: BillingRecordData): Record<string, unknown> => ({
  ...record,
  cancelledAt: record.cancelledAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const appendRevision = async (
  record: BillingRecordData,
  revisionActor: { userId: number; name: string },
  action: 'CREATED' | 'CORRECTED' | 'CANCELLED',
  reason: string | null,
  transaction: Transaction
) => {
  await PaymentRevision.create(
    {
      payment_id: record.id,
      version: record.version,
      action,
      changed_by_user_id: revisionActor.userId,
      changed_by_name: revisionActor.name,
      snapshot: snapshot(record),
      change_reason: reason,
    },
    { transaction }
  )
}

const recalculatePatientBalances = async (
  patient: Patient,
  transaction: Transaction
) => {
  const records = await Payment.findAll({
    where: { patientId: patient.id, user_id: patient.user_id },
    order: [
      ['payment_date', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  let runningBalance = '0.00'

  try {
    for (const record of records) {
      if (record.status === 'POSTED') {
        runningBalance = addBillingMoney(
          runningBalance,
          subtractBillingMoney(record.total, record.income)
        )
      }
      if (normalizeBillingDecimal(record.debt) !== runningBalance) {
        await record.update({ debt: runningBalance }, { transaction })
      }
    }
    if (normalizeBillingDecimal(patient.debt) !== runningBalance) {
      await patient.update({ debt: runningBalance }, { transaction })
    }
  } catch (error) {
    if (error instanceof RangeError) {
      throw new BillingError(
        'BILLING_AMOUNT_LIMIT_EXCEEDED',
        'El saldo del paciente excede el limite permitido'
      )
    }
    throw error
  }
}

export interface BillingRepository {
  listConcepts(
    userId: number,
    query: ListBillingConceptsQuery
  ): Promise<BillingPage<BillingConceptData>>
  findConcept(
    userId: number,
    conceptId: number
  ): Promise<BillingConceptData | null>
  createConcept(
    userId: number,
    input: CreateBillingConceptInput
  ): Promise<BillingConceptData>
  updateConcept(
    userId: number,
    conceptId: number,
    input: UpdateBillingConceptInput
  ): Promise<BillingConceptData>
  setConceptActive(
    userId: number,
    conceptId: number,
    active: boolean
  ): Promise<BillingConceptData>
  listRecords(
    userId: number,
    patientId: number,
    query: ListBillingRecordsQuery
  ): Promise<BillingPage<BillingRecordData> | null>
  findRecord(
    userId: number,
    patientId: number,
    recordId: number
  ): Promise<BillingRecordData | null>
  createRecord(
    userId: number,
    patientId: number,
    input: CreateBillingRecordInput,
    idempotencyKey: string,
    requestHash: string
  ): Promise<BillingRecordData>
  correctRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CorrectBillingRecordInput
  ): Promise<BillingRecordData>
  cancelRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CancelBillingRecordInput
  ): Promise<BillingRecordData>
  listRevisions(
    userId: number,
    patientId: number,
    recordId: number,
    query: ListBillingRevisionsQuery
  ): Promise<BillingPage<BillingRecordRevisionData> | null>
  summary(
    userId: number,
    query: BillingSummaryQuery
  ): Promise<Record<string, string>>
}

export class SequelizeBillingRepository implements BillingRepository {
  async listConcepts(userId: number, query: ListBillingConceptsQuery) {
    const where: WhereOptions = {
      user_id: userId,
      ...(query.status === 'active' && { active: true }),
      ...(query.status === 'archived' && { active: false }),
      ...(query.search && {
        description: { [Op.like]: `%${escapeLike(query.search)}%` },
      }),
    }
    const { count, rows } = await UserConcept.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [
        ['description', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return { records: rows.map(mapConcept), total: count }
  }

  async findConcept(userId: number, conceptId: number) {
    const concept = await UserConcept.findOne({
      where: { id: conceptId, user_id: userId },
    })
    return concept ? mapConcept(concept) : null
  }

  async createConcept(userId: number, input: CreateBillingConceptInput) {
    const concept = await UserConcept.create({
      user_id: userId,
      concept_id: null,
      description: input.description,
      unit_price: input.unitPrice,
      is_custom: true,
      active: true,
    })
    return mapConcept(concept)
  }

  async updateConcept(
    userId: number,
    conceptId: number,
    input: UpdateBillingConceptInput
  ) {
    const concept = await UserConcept.findOne({
      where: { id: conceptId, user_id: userId },
    })
    if (!concept) throw conceptNotFound()
    await concept.update({
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.unitPrice !== undefined && { unit_price: input.unitPrice }),
    })
    return mapConcept(concept)
  }

  async setConceptActive(userId: number, conceptId: number, active: boolean) {
    const concept = await UserConcept.findOne({
      where: { id: conceptId, user_id: userId },
    })
    if (!concept) throw conceptNotFound()
    if (concept.active !== active) await concept.update({ active })
    return mapConcept(concept)
  }

  async listRecords(
    userId: number,
    patientId: number,
    query: ListBillingRecordsQuery
  ) {
    if (!(await this.patientExists(userId, patientId))) return null
    const where: WhereOptions = {
      user_id: userId,
      patientId,
      ...(query.status !== 'all' && { status: query.status }),
      ...(query.dateFrom || query.dateTo
        ? {
            payment_date: {
              ...(query.dateFrom && { [Op.gte]: query.dateFrom }),
              ...(query.dateTo && { [Op.lte]: query.dateTo }),
            },
          }
        : {}),
    }
    const { count, rows } = await Payment.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [
        ['payment_date', 'DESC'],
        ['id', 'DESC'],
      ],
    })
    const items = await this.itemsFor(rows.map((row) => row.id))
    return {
      records: rows.map((row) => mapRecord(row, items.get(row.id) ?? [])),
      total: count,
    }
  }

  async findRecord(userId: number, patientId: number, recordId: number) {
    const payment = await Payment.findOne({
      where: { id: recordId, user_id: userId, patientId },
    })
    if (!payment) return null
    const items = await PaymentUser.findAll({
      where: { paymentId: recordId },
      order: [['id', 'ASC']],
    })
    return mapRecord(payment, items)
  }

  async createRecord(
    userId: number,
    patientId: number,
    input: CreateBillingRecordInput,
    idempotencyKey: string,
    requestHash: string
  ) {
    let recordId = 0
    try {
      await db.transaction(async (transaction) => {
        const patient = await lockPatient(userId, patientId, transaction)
        const existing = await Payment.findOne({
          where: { user_id: userId, idempotency_key: idempotencyKey },
          transaction,
        })
        if (existing) {
          if (existing.request_hash !== requestHash) {
            throw new BillingError(
              'IDEMPOTENCY_KEY_REUSED',
              'La llave de idempotencia ya se uso con otro payload'
            )
          }
          recordId = existing.id
          return
        }
        const calculated = await calculateRecord(userId, input, transaction)
        const revisionActor = await actor(userId, transaction)
        const payment = await Payment.create(
          {
            user_id: userId,
            patientId,
            author_user_id: userId,
            author_name: revisionActor.name,
            payment_date: input.occurredOn,
            subtotal: calculated.subtotal,
            discount: calculated.discount,
            total: calculated.total,
            income: calculated.amountReceived,
            debt: '0.00',
            payment_method: input.paymentMethod,
            idempotency_key: idempotencyKey,
            request_hash: requestHash,
          },
          { transaction }
        )
        recordId = payment.id
        await saveItems(
          payment.id,
          calculated,
          input.paymentMethod,
          transaction
        )
        await recalculatePatientBalances(patient, transaction)
        await payment.reload({ transaction })
        const record = await this.detailInTransaction(payment, transaction)
        await appendRevision(
          record,
          revisionActor,
          'CREATED',
          null,
          transaction
        )
      })
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error
      const existing = await Payment.findOne({
        where: { user_id: userId, idempotency_key: idempotencyKey },
      })
      if (!existing || existing.request_hash !== requestHash) {
        throw new BillingError(
          'IDEMPOTENCY_KEY_REUSED',
          'La llave de idempotencia ya se uso con otro payload'
        )
      }
      recordId = existing.id
    }
    const record = await this.findRecord(userId, patientId, recordId)
    if (!record) throw recordNotFound()
    return record
  }

  async correctRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CorrectBillingRecordInput
  ) {
    await db.transaction(async (transaction) => {
      const patient = await lockPatient(userId, patientId, transaction)
      const payment = await lockRecord(userId, patientId, recordId, transaction)
      if (payment.status === 'CANCELLED') {
        throw new BillingError(
          'BILLING_RECORD_CANCELLED',
          'Un registro cancelado no puede corregirse'
        )
      }
      const calculated = await calculateRecord(userId, input, transaction)
      const revisionActor = await actor(userId, transaction)
      await payment.update(
        {
          payment_date: input.occurredOn,
          subtotal: calculated.subtotal,
          discount: calculated.discount,
          total: calculated.total,
          income: calculated.amountReceived,
          payment_method: input.paymentMethod,
          version: payment.version + 1,
        },
        { transaction }
      )
      await PaymentUser.destroy({ where: { paymentId: recordId }, transaction })
      await saveItems(recordId, calculated, input.paymentMethod, transaction)
      await recalculatePatientBalances(patient, transaction)
      await payment.reload({ transaction })
      await appendRevision(
        await this.detailInTransaction(payment, transaction),
        revisionActor,
        'CORRECTED',
        input.changeReason,
        transaction
      )
    })
    return (await this.findRecord(userId, patientId, recordId))!
  }

  async cancelRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CancelBillingRecordInput
  ) {
    await db.transaction(async (transaction) => {
      const patient = await lockPatient(userId, patientId, transaction)
      const payment = await lockRecord(userId, patientId, recordId, transaction)
      if (payment.status === 'CANCELLED') return
      const revisionActor = await actor(userId, transaction)
      await payment.update(
        {
          status: 'CANCELLED',
          version: payment.version + 1,
          cancelled_at: new Date(),
          cancelled_by_user_id: userId,
          cancellation_reason: input.changeReason,
        },
        { transaction }
      )
      await recalculatePatientBalances(patient, transaction)
      await payment.reload({ transaction })
      await appendRevision(
        await this.detailInTransaction(payment, transaction),
        revisionActor,
        'CANCELLED',
        input.changeReason,
        transaction
      )
    })
    return (await this.findRecord(userId, patientId, recordId))!
  }

  async listRevisions(
    userId: number,
    patientId: number,
    recordId: number,
    query: ListBillingRevisionsQuery
  ) {
    if (!(await this.findRecord(userId, patientId, recordId))) return null
    const { count, rows } = await PaymentRevision.findAndCountAll({
      where: { payment_id: recordId },
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['version', 'DESC']],
    })
    return {
      records: rows.map((revision) => this.mapRevision(revision)),
      total: count,
    }
  }

  async summary(userId: number, query: BillingSummaryQuery) {
    const where: WhereOptions = {
      user_id: userId,
      status: 'POSTED',
      ...(query.dateFrom || query.dateTo
        ? {
            payment_date: {
              ...(query.dateFrom && { [Op.gte]: query.dateFrom }),
              ...(query.dateTo && { [Op.lte]: query.dateTo }),
            },
          }
        : {}),
    }
    const records = await Payment.findAll({
      where,
      attributes: ['total', 'income', 'discount'],
    })
    const patients = await Patient.findAll({
      where: { user_id: userId },
      attributes: ['debt'],
    })
    return {
      totalBilled: sumBillingMoney(...records.map((record) => record.total)),
      totalReceived: sumBillingMoney(...records.map((record) => record.income)),
      totalDiscount: sumBillingMoney(
        ...records.map((record) => record.discount)
      ),
      netChange: sumBillingMoney(
        ...records.map((record) =>
          subtractBillingMoney(record.total, record.income)
        )
      ),
      currentBalance: sumBillingMoney(
        ...patients.map((patient) => patient.debt)
      ),
    }
  }

  private async patientExists(userId: number, patientId: number) {
    return (
      (await Patient.count({ where: { id: patientId, user_id: userId } })) > 0
    )
  }

  private async itemsFor(ids: number[]) {
    const map = new Map<number, PaymentUser[]>()
    if (ids.length === 0) return map
    const items = await PaymentUser.findAll({
      where: { paymentId: { [Op.in]: ids } },
      order: [['id', 'ASC']],
    })
    for (const item of items) {
      map.set(item.paymentId, [...(map.get(item.paymentId) ?? []), item])
    }
    return map
  }

  private async detailInTransaction(
    payment: Payment,
    transaction: Transaction
  ) {
    const items = await PaymentUser.findAll({
      where: { paymentId: payment.id },
      order: [['id', 'ASC']],
      transaction,
    })
    return mapRecord(payment, items)
  }

  private mapRevision(revision: PaymentRevision): BillingRecordRevisionData {
    const value = revision.snapshot as unknown as BillingRecordData & {
      cancelledAt: string | null
      createdAt: string
      updatedAt: string
    }
    return {
      ...value,
      subtotal: normalizeBillingDecimal(value.subtotal),
      discount: normalizeBillingDecimal(value.discount),
      total: normalizeBillingDecimal(value.total),
      amountReceived: normalizeBillingDecimal(value.amountReceived),
      balanceChange: normalizeBillingDecimal(value.balanceChange),
      balanceAfter: normalizeBillingDecimal(value.balanceAfter),
      items: value.items.map((item) => ({
        ...item,
        unitPrice: normalizeBillingDecimal(item.unitPrice),
        subtotal: normalizeBillingDecimal(item.subtotal),
      })),
      cancelledAt: value.cancelledAt ? new Date(value.cancelledAt) : null,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
      revisionId: revision.id,
      action: revision.action,
      changedBy: {
        userId: revision.changed_by_user_id,
        name: revision.changed_by_name,
      },
      changeReason: revision.change_reason,
      recordedAt: revision.created_at,
    }
  }
}

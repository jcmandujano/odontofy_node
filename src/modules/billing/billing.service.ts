import { createHash } from 'node:crypto'

import {
  BillingRepository,
  SequelizeBillingRepository,
} from './billing.repository'
import type {
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
import type {
  BillingConceptData,
  BillingPage,
  BillingRecordData,
  BillingRecordRevisionData,
} from './billing.types'
import { BillingError } from './billing.types'

const serializeConcept = (concept: BillingConceptData) => ({
  ...concept,
  createdAt: concept.createdAt.toISOString(),
  updatedAt: concept.updatedAt.toISOString(),
})

const serializeRecord = (record: BillingRecordData) => ({
  ...record,
  cancelledAt: record.cancelledAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const serializeRevision = (revision: BillingRecordRevisionData) => ({
  ...serializeRecord(revision),
  recordedAt: revision.recordedAt.toISOString(),
})

const pagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
})

export interface BillingServiceDependencies {
  repository?: BillingRepository
}

export class BillingService {
  private readonly repository: BillingRepository

  constructor(dependencies: BillingServiceDependencies = {}) {
    this.repository =
      dependencies.repository ?? new SequelizeBillingRepository()
  }

  async listConcepts(userId: number, query: ListBillingConceptsQuery) {
    const result = await this.repository.listConcepts(userId, query)
    return this.page(result, query.page, query.pageSize, serializeConcept)
  }

  async getConcept(userId: number, conceptId: number) {
    const concept = await this.repository.findConcept(userId, conceptId)
    if (!concept) throw this.conceptNotFound()
    return serializeConcept(concept)
  }

  async createConcept(userId: number, input: CreateBillingConceptInput) {
    return serializeConcept(await this.repository.createConcept(userId, input))
  }

  async updateConcept(
    userId: number,
    conceptId: number,
    input: UpdateBillingConceptInput
  ) {
    return serializeConcept(
      await this.repository.updateConcept(userId, conceptId, input)
    )
  }

  async setConceptActive(userId: number, conceptId: number, active: boolean) {
    return serializeConcept(
      await this.repository.setConceptActive(userId, conceptId, active)
    )
  }

  async listRecords(
    userId: number,
    patientId: number,
    query: ListBillingRecordsQuery
  ) {
    const result = await this.repository.listRecords(userId, patientId, query)
    if (!result) throw this.patientNotFound()
    return this.page(result, query.page, query.pageSize, serializeRecord)
  }

  async getRecord(userId: number, patientId: number, recordId: number) {
    const record = await this.repository.findRecord(userId, patientId, recordId)
    if (!record) throw this.recordNotFound()
    return serializeRecord(record)
  }

  async createRecord(
    userId: number,
    patientId: number,
    input: CreateBillingRecordInput,
    idempotencyKey: string
  ) {
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ patientId, input }))
      .digest('hex')
    return serializeRecord(
      await this.repository.createRecord(
        userId,
        patientId,
        input,
        idempotencyKey,
        requestHash
      )
    )
  }

  async correctRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CorrectBillingRecordInput
  ) {
    return serializeRecord(
      await this.repository.correctRecord(userId, patientId, recordId, input)
    )
  }

  async cancelRecord(
    userId: number,
    patientId: number,
    recordId: number,
    input: CancelBillingRecordInput
  ) {
    return serializeRecord(
      await this.repository.cancelRecord(userId, patientId, recordId, input)
    )
  }

  async listRevisions(
    userId: number,
    patientId: number,
    recordId: number,
    query: ListBillingRevisionsQuery
  ) {
    const result = await this.repository.listRevisions(
      userId,
      patientId,
      recordId,
      query
    )
    if (!result) throw this.recordNotFound()
    return this.page(result, query.page, query.pageSize, serializeRevision)
  }

  summary(userId: number, query: BillingSummaryQuery) {
    return this.repository.summary(userId, query)
  }

  private page<T, U>(
    result: BillingPage<T>,
    page: number,
    pageSize: number,
    map: (value: T) => U
  ) {
    return {
      records: result.records.map(map),
      pagination: pagination(page, pageSize, result.total),
    }
  }

  private patientNotFound() {
    return new BillingError('PATIENT_NOT_FOUND', 'Paciente no encontrado')
  }

  private conceptNotFound() {
    return new BillingError(
      'BILLING_CONCEPT_NOT_FOUND',
      'Concepto de cobro no encontrado'
    )
  }

  private recordNotFound() {
    return new BillingError(
      'BILLING_RECORD_NOT_FOUND',
      'Registro financiero no encontrado'
    )
  }
}

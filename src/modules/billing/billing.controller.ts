import type { Request, RequestHandler } from 'express'

import { sendSuccess } from '../../platform/http/response'
import { authenticatedUserId } from '../identity/identity.middleware'
import type {
  BillingConceptParams,
  BillingRecordParams,
  BillingSummaryQuery,
  CancelBillingRecordInput,
  CorrectBillingRecordInput,
  CreateBillingConceptInput,
  CreateBillingRecordInput,
  IdempotencyHeaders,
  ListBillingConceptsQuery,
  ListBillingRecordsQuery,
  ListBillingRevisionsQuery,
  PatientBillingParams,
  UpdateBillingConceptInput,
} from './billing.schemas'
import { BillingService } from './billing.service'

const validated = <T>(
  req: Request,
  target: 'body' | 'headers' | 'params' | 'query'
): T => req.validated?.[target] as T

export const createBillingController = (service: BillingService) => {
  const listConcepts: RequestHandler = async (req, res) => {
    const result = await service.listConcepts(
      authenticatedUserId(req),
      validated<ListBillingConceptsQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.records, {
      message: 'Conceptos de cobro obtenidos',
      meta: { pagination: result.pagination },
    })
  }

  const getConcept: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.getConcept(
        authenticatedUserId(req),
        validated<BillingConceptParams>(req, 'params').conceptId
      ),
      { message: 'Concepto de cobro obtenido' }
    )

  const createConcept: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.createConcept(
        authenticatedUserId(req),
        validated<CreateBillingConceptInput>(req, 'body')
      ),
      { message: 'Concepto de cobro creado', statusCode: 201 }
    )

  const updateConcept: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.updateConcept(
        authenticatedUserId(req),
        validated<BillingConceptParams>(req, 'params').conceptId,
        validated<UpdateBillingConceptInput>(req, 'body')
      ),
      { message: 'Concepto de cobro actualizado' }
    )

  const setConceptActive =
    (active: boolean): RequestHandler =>
    async (req, res) =>
      sendSuccess(
        req,
        res,
        await service.setConceptActive(
          authenticatedUserId(req),
          validated<BillingConceptParams>(req, 'params').conceptId,
          active
        ),
        {
          message: active
            ? 'Concepto de cobro reactivado'
            : 'Concepto de cobro archivado',
        }
      )

  const listRecords: RequestHandler = async (req, res) => {
    const result = await service.listRecords(
      authenticatedUserId(req),
      validated<PatientBillingParams>(req, 'params').patientId,
      validated<ListBillingRecordsQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.records, {
      message: 'Registros financieros obtenidos',
      meta: { pagination: result.pagination },
    })
  }

  const getRecord: RequestHandler = async (req, res) => {
    const params = validated<BillingRecordParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.getRecord(
        authenticatedUserId(req),
        params.patientId,
        params.billingRecordId
      ),
      { message: 'Registro financiero obtenido' }
    )
  }

  const createRecord: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.createRecord(
        authenticatedUserId(req),
        validated<PatientBillingParams>(req, 'params').patientId,
        validated<CreateBillingRecordInput>(req, 'body'),
        validated<IdempotencyHeaders>(req, 'headers')['idempotency-key']
      ),
      { message: 'Registro financiero creado', statusCode: 201 }
    )

  const correctRecord: RequestHandler = async (req, res) => {
    const params = validated<BillingRecordParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.correctRecord(
        authenticatedUserId(req),
        params.patientId,
        params.billingRecordId,
        validated<CorrectBillingRecordInput>(req, 'body')
      ),
      { message: 'Registro financiero corregido' }
    )
  }

  const cancelRecord: RequestHandler = async (req, res) => {
    const params = validated<BillingRecordParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.cancelRecord(
        authenticatedUserId(req),
        params.patientId,
        params.billingRecordId,
        validated<CancelBillingRecordInput>(req, 'body')
      ),
      { message: 'Registro financiero cancelado' }
    )
  }

  const listRevisions: RequestHandler = async (req, res) => {
    const params = validated<BillingRecordParams>(req, 'params')
    const result = await service.listRevisions(
      authenticatedUserId(req),
      params.patientId,
      params.billingRecordId,
      validated<ListBillingRevisionsQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.records, {
      message: 'Revisiones del registro obtenidas',
      meta: { pagination: result.pagination },
    })
  }

  const summary: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.summary(
        authenticatedUserId(req),
        validated<BillingSummaryQuery>(req, 'query')
      ),
      { message: 'Resumen financiero obtenido' }
    )

  return {
    archiveConcept: setConceptActive(false),
    cancelRecord,
    correctRecord,
    createConcept,
    createRecord,
    getConcept,
    getRecord,
    listConcepts,
    listRecords,
    listRevisions,
    reactivateConcept: setConceptActive(true),
    summary,
    updateConcept,
  }
}

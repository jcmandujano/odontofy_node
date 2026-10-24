import { Router } from 'express'
import { authenticatedUserId } from '../identity/identity.middleware'
import { sendSuccess } from '../../platform/http/response'
import { TreatmentChargeService } from './treatment-charge.service'
import { chargePatientParams, chargeTreatmentParams, chargeQuery, confirmChargeSchema, treatmentPaymentSchema, type ChargeQuery, type ConfirmChargeInput, type TreatmentPaymentInput } from './treatment-charge.schemas'

import { noStore } from '../../platform/http/cache.middleware'
import { validateRequest } from '../../platform/http/validate.middleware'
import { authenticate } from '../identity/identity.middleware'
import type { IdentityService } from '../identity/identity.service'
import { createBillingController } from './billing.controller'
import { billingErrorHandler } from './billing.middleware'
import {
  billingConceptParamsSchema,
  billingRecordParamsSchema,
  billingSummaryQuerySchema,
  cancelBillingRecordSchema,
  correctBillingRecordSchema,
  createBillingConceptSchema,
  createBillingRecordSchema,
  idempotencyHeadersSchema,
  listBillingConceptsQuerySchema,
  listBillingRecordsQuerySchema,
  listBillingRevisionsQuerySchema,
  patientBillingParamsSchema,
  updateBillingConceptSchema,
} from './billing.schemas'
import { BillingService, BillingServiceDependencies } from './billing.service'

export const createBillingRouter = (
  identityService: IdentityService,
  dependencies: BillingServiceDependencies = {}
) => {
  const router = Router()
  const controller = createBillingController(new BillingService(dependencies))
  const privateRoute = [noStore, authenticate(identityService)]
  const charges = new TreatmentChargeService()
  router.use('/patients/:patientId/treatment-charges', ...privateRoute)
  router.use('/patients/:patientId/treatment-payments', ...privateRoute)
  router.get('/patients/:patientId/treatment-charges', validateRequest({ params: chargePatientParams, query: chargeQuery }), async (req, res) => {
    const { patientId } = req.validated!.params as { patientId: number }
    const result = await charges.list(authenticatedUserId(req), patientId, req.validated!.query as ChargeQuery)
    return sendSuccess(req, res, result.records, { message: 'Cargos y saldos obtenidos', meta: { pagination: result.pagination, summary: result.summary } })
  })
  router.post('/patients/:patientId/treatment-charges/:treatmentId/confirmation', validateRequest({ params: chargeTreatmentParams, body: confirmChargeSchema }), async (req, res) => {
    const { patientId, treatmentId } = req.validated!.params as { patientId: number; treatmentId: number }
    return sendSuccess(req, res, await charges.confirm(authenticatedUserId(req), patientId, treatmentId, req.validated!.body as ConfirmChargeInput), { message: 'Cargo confirmado' })
  })
  router.post('/patients/:patientId/treatment-payments', validateRequest({ params: chargePatientParams, headers: idempotencyHeadersSchema, body: treatmentPaymentSchema }), async (req, res) => {
    const { patientId } = req.validated!.params as { patientId: number }
    return sendSuccess(req, res, await charges.pay(authenticatedUserId(req), patientId, req.validated!.body as TreatmentPaymentInput, req.get('Idempotency-Key')!), { statusCode: 201, message: 'Abono registrado sin generar otro cargo' })
  })

  router.use('/billing-concepts', ...privateRoute)
  router.use('/billing', ...privateRoute)
  router.use('/patients/:patientId/billing-records', ...privateRoute)
  router.get(
    '/billing-concepts',
    validateRequest({ query: listBillingConceptsQuerySchema }),
    controller.listConcepts
  )
  router.post(
    '/billing-concepts',
    validateRequest({ body: createBillingConceptSchema }),
    controller.createConcept
  )
  router.get(
    '/billing-concepts/:conceptId',
    validateRequest({ params: billingConceptParamsSchema }),
    controller.getConcept
  )
  router.patch(
    '/billing-concepts/:conceptId',
    validateRequest({
      params: billingConceptParamsSchema,
      body: updateBillingConceptSchema,
    }),
    controller.updateConcept
  )
  router.delete(
    '/billing-concepts/:conceptId',
    validateRequest({ params: billingConceptParamsSchema }),
    controller.archiveConcept
  )
  router.post(
    '/billing-concepts/:conceptId/reactivate',
    validateRequest({ params: billingConceptParamsSchema }),
    controller.reactivateConcept
  )
  router.get(
    '/billing/summary',
    validateRequest({ query: billingSummaryQuerySchema }),
    controller.summary
  )
  router.get(
    '/patients/:patientId/billing-records',
    validateRequest({
      params: patientBillingParamsSchema,
      query: listBillingRecordsQuerySchema,
    }),
    controller.listRecords
  )
  router.post(
    '/patients/:patientId/billing-records',
    validateRequest({
      params: patientBillingParamsSchema,
      headers: idempotencyHeadersSchema,
      body: createBillingRecordSchema,
    }),
    controller.createRecord
  )
  router.get(
    '/patients/:patientId/billing-records/:billingRecordId',
    validateRequest({ params: billingRecordParamsSchema }),
    controller.getRecord
  )
  router.put(
    '/patients/:patientId/billing-records/:billingRecordId/correction',
    validateRequest({
      params: billingRecordParamsSchema,
      body: correctBillingRecordSchema,
    }),
    controller.correctRecord
  )
  router.post(
    '/patients/:patientId/billing-records/:billingRecordId/cancellation',
    validateRequest({
      params: billingRecordParamsSchema,
      body: cancelBillingRecordSchema,
    }),
    controller.cancelRecord
  )
  router.get(
    '/patients/:patientId/billing-records/:billingRecordId/revisions',
    validateRequest({
      params: billingRecordParamsSchema,
      query: listBillingRevisionsQuerySchema,
    }),
    controller.listRevisions
  )

  router.use(billingErrorHandler)
  return router
}

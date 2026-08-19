import { Router } from 'express'

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

import { Router } from 'express';
import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import { IdentityService } from '../identity/identity.service';
import { createTreatmentPlanController } from './treatment-plan.controller';
import { treatmentPlanErrorHandler } from './treatment-plan.middleware';
import {
  createTreatmentPlanItemSchema,
  createTreatmentPlanSchema,
  listTreatmentPlansQuerySchema,
  patientTreatmentPlansParamsSchema,
  treatmentPlanItemParamsSchema,
  treatmentPlanParamsSchema,
  updateTreatmentPlanItemSchema,
  updateTreatmentPlanItemStatusSchema,
  updateTreatmentPlanSchema,
  updateTreatmentPlanStatusSchema,
  patientTreatmentParamsSchema,
  listPatientTreatmentsQuerySchema,
  type ListPatientTreatmentsQuery,
  type CreateTreatmentPlanItemInput,
  type UpdateTreatmentPlanItemInput,
  type UpdateTreatmentPlanItemStatusInput,
} from './treatment-plan.schemas';
import {
  TreatmentPlanService,
  TreatmentPlanServiceDependencies,
} from './treatment-plan.service';

export const createTreatmentPlanRouter = (
  identityService: IdentityService,
  dependencies: TreatmentPlanServiceDependencies = {}
): Router => {
  const router = Router();
  const service = new TreatmentPlanService(dependencies);
  const controller = createTreatmentPlanController(service);

  const privateRoute = [noStore, authenticate(identityService)];
  router.use('/patients/:patientId/treatment-plans', ...privateRoute);
  router.use('/patients/:patientId/treatments', ...privateRoute);
  router.get('/patients/:patientId/treatments', validateRequest({ params: patientTreatmentPlansParamsSchema, query: listPatientTreatmentsQuerySchema }), async (req, res) => {
    const params = req.validated!.params as { patientId: number };
    const result = await service.listPatientTreatments(authenticatedUserId(req), params.patientId, req.validated!.query as ListPatientTreatmentsQuery);
    return sendSuccess(req, res, result.items, { message: 'Tratamientos del paciente obtenidos', meta: { pagination: result.pagination } });
  });
  router.post('/patients/:patientId/treatments', validateRequest({ params: patientTreatmentPlansParamsSchema, body: createTreatmentPlanItemSchema }), async (req, res) => {
    const params = req.validated!.params as { patientId: number };
    return sendSuccess(req, res, await service.createPatientTreatment(authenticatedUserId(req), params.patientId, req.validated!.body as CreateTreatmentPlanItemInput), { statusCode: 201, message: 'Tratamiento independiente creado' });
  });
  router.patch('/patients/:patientId/treatments/:itemId', validateRequest({ params: patientTreatmentParamsSchema, body: updateTreatmentPlanItemSchema }), async (req, res) => {
    const params = req.validated!.params as { patientId: number; itemId: number };
    return sendSuccess(req, res, await service.updatePatientTreatment(authenticatedUserId(req), params.patientId, params.itemId, req.validated!.body as UpdateTreatmentPlanItemInput), { message: 'Tratamiento actualizado' });
  });
  router.patch('/patients/:patientId/treatments/:itemId/status', validateRequest({ params: patientTreatmentParamsSchema, body: updateTreatmentPlanItemStatusSchema }), async (req, res) => {
    const params = req.validated!.params as { patientId: number; itemId: number };
    return sendSuccess(req, res, await service.updatePatientTreatmentStatus(authenticatedUserId(req), params.patientId, params.itemId, req.validated!.body as UpdateTreatmentPlanItemStatusInput), { message: 'Estado del tratamiento actualizado' });
  });
  router.use('/treatment-plans', ...privateRoute);
  router.get(
    '/patients/:patientId/treatment-plans',
    validateRequest({
      params: patientTreatmentPlansParamsSchema,
      query: listTreatmentPlansQuerySchema,
    }),
    controller.list
  );
  router.post(
    '/patients/:patientId/treatment-plans',
    validateRequest({
      params: patientTreatmentPlansParamsSchema,
      body: createTreatmentPlanSchema,
    }),
    controller.create
  );
  router.get(
    '/treatment-plans/:treatmentPlanId',
    validateRequest({ params: treatmentPlanParamsSchema }),
    controller.get
  );
  router.patch(
    '/treatment-plans/:treatmentPlanId',
    validateRequest({
      params: treatmentPlanParamsSchema,
      body: updateTreatmentPlanSchema,
    }),
    controller.update
  );
  router.delete(
    '/treatment-plans/:treatmentPlanId',
    validateRequest({ params: treatmentPlanParamsSchema }),
    controller.cancel
  );
  router.patch(
    '/treatment-plans/:treatmentPlanId/status',
    validateRequest({
      params: treatmentPlanParamsSchema,
      body: updateTreatmentPlanStatusSchema,
    }),
    controller.updateStatus
  );
  router.post(
    '/treatment-plans/:treatmentPlanId/items',
    validateRequest({
      params: treatmentPlanParamsSchema,
      body: createTreatmentPlanItemSchema,
    }),
    controller.createItem
  );
  router.patch(
    '/treatment-plans/:treatmentPlanId/items/:itemId',
    validateRequest({
      params: treatmentPlanItemParamsSchema,
      body: updateTreatmentPlanItemSchema,
    }),
    controller.updateItem
  );
  router.delete(
    '/treatment-plans/:treatmentPlanId/items/:itemId',
    validateRequest({ params: treatmentPlanItemParamsSchema }),
    controller.cancelItem
  );
  router.patch(
    '/treatment-plans/:treatmentPlanId/items/:itemId/status',
    validateRequest({
      params: treatmentPlanItemParamsSchema,
      body: updateTreatmentPlanItemStatusSchema,
    }),
    controller.updateItemStatus
  );

  router.use(treatmentPlanErrorHandler);
  return router;
};

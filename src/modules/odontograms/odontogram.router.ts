import { Router } from 'express';
import { authenticatedUserId } from '../identity/identity.middleware';
import { sendSuccess } from '../../platform/http/response';
import { OdontogramPlanService } from './odontogram-plan.service';
import { createOdontogramPlanSchema, type CreateOdontogramPlanInput } from './odontogram-plan.schemas';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import { IdentityService } from '../identity/identity.service';
import { createOdontogramController } from './odontogram.controller';
import { odontogramErrorHandler } from './odontogram.middleware';
import {
  createOdontogramSchema,
  listOdontogramsQuerySchema,
  odontogramParamsSchema,
  odontogramTreatmentLinkParamsSchema,
  patientOdontogramsParamsSchema,
  updateOdontogramSchema,
  odontogramFindingParamsSchema,
  odontogramCreationHeadersSchema,
  createFindingTreatmentSchema,
} from './odontogram.schemas';
import {
  OdontogramService,
  OdontogramServiceDependencies,
} from './odontogram.service';

export const createOdontogramRouter = (
  identityService: IdentityService,
  dependencies: OdontogramServiceDependencies = {}
): Router => {
  const router = Router();
  const controller = createOdontogramController(
    new OdontogramService(dependencies)
  );
  const privateRoute = [noStore, authenticate(identityService)];

  router.use('/patients/:patientId/odontograms', ...privateRoute);
  router.use('/odontograms', ...privateRoute);
  const plans = new OdontogramPlanService();
  router.get('/odontograms/:odontogramId/treatment-plan-preview', validateRequest({ params: odontogramParamsSchema }), async (req, res) => {
    const { odontogramId } = req.validated!.params as { odontogramId: number };
    return sendSuccess(req, res, await plans.preview(authenticatedUserId(req), odontogramId), { message: 'Tratamientos disponibles para revisar' });
  });
  router.post('/odontograms/:odontogramId/treatment-plans', validateRequest({ params: odontogramParamsSchema, headers: odontogramCreationHeadersSchema, body: createOdontogramPlanSchema }), async (req, res) => {
    const { odontogramId } = req.validated!.params as { odontogramId: number };
    return sendSuccess(req, res, await plans.create(authenticatedUserId(req), odontogramId, req.validated!.body as CreateOdontogramPlanInput, req.get('Idempotency-Key')!), { statusCode: 201, message: 'Borrador creado sin duplicar tratamientos ni generar cargos' });
  });
  router.post(
    '/odontograms/:odontogramId/findings/:findingId/treatments',
    validateRequest({
      params: odontogramFindingParamsSchema,
      headers: odontogramCreationHeadersSchema,
      body: createFindingTreatmentSchema,
    }),
    controller.createFindingTreatment
  );
  router.get(
    '/patients/:patientId/odontograms',
    validateRequest({
      params: patientOdontogramsParamsSchema,
      query: listOdontogramsQuerySchema,
    }),
    controller.list
  );
  router.post(
    '/patients/:patientId/odontograms',
    validateRequest({
      params: patientOdontogramsParamsSchema,
      body: createOdontogramSchema,
    }),
    controller.create
  );
  router.get(
    '/odontograms/:odontogramId',
    validateRequest({ params: odontogramParamsSchema }),
    controller.get
  );
  router.patch(
    '/odontograms/:odontogramId',
    validateRequest({
      params: odontogramParamsSchema,
      body: updateOdontogramSchema,
    }),
    controller.update
  );
  router.delete(
    '/odontograms/:odontogramId',
    validateRequest({ params: odontogramParamsSchema }),
    controller.archive
  );
  router.post(
    '/odontograms/:odontogramId/restore',
    validateRequest({ params: odontogramParamsSchema }),
    controller.restore
  );
  router.put(
    '/odontograms/:odontogramId/findings/:findingId/treatment-items/:itemId',
    validateRequest({ params: odontogramTreatmentLinkParamsSchema }),
    controller.linkTreatmentItem
  );
  router.delete(
    '/odontograms/:odontogramId/findings/:findingId/treatment-items/:itemId',
    validateRequest({ params: odontogramTreatmentLinkParamsSchema }),
    controller.unlinkTreatmentItem
  );

  router.use(odontogramErrorHandler);
  return router;
};

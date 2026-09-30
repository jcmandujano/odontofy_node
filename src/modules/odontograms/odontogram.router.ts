import { Router } from 'express';

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

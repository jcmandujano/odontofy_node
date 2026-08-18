import { Router } from 'express';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import { IdentityService } from '../identity/identity.service';
import { createPatientController } from './patient.controller';
import { patientErrorHandler } from './patient.middleware';
import {
  createPatientSchema,
  listPatientsQuerySchema,
  patientIdParamsSchema,
  updatePatientSchema,
} from './patient.schemas';
import {
  PatientService,
  PatientServiceDependencies,
} from './patient.service';

export const createPatientRouter = (
  identityService: IdentityService,
  dependencies: PatientServiceDependencies = {}
): Router => {
  const router = Router();
  const service = new PatientService(dependencies);
  const controller = createPatientController(service);

  router.use('/patients', noStore, authenticate(identityService));
  router.get(
    '/patients',
    validateRequest({ query: listPatientsQuerySchema }),
    controller.list
  );
  router.post(
    '/patients',
    validateRequest({ body: createPatientSchema }),
    controller.create
  );
  router.get(
    '/patients/:patientId',
    validateRequest({ params: patientIdParamsSchema }),
    controller.get
  );
  router.patch(
    '/patients/:patientId',
    validateRequest({
      params: patientIdParamsSchema,
      body: updatePatientSchema,
    }),
    controller.update
  );
  router.delete(
    '/patients/:patientId',
    validateRequest({ params: patientIdParamsSchema }),
    controller.archive
  );

  router.use(patientErrorHandler);
  return router;
};

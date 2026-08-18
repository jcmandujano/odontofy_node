import express, { Router } from 'express';

import { apiErrorHandler, notFoundHandler } from './error.middleware';
import { createHealthRouter, ReadinessCheck } from './health.router';
import { loadOpenApiV1 } from './openapi';
import { sendSuccess } from './response';
import { createIdentityRouter } from '../../modules/identity/identity.router';
import {
  IdentityService,
  IdentityServiceDependencies,
} from '../../modules/identity/identity.service';
import { identityErrorHandler } from '../../modules/identity/identity.middleware';
import { createPatientRouter } from '../../modules/patients/patient.router';
import { PatientServiceDependencies } from '../../modules/patients/patient.service';
import { createTreatmentPlanRouter } from '../../modules/treatment-plans/treatment-plan.router';
import { TreatmentPlanServiceDependencies } from '../../modules/treatment-plans/treatment-plan.service';

export interface V1RouterDependencies {
  identity?: IdentityServiceDependencies;
  patients?: PatientServiceDependencies;
  treatmentPlans?: TreatmentPlanServiceDependencies;
}

export const createV1Router = (
  readinessCheck: ReadinessCheck,
  dependencies: V1RouterDependencies = {}
): Router => {
  const router = Router();
  const openApiDocument = loadOpenApiV1();
  const identityService = new IdentityService(dependencies.identity);

  router.use(express.json({ limit: '1mb' }));

  router.get('/', (req, res) =>
    sendSuccess(
      req,
      res,
      { version: 'v1' },
      { message: 'Odontofy API v1' }
    )
  );
  router.use('/health', createHealthRouter(readinessCheck));
  router.use(createIdentityRouter(identityService));
  router.use(createPatientRouter(identityService, dependencies.patients));
  router.use(
    createTreatmentPlanRouter(identityService, dependencies.treatmentPlans)
  );
  router.get('/openapi.json', (_req, res) => res.json(openApiDocument));

  router.use(notFoundHandler);
  router.use(identityErrorHandler);
  router.use(apiErrorHandler);

  return router;
};

import express, { Router } from 'express';

import { apiErrorHandler, notFoundHandler } from './error.middleware';
import { createBillingRouter } from '../../modules/billing/billing.router';
import { createAppointmentRouter, AppointmentModuleDependencies } from '../../modules/appointments/appointment.router';
import { BillingServiceDependencies } from '../../modules/billing/billing.service';
import { createHealthRouter, ReadinessCheck } from './health.router';
import { loadOpenApiV1 } from './openapi';
import { sendSuccess } from './response';
import { createClinicalRecordRouter } from '../../modules/clinical-records/clinical-record.router';
import { ClinicalRecordServiceDependencies } from '../../modules/clinical-records/clinical-record.service';
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
import { createConsentRouter } from '../../modules/consents/consent.router';
import { ConsentServiceDependencies } from '../../modules/consents/consent.service';
import { createFileRouter } from '../../modules/files/file.router';
import { FileServiceDependencies } from '../../modules/files/file.service';

export interface V1RouterDependencies {
  appointmentModule?: AppointmentModuleDependencies;
  billing?: BillingServiceDependencies;
  clinicalRecords?: ClinicalRecordServiceDependencies;
  consents?: ConsentServiceDependencies;
  files?: FileServiceDependencies;
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
  router.use(createFileRouter(identityService, dependencies.files));
  router.use(createConsentRouter(identityService, dependencies.consents));
  router.use(createAppointmentRouter(identityService, dependencies.appointmentModule));
  router.use(createPatientRouter(identityService, dependencies.patients));
  router.use(createBillingRouter(identityService, dependencies.billing));
  router.use(
    createTreatmentPlanRouter(identityService, dependencies.treatmentPlans)
  );
  router.use(
    createClinicalRecordRouter(identityService, dependencies.clinicalRecords)
  );
  router.get('/openapi.json', (_req, res) => res.json(openApiDocument));

  router.use(notFoundHandler);
  router.use(identityErrorHandler);
  router.use(apiErrorHandler);

  return router;
};

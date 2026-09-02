import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { Logger } from 'pino';

import db from './db/connection';
import { attachRequestContext } from './platform/http/request-context.middleware';
import {
  applicationLogger,
  createRequestLogger,
} from './platform/http/logger';
import { loadOpenApiV1 } from './platform/http/openapi';
import { createV1Router } from './platform/http/v1.router';
import { ReadinessCheck } from './platform/http/health.router';
import { IdentityServiceDependencies } from './modules/identity/identity.service';
import { PatientServiceDependencies } from './modules/patients/patient.service';
import { BillingServiceDependencies } from './modules/billing/billing.service';
import { AppointmentModuleDependencies } from './modules/appointments/appointment.router';
import { ConsentServiceDependencies } from './modules/consents/consent.service';
import { FileServiceDependencies } from './modules/files/file.service';
import { ClinicalRecordServiceDependencies } from './modules/clinical-records/clinical-record.service';
import { TreatmentPlanServiceDependencies } from './modules/treatment-plans/treatment-plan.service';

export interface AppOptions {
  appointmentModule?: AppointmentModuleDependencies;
  billing?: BillingServiceDependencies;
  clinicalRecords?: ClinicalRecordServiceDependencies;
  consents?: ConsentServiceDependencies;
  files?: FileServiceDependencies;
  identity?: IdentityServiceDependencies;
  logger?: Logger;
  patients?: PatientServiceDependencies;
  readinessCheck?: ReadinessCheck;
  treatmentPlans?: TreatmentPlanServiceDependencies;
}

const defaultReadinessCheck: ReadinessCheck = async () => {
  await db.authenticate();
};

export const createApp = (options: AppOptions = {}): Application => {
  const app = express();
  const logger = options.logger ?? applicationLogger;
  const readinessCheck = options.readinessCheck ?? defaultReadinessCheck;
  const openApiV1Document = loadOpenApiV1();

  // Railway terminates TLS and forwards requests to this container. Trust only
  // that immediate proxy so rate limiting uses the forwarded client address.
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : false,
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    })
  );
  app.use(
    '/api/v1',
    createRequestLogger(logger),
    attachRequestContext,
    createV1Router(readinessCheck, {
      appointmentModule: options.appointmentModule,
      billing: options.billing,
      clinicalRecords: options.clinicalRecords,
      consents: options.consents,
      files: options.files,
      identity: options.identity,
      patients: options.patients,
      treatmentPlans: options.treatmentPlans,
    })
  );

  app.use(express.static('public'));
  app.use(
    '/api-docs/v1',
    swaggerUi.serve,
    swaggerUi.setup(openApiV1Document)
  );
  return app;
};

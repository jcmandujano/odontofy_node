import path from 'path';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { Logger } from 'pino';

import appointmentRoutes from './routes/appointment.route';
import authRoutes from './routes/auth.route';
import calendarRoutes from './routes/google.route';
import conceptRoutes from './routes/concept.route';
import informedConsentsRoutes from './routes/informed-consent.route';
import meRoutes from './routes/me.route';
import noteRoutes from './routes/evolution-note.route';
import patientRoutes from './routes/patient.route';
import paymentRoutes from './routes/payment.route';
import signedConsentsRoutes from './routes/signed-consents.route';
import treatmentPlanRoutes from './routes/treatment-plan.route';
import userConceptRoutes from './routes/user-concept.route';
import userInformedConsentRoutes from './routes/user-informed-consent.route';
import userRoutes from './routes/user.route';
import fileUploadRoute from './routes/upload.route';
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
import './models/treatment-plan.model';
import './models/treatment-plan-item.model';

const apiRoutes = {
  auth: '/api/auth',
  users: '/api/users',
  me: '/api/me',
  patients: '/api/patients',
  evolutionNotes: '/api/patients',
  payments: '/api/patients',
  concepts: '/api/concepts',
  userConcepts: '/api/user-concepts',
  informedConsents: '/api/informed-consents',
  signedConsents: '/api/patients',
  appointments: '/api/appointments',
  userInformedConsents: '/api/user-informed-consents',
  calendar: '/api/google',
  fileUpload: '/api/upload',
  treatmentPlans: '/api',
} as const;

export interface AppOptions {
  appointmentModule?: AppointmentModuleDependencies;
  billing?: BillingServiceDependencies;
  consents?: ConsentServiceDependencies;
  files?: FileServiceDependencies;
  identity?: IdentityServiceDependencies;
  logger?: Logger;
  patients?: PatientServiceDependencies;
  readinessCheck?: ReadinessCheck;
}

const defaultReadinessCheck: ReadinessCheck = async () => {
  await db.authenticate();
};

export const createApp = (options: AppOptions = {}): Application => {
  const app = express();
  const logger = options.logger ?? applicationLogger;
  const readinessCheck = options.readinessCheck ?? defaultReadinessCheck;
  const swaggerDocument = YAML.load(
    path.resolve(process.cwd(), 'src/docs/swagger.yaml')
  ) as object;
  const openApiV1Document = loadOpenApiV1();

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
      consents: options.consents,
      files: options.files,
      identity: options.identity,
      patients: options.patients,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static('public'));

  app.use(apiRoutes.users, userRoutes);
  app.use(apiRoutes.me, meRoutes);
  app.use(apiRoutes.auth, authRoutes);
  app.use(apiRoutes.patients, patientRoutes);
  app.use(apiRoutes.evolutionNotes, noteRoutes);
  app.use(apiRoutes.payments, paymentRoutes);
  app.use(apiRoutes.concepts, conceptRoutes);
  app.use(apiRoutes.userConcepts, userConceptRoutes);
  app.use(apiRoutes.informedConsents, informedConsentsRoutes);
  app.use(apiRoutes.signedConsents, signedConsentsRoutes);
  app.use(apiRoutes.appointments, appointmentRoutes);
  app.use(apiRoutes.userInformedConsents, userInformedConsentRoutes);
  app.use(apiRoutes.calendar, calendarRoutes);
  app.use(apiRoutes.fileUpload, fileUploadRoute);
  app.use(apiRoutes.treatmentPlans, treatmentPlanRoutes);
  app.use(
    '/api-docs/v1',
    swaggerUi.serve,
    swaggerUi.setup(openApiV1Document)
  );
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  return app;
};

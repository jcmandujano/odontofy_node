import express, { Router } from 'express';

import { apiErrorHandler, notFoundHandler } from './error.middleware';
import { createHealthRouter, ReadinessCheck } from './health.router';
import { loadOpenApiV1 } from './openapi';
import { sendSuccess } from './response';

export const createV1Router = (readinessCheck: ReadinessCheck): Router => {
  const router = Router();
  const openApiDocument = loadOpenApiV1();

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
  router.get('/openapi.json', (_req, res) => res.json(openApiDocument));

  router.use(notFoundHandler);
  router.use(apiErrorHandler);

  return router;
};

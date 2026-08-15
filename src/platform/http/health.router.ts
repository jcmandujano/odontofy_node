import { Router } from 'express';

import { ApiError } from './api-error';
import { sendSuccess } from './response';

export type ReadinessCheck = () => Promise<void>;

export const createHealthRouter = (readinessCheck: ReadinessCheck): Router => {
  const router = Router();

  router.get('/live', (req, res) => {
    return sendSuccess(req, res, { status: 'ok' }, { message: 'Servicio activo' });
  });

  router.get('/ready', async (req, res) => {
    try {
      await readinessCheck();
    } catch (cause) {
      throw new ApiError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Servicio no disponible',
        statusCode: 503,
        cause,
      });
    }

    return sendSuccess(
      req,
      res,
      { status: 'ready' },
      { message: 'Servicio listo' }
    );
  });

  return router;
};

import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';

import { ApiError } from '../../platform/http/api-error';
import { IdentityService } from './identity.service';
import { IdentityError, SessionContext } from './identity.types';

const identityStatus: Record<IdentityError['code'], number> = {
  INVALID_CREDENTIALS: 401,
  INVALID_PASSWORD: 401,
  INVALID_SESSION: 401,
  INVALID_TOKEN: 400,
  UNAUTHENTICATED: 401,
  USER_NOT_FOUND: 404,
};

export const identityErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof IdentityError)) {
    next(error);
    return;
  }

  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: identityStatus[error.code],
    })
  );
};

export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

export const requestContext = (req: Request): SessionContext => ({
  ipAddress: req.ip || null,
  userAgent: req.get('user-agent')?.slice(0, 512) || null,
});

export const authenticate = (service: IdentityService): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authorization = req.get('authorization');
      const [scheme, token, extra] = authorization?.split(' ') ?? [];
      if (scheme !== 'Bearer' || !token || extra) {
        throw new IdentityError(
          'UNAUTHENTICATED',
          'Token de acceso no valido'
        );
      }

      req.auth = { userId: await service.authenticateAccessToken(token) };
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const authenticatedUserId = (req: Request): number => {
  if (!req.auth) {
    throw new IdentityError('UNAUTHENTICATED', 'Autenticacion requerida');
  }
  return req.auth.userId;
};

export const authRateLimit = (windowMs: number, limit: number): RequestHandler =>
  rateLimit({
    legacyHeaders: false,
    limit,
    standardHeaders: 'draft-8',
    windowMs,
    handler: (_req, _res, next) => {
      next(
        new ApiError({
          code: 'RATE_LIMITED',
          message: 'Demasiadas solicitudes. Intenta mas tarde',
          statusCode: 429,
        })
      );
    },
  });

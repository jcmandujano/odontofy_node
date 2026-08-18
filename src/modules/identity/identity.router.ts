import { Router } from 'express';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { createIdentityController } from './identity.controller';
import {
  authRateLimit,
  authenticate,
} from './identity.middleware';
import {
  accountVerificationConfirmSchema,
  accountVerificationRequestSchema,
  emptyBodySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyPasswordSchema,
} from './identity.schemas';
import { IdentityService } from './identity.service';

const minute = 60 * 1000;

export const createIdentityRouter = (service: IdentityService): Router => {
  const router = Router();
  const controller = createIdentityController(service);
  const requireAuth = authenticate(service);

  router.use(noStore);

  router.post(
    '/auth/login',
    authRateLimit(15 * minute, 10),
    validateRequest({ body: loginSchema }),
    controller.login
  );
  router.post(
    '/auth/refresh',
    authRateLimit(15 * minute, 60),
    validateRequest({ body: emptyBodySchema }),
    controller.refresh
  );
  router.post(
    '/auth/logout',
    validateRequest({ body: emptyBodySchema }),
    controller.logout
  );
  router.post(
    '/auth/register',
    authRateLimit(60 * minute, 5),
    validateRequest({ body: registerSchema }),
    controller.register
  );
  router.post(
    '/auth/account-verification/request',
    authRateLimit(60 * minute, 5),
    validateRequest({ body: accountVerificationRequestSchema }),
    controller.requestVerification
  );
  router.post(
    '/auth/account-verification/confirm',
    authRateLimit(15 * minute, 10),
    validateRequest({ body: accountVerificationConfirmSchema }),
    controller.confirmAccount
  );
  router.post(
    '/auth/password/forgot',
    authRateLimit(60 * minute, 5),
    validateRequest({ body: forgotPasswordSchema }),
    controller.forgotPassword
  );
  router.post(
    '/auth/password/reset',
    authRateLimit(15 * minute, 5),
    validateRequest({ body: resetPasswordSchema }),
    controller.resetPassword
  );
  router.post(
    '/auth/password/verify',
    requireAuth,
    authRateLimit(15 * minute, 10),
    validateRequest({ body: verifyPasswordSchema }),
    controller.verifyPassword
  );
  router.get('/me', requireAuth, controller.getProfile);
  router.patch(
    '/me',
    requireAuth,
    validateRequest({ body: updateProfileSchema }),
    controller.updateProfile
  );

  return router;
};

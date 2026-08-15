import { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import {
  AccountVerificationConfirmInput,
  AccountVerificationRequestInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyPasswordInput,
} from './identity.schemas';
import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from './identity.cookies';
import {
  authenticatedUserId,
  requestContext,
} from './identity.middleware';
import { IdentityService } from './identity.service';

const validatedBody = <T>(req: Request): T => req.validated?.body as T;

export const createIdentityController = (service: IdentityService) => {
  const login: RequestHandler = async (req, res) => {
    const session = await service.login(
      validatedBody<LoginInput>(req),
      requestContext(req)
    );
    setRefreshCookie(res, session.refreshToken);
    return sendSuccess(
      req,
      res,
      { accessToken: session.accessToken, user: session.user },
      { message: 'Sesion iniciada' }
    );
  };

  const refresh: RequestHandler = async (req, res) => {
    try {
      const session = await service.refresh(
        getRefreshCookie(req),
        requestContext(req)
      );
      setRefreshCookie(res, session.refreshToken);
      return sendSuccess(
        req,
        res,
        { accessToken: session.accessToken, user: session.user },
        { message: 'Sesion renovada' }
      );
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  };

  const logout: RequestHandler = async (req, res) => {
    await service.logout(getRefreshCookie(req));
    clearRefreshCookie(res);
    return sendSuccess(req, res, null, { message: 'Sesion cerrada' });
  };

  const register: RequestHandler = async (req, res) => {
    await service.register(validatedBody<RegisterInput>(req));
    return sendSuccess(req, res, null, {
      message:
        'Si la solicitud es valida, recibiras instrucciones para activar la cuenta',
      statusCode: 202,
    });
  };

  const requestVerification: RequestHandler = async (req, res) => {
    await service.requestAccountVerification(
      validatedBody<AccountVerificationRequestInput>(req)
    );
    return sendSuccess(req, res, null, {
      message:
        'Si la cuenta requiere activacion, recibiras instrucciones por correo',
      statusCode: 202,
    });
  };

  const confirmAccount: RequestHandler = async (req, res) => {
    await service.confirmAccount(
      validatedBody<AccountVerificationConfirmInput>(req)
    );
    return sendSuccess(req, res, null, { message: 'Cuenta activada' });
  };

  const forgotPassword: RequestHandler = async (req, res) => {
    await service.forgotPassword(validatedBody<ForgotPasswordInput>(req));
    return sendSuccess(req, res, null, {
      message:
        'Si existe una cuenta asociada, recibiras instrucciones por correo',
      statusCode: 202,
    });
  };

  const resetPassword: RequestHandler = async (req, res) => {
    await service.resetPassword(validatedBody<ResetPasswordInput>(req));
    clearRefreshCookie(res);
    return sendSuccess(req, res, null, {
      message: 'Contrasena actualizada',
    });
  };

  const verifyPassword: RequestHandler = async (req, res) => {
    await service.verifyPassword(
      authenticatedUserId(req),
      validatedBody<VerifyPasswordInput>(req)
    );
    return sendSuccess(req, res, { valid: true }, {
      message: 'Contrasena verificada',
    });
  };

  const getProfile: RequestHandler = async (req, res) => {
    const profile = await service.getProfile(authenticatedUserId(req));
    return sendSuccess(req, res, profile, { message: 'Perfil obtenido' });
  };

  const updateProfile: RequestHandler = async (req, res) => {
    const profile = await service.updateProfile(
      authenticatedUserId(req),
      validatedBody<UpdateProfileInput>(req)
    );
    return sendSuccess(req, res, profile, { message: 'Perfil actualizado' });
  };

  return {
    confirmAccount,
    forgotPassword,
    getProfile,
    login,
    logout,
    refresh,
    register,
    requestVerification,
    resetPassword,
    updateProfile,
    verifyPassword,
  };
};

import { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import User from '../models/user.model';
import { generarJWT } from '../helpers/generar-jwt';
import { errorResponse, successResponse } from '../utils/response';
import Token from '../models/token.model';
import { sendEmail } from '../services/email.service';
import { accountConfirmationTemplate } from '../utils/email-templates/confirm-account.template';
import { accountActivatedTemplate } from '../utils/email-templates/activated-account.template';
import PasswordReset from '../models/password-reset.model';
import { resetPasswordTemplate } from '../utils/email-templates/reset-password.template';
import { clearRefreshCookie, createRefreshSession, getRefreshToken, revokeRefreshSession, revokeUserSessions, rotateRefreshSession, setRefreshCookie } from '../services/auth-session.service';
import { getRouteParam } from '../utils/route-param';
import { isGoogleCalendarConnected } from '../services/calendar-connection.service';

const PASSWORD_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 12 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
const normalizedEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

const issueSession = async (req: Request, res: Response, user: User) => {
  const accessToken = await generarJWT(user.id) as string;
  const refreshToken = await createRefreshSession(user.id, req);
  setRefreshCookie(res, refreshToken);
  return accessToken;
};

export const doLogin = async (req: Request, res: Response) => {
  const email = normalizedEmail(req.body.username);
  const password = req.body.password;
  if (!email || typeof password !== 'string') return errorResponse(res, 'Credenciales invalidas', 400);
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.status || !bcryptjs.compareSync(password, user.password)) return errorResponse(res, 'Credenciales invalidas', 401);
    const token = await issueSession(req, res, user);
    return successResponse(res, { user: user.toSafeJSON(await isGoogleCalendarConnected(user.id)), token }, 'Sesion iniciada correctamente');
  } catch (error) {
    console.error('Error in doLogin:', error);
    return errorResponse(res, 'Error del servidor', 500);
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const rotated = await rotateRefreshSession(getRefreshToken(req) || '', req);
    if (!rotated) {
      clearRefreshCookie(res);
      return errorResponse(res, 'Sesion no valida', 401);
    }
    const user = await User.findByPk(rotated.userId);
    if (!user || !user.status) return errorResponse(res, 'Sesion no valida', 401);
    setRefreshCookie(res, rotated.token);
    return successResponse(res, { token: await generarJWT(user.id), user: user.toSafeJSON(await isGoogleCalendarConnected(user.id)) }, 'Sesion renovada');
  } catch (error) {
    console.error('Error refreshing session:', error);
    return errorResponse(res, 'Error del servidor', 500);
  }
};

export const logout = async (req: Request, res: Response) => {
  await revokeRefreshSession(getRefreshToken(req));
  clearRefreshCookie(res);
  return successResponse(res, null, 'Sesion cerrada');
};

export const register = async (req: Request, res: Response) => {
  const { name, middle_name, last_name, date_of_birth, phone, avatar } = req.body;
  const email = normalizedEmail(req.body.email);
  const password = req.body.password;
  if (!name || !middle_name || !last_name || !email || !validPassword(password)) return errorResponse(res, 'Datos de registro invalidos', 400);
  try {
    if (await User.findOne({ where: { email } })) return errorResponse(res, 'No fue posible completar el registro', 400);
    const newUser = await User.create({ name, middle_name, last_name, date_of_birth, phone, avatar: avatar || '', email, password: bcryptjs.hashSync(password, PASSWORD_ROUNDS), status: false });
    const token = randomBytes(32).toString('hex');
    await Token.destroy({ where: { userId: newUser.id } });
    await Token.create({ userId: newUser.id, token: tokenHash(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    const confirmationUrl = `${process.env.BACKEND_URL}/api/auth/verify-account/${newUser.id}/${token}`;
    await sendEmail({ to: newUser.email || '', subject: 'Confirma tu cuenta en Odontofy', html: accountConfirmationTemplate(newUser.name, confirmationUrl) });
    return successResponse(res, newUser.toSafeJSON(), 'Usuario registrado correctamente. Revisa tu correo para confirmar tu cuenta.');
  } catch (error) {
    console.error('Error en register:', error);
    return errorResponse(res, 'Ocurrio un problema al registrar el usuario', 500);
  }
};

export const verifyPassword = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.authorUid);
  if (!user || typeof req.body.password !== 'string' || !bcryptjs.compareSync(req.body.password, user.password)) return errorResponse(res, 'Contrasena incorrecta', 400);
  return successResponse(res, null, 'Contrasena valida');
};

export const confirmAccount = async (req: Request, res: Response) => {
  const user = await User.findByPk(getRouteParam(req, 'userId'));
  if (!user) return errorResponse(res, 'Enlace no valido', 400);
  const tokenRecord = await Token.findOne({ where: { userId: user.id, token: tokenHash(getRouteParam(req, 'token')) } });
  if (!tokenRecord || tokenRecord.expiresAt < new Date()) return errorResponse(res, 'Enlace no valido o expirado', 400);
  user.status = true;
  await user.save();
  await Token.destroy({ where: { userId: user.id } });
  return res.send(accountActivatedTemplate(user.name));
};

export const forgotPassword = async (req: Request, res: Response) => {
  const email = normalizedEmail(req.body.email);
  const genericMessage = 'Si existe una cuenta asociada, recibira instrucciones por correo.';
  if (!email) return successResponse(res, genericMessage);
  try {
    const user = await User.findOne({ where: { email } });
    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      await PasswordReset.destroy({ where: { user_id: user.id, used: false } });
      await PasswordReset.create({ user_id: user.id, token: tokenHash(resetToken), expires_at: new Date(Date.now() + 60 * 60 * 1000) });
      const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({ to: user.email || '', subject: 'Restablece tu contrasena en Odontofy', html: resetPasswordTemplate(user.name, resetPasswordUrl) });
    }
    return successResponse(res, genericMessage);
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return successResponse(res, genericMessage);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || !validPassword(password)) return errorResponse(res, 'Solicitud no valida', 400);
  try {
    const reset = await PasswordReset.findOne({ where: { token: tokenHash(token), used: false } });
    if (!reset || reset.expires_at < new Date()) return errorResponse(res, 'Enlace no valido o expirado', 400);
    const user = await User.findByPk(reset.user_id);
    if (!user) return errorResponse(res, 'Enlace no valido o expirado', 400);
    const [updated] = await PasswordReset.update({ used: true }, { where: { id: reset.id, used: false } });
    if (!updated) return errorResponse(res, 'Enlace no valido o expirado', 400);
    user.password = bcryptjs.hashSync(password, PASSWORD_ROUNDS);
    await user.save();
    await revokeUserSessions(user.id);
    return successResponse(res, null, 'Contrasena actualizada correctamente');
  } catch (error) {
    console.error('Error resetting password:', error);
    return errorResponse(res, 'Error del servidor', 500);
  }
};

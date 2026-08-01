import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import AuthSession from '../models/auth-session.model';

const REFRESH_COOKIE = 'odontofy_refresh';
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const getRefreshToken = (req: Request): string | undefined => {
  const cookie = req.headers.cookie?.split(';').find((part) => part.trim().startsWith(`${REFRESH_COOKIE}=`));
  return cookie?.split('=').slice(1).join('=');
};

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth' });
};

export const createRefreshSession = async (userId: number, req: Request, familyId: string = randomUUID()) => {
  const token = randomBytes(48).toString('base64url');
  await AuthSession.create({
    user_id: userId,
    token_hash: hashToken(token),
    family_id: familyId,
    expires_at: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    user_agent: req.get('user-agent') || null,
    ip_address: req.ip || null
  });
  return token;
};

export const rotateRefreshSession = async (token: string, req: Request) => {
  const session = await AuthSession.findOne({ where: { token_hash: hashToken(token) } });
  if (!session || session.expires_at <= new Date()) return null;
  if (session.revoked_at) {
    await AuthSession.update({ revoked_at: new Date() }, { where: { family_id: session.family_id, revoked_at: null } });
    return null;
  }
  session.revoked_at = new Date();
  await session.save();
  return { userId: session.user_id, token: await createRefreshSession(session.user_id, req, session.family_id) };
};

export const revokeRefreshSession = async (token: string | undefined): Promise<void> => {
  if (token) await AuthSession.update({ revoked_at: new Date() }, { where: { token_hash: hashToken(token), revoked_at: null } });
};

export const revokeUserSessions = async (userId: number): Promise<void> => {
  await AuthSession.update({ revoked_at: new Date() }, { where: { user_id: userId, revoked_at: null } });
};

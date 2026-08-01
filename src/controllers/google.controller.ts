import { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { getGoogleOAuthClient } from '../googleOAuthClient';
import User from '../models/user.model';
import OAuthState from '../models/oauth-state.model';

const stateHash = (value: string) => createHash('sha256').update(value).digest('hex');

export const googleAuthInit = async (req: Request, res: Response) => {
  const state = randomBytes(32).toString('base64url');
  await OAuthState.create({ user_id: req.authorUid!, state_hash: stateHash(state), expires_at: new Date(Date.now() + 10 * 60 * 1000) });
  const url = getGoogleOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
    state
  });
  return res.json({ success: true, message: 'URL OAuth generada', data: { url }, errors: null });
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (typeof code !== 'string' || typeof state !== 'string') return res.status(400).send('Solicitud OAuth no valida.');
  const oauthState = await OAuthState.findOne({ where: { state_hash: stateHash(state), used_at: null } });
  if (!oauthState || oauthState.expires_at < new Date()) return res.status(400).send('Solicitud OAuth expirada o no valida.');
  oauthState.used_at = new Date();
  await oauthState.save();
  try {
    const { tokens } = await getGoogleOAuthClient().getToken(code);
    const user = await User.findByPk(oauthState.user_id);
    if (!user) return res.status(404).send('Usuario no encontrado.');
    await user.update({ google_access_token: tokens.access_token, google_refresh_token: tokens.refresh_token, google_token_expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null });
    return res.send(`<script>window.opener.postMessage('google_sync_success', ${JSON.stringify(process.env.FRONTEND_URL || '')});window.close();</script>`);
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return res.send(`<script>window.opener.postMessage('google_sync_error', ${JSON.stringify(process.env.FRONTEND_URL || '')});window.close();</script>`);
  }
};

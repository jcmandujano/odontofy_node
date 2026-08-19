import type { Request, Response } from 'express';

import { CalendarService } from '../modules/appointments/calendar.service';

const calendar = new CalendarService();
const target = () => process.env.FRONTEND_URL ?? 'http://localhost:4200';
const html = (message: 'google_sync_success' | 'google_sync_error') =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Odontofy</title></head><body><script>window.opener?.postMessage(${JSON.stringify(message)},${JSON.stringify(target())});window.close();</script></body></html>`;

export const googleAuthInit = async (req: Request, res: Response) => {
  const result = await calendar.authorization(req.authorUid!);
  return res.json({ success: true, message: 'URL OAuth generada', data: { url: result.authorizationUrl }, errors: null });
};

export const googleCallback = async (req: Request, res: Response) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const error = typeof req.query.error === 'string' ? req.query.error : undefined;
  try {
    if (state.length < 32) throw new Error('Invalid state');
    const result = await calendar.callback({ state, code, error });
    try {
      await calendar.synchronize(result.userId);
    } catch {
      // The durable outbox can be retried after the OAuth popup closes.
    }
    return res.set('Referrer-Policy', 'no-referrer').type('html').send(html('google_sync_success'));
  } catch {
    return res.set('Referrer-Policy', 'no-referrer').status(400).type('html').send(html('google_sync_error'));
  }
};

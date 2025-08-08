import { Request, Response } from 'express';
import { getGoogleOAuthClient } from '../googleOAuthClient';
import User from '../models/user.model';


export const googleAuthInit = (req: Request, res: Response) => {
  const oauth2Client = getGoogleOAuthClient();
  const { uid } = req.query;

  const scopes = ['https://www.googleapis.com/auth/calendar'];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: uid as string, // 👈 Incluimos el UID como "state" para que nos lo retorne el callback y actualizar el usuario dado un UID
  });

  console.log('URL de autorización de Google:', url);

  res.redirect(url);
};


export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query; // 👈 Aquí recibes el uid como "state"
  const oauth2Client = getGoogleOAuthClient();

  if (!code || !state) {
    return res.status(400).json({ error: 'Faltan parámetros en la respuesta de Google.' });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    const uid = parseInt(state as string, 10); // 👈 Este es el ID del usuario
    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await user.update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });

    res.send(`
      <script>
        window.opener.postMessage("google_sync_success", "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error('Error al obtener los tokens de Google:', err);
    res.send(`
      <script>
        window.opener.postMessage("google_sync_error", "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
  }
};

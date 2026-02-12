/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import User from '../models/user.model';
import Appointment from '../models/appointment.model';
import { getGoogleOAuthClient } from '../googleOAuthClient';

// Metodo para listar eventos de Google Calendar
export const listGoogleCalendarEvents = async (oauth2Client: any, from: string, to: string, timeZone: string = "America/Mexico_City" ) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: from,
    timeMax: to,
    timeZone: timeZone,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return response.data.items || [];
};



// Metodo para crear un evento en Google Calendar
export const createGoogleCalendarEvent = async (
  oauth2Client: any,
  appointment: Appointment
) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: appointment.reason || `Cita con paciente ID ${appointment.patient_id}`,
    description: appointment.note || 'Cita programada desde Odontofy',
    start: {
      //setting field appointment_datetime 
      dateTime:  new Date(appointment.appointment_datetime!).toISOString(),
      timeZone: 'America/Mexico_City', // ajusta según necesidad
    },
    end: {
      //setting field appointment_datetime 
       dateTime:  new Date(appointment.appointment_end_datetime!).toISOString(),
      timeZone: 'America/Mexico_City',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  console.log('Created Google Calendar event:', response.data);

  return response.data.id;
};

//metodo para actualizar un evento en Google Calendar
export const updateGoogleCalendarEvent = async (
  oauth2Client: any,
  eventId: string,
  appointment: any
) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: appointment.reason || `Cita con paciente ID ${appointment.patient_id}`,
    description: appointment.note || 'Cita programada desde Odontofy',
    start: {
      dateTime:  new Date(appointment.appointment_datetime!).toISOString(),
      timeZone: 'America/Mexico_City',
    },
    end: {
      dateTime:  new Date(appointment.appointment_end_datetime!).toISOString(),
      timeZone: 'America/Mexico_City',
    },
  };

  await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  });
};

export const deleteGoogleCalendarEvent = async (
  oauth2Client: any,
  eventId: string
) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
};


export const getAuthorizedGoogleClient = async (userId: number) => {
  const user = await User.findByPk(userId);

  if (!user || !user.google_access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  return oauth2Client;
};

/**
 * Retorna un cliente OAuth2 válido, renovando el access_token si expiró.
 */
export const getValidGoogleClient = async (userId: number) => {
  const user = await User.findByPk(userId);
  if (!user || !user.google_refresh_token) {
    throw new Error('Usuario no vinculado con Google.');
  }
  console.log('User Google Token Expiry Date:', typeof user.google_token_expiry_date);
  const googleTokenExpiryDate = new Date(user.google_token_expiry_date || 0);
  console.log('Parsed Google Token Expiry Date:', googleTokenExpiryDate.getTime());
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date: googleTokenExpiryDate.getTime(),
  });

  // Verifica si el token está vencido
  const isExpired =
    !user.google_token_expiry_date ||
    googleTokenExpiryDate.getTime() < Date.now();

  if (isExpired) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await user.update({
        google_access_token: credentials.access_token,
        google_token_expiry_date: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      });
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error('Error al renovar el access_token:', err);
      throw new Error('No se pudo renovar el access_token');
    }
  }

  return oauth2Client;
};
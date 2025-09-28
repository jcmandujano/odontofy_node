/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import User from '../models/user.model';
import Appointment from '../models/appointment.model';

// Metodo para listar eventos de Google Calendar
export const listGoogleCalendarEvents = async (oauth2Client: any, from: string, to: string) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: from,
    timeMax: to,
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
    summary: `Cita con paciente ID ${appointment.patient_id}`,
    description: appointment.note || 'Cita programada desde Odontofy',
    start: {
      dateTime: new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).toISOString(),
      timeZone: 'America/Mexico_City', // ajusta según necesidad
    },
    end: {
      dateTime: new Date(new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).getTime() + 30 * 60000).toISOString(), // 30 min
      timeZone: 'America/Mexico_City',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

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
    summary: `Cita con paciente ID ${appointment.patient_id}`,
    description: appointment.note || 'Cita programada desde Odontofy',
    start: {
      dateTime: new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).toISOString(),
      timeZone: 'America/Mexico_City',
    },
    end: {
      dateTime: new Date(new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).getTime() + 30 * 60000).toISOString(),
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

import type { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import type {
  AppointmentParams,
  CalendarCallbackQuery,
  CreateAppointmentInput,
  ExternalEventsQuery,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from './appointment.schemas';
import { AppointmentService } from './appointment.service';
import { CalendarService } from './calendar.service';

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T =>
  req.validated?.[target] as T;

const callbackHtml = (success: boolean) => {
  const target = process.env.FRONTEND_URL ?? 'http://localhost:4200';
  const message = success ? 'google_sync_success' : 'google_sync_error';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Odontofy</title></head><body><script>window.opener?.postMessage(${JSON.stringify(message)},${JSON.stringify(target)});window.close();</script></body></html>`;
};

export const createAppointmentController = (
  appointments: AppointmentService,
  calendar: CalendarService
) => {
  const list: RequestHandler = async (req, res) => {
    const result = await appointments.list(authenticatedUserId(req), validated<ListAppointmentsQuery>(req, 'query'));
    return sendSuccess(req, res, result.appointments, { message: 'Citas obtenidas', meta: { pagination: result.pagination } });
  };
  const get: RequestHandler = async (req, res) => {
    const result = await appointments.get(authenticatedUserId(req), validated<AppointmentParams>(req, 'params').appointmentId);
    return sendSuccess(req, res, result, { message: 'Cita obtenida' });
  };
  const create: RequestHandler = async (req, res) => {
    const result = await appointments.create(authenticatedUserId(req), validated<CreateAppointmentInput>(req, 'body'));
    return sendSuccess(req, res, result, { message: 'Cita creada', statusCode: 201 });
  };
  const update: RequestHandler = async (req, res) => {
    const result = await appointments.update(authenticatedUserId(req), validated<AppointmentParams>(req, 'params').appointmentId, validated<UpdateAppointmentInput>(req, 'body'));
    return sendSuccess(req, res, result, { message: 'Cita actualizada' });
  };
  const status: RequestHandler = async (req, res) => {
    const result = await appointments.setStatus(authenticatedUserId(req), validated<AppointmentParams>(req, 'params').appointmentId, validated<UpdateAppointmentStatusInput>(req, 'body').status);
    return sendSuccess(req, res, result, { message: 'Estado de cita actualizado' });
  };
  const cancel: RequestHandler = async (req, res) => {
    const result = await appointments.cancel(authenticatedUserId(req), validated<AppointmentParams>(req, 'params').appointmentId);
    return sendSuccess(req, res, result, { message: 'Cita cancelada' });
  };
  const connection: RequestHandler = async (req, res) =>
    sendSuccess(req, res, await calendar.status(authenticatedUserId(req)), { message: 'Conexion de calendario obtenida' });
  const authorization: RequestHandler = async (req, res) =>
    sendSuccess(req, res, await calendar.authorization(authenticatedUserId(req)), { message: 'Autorizacion de Google iniciada' });
  const callback: RequestHandler = async (req, res, next) => {
    try {
      await calendar.callback(validated<CalendarCallbackQuery>(req, 'query'));
      res.set('Referrer-Policy', 'no-referrer').type('html').send(callbackHtml(true));
    } catch (error) {
      if (req.accepts('html')) {
        res.set('Referrer-Policy', 'no-referrer').status(400).type('html').send(callbackHtml(false));
        return;
      }
      next(error);
    }
  };
  const disconnect: RequestHandler = async (req, res) => {
    await calendar.disconnect(authenticatedUserId(req));
    return sendSuccess(req, res, null, { message: 'Google Calendar desconectado' });
  };
  const synchronize: RequestHandler = async (req, res) =>
    sendSuccess(req, res, await calendar.synchronize(authenticatedUserId(req)), { message: 'Sincronizacion procesada' });
  const externalEvents: RequestHandler = async (req, res) =>
    sendSuccess(req, res, await calendar.externalEvents(authenticatedUserId(req), validated<ExternalEventsQuery>(req, 'query')), { message: 'Eventos externos obtenidos' });

  return { authorization, callback, cancel, connection, create, disconnect, externalEvents, get, list, status, synchronize, update };
};

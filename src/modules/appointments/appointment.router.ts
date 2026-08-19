import { Router } from 'express';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import { IdentityService } from '../identity/identity.service';
import { createAppointmentController } from './appointment.controller';
import { appointmentErrorHandler } from './appointment.middleware';
import {
  appointmentParamsSchema,
  calendarCallbackQuerySchema,
  createAppointmentSchema,
  externalEventsQuerySchema,
  listAppointmentsQuerySchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from './appointment.schemas';
import { AppointmentService, AppointmentServiceDependencies } from './appointment.service';
import { CalendarService, CalendarServiceDependencies } from './calendar.service';

export interface AppointmentModuleDependencies {
  appointments?: AppointmentServiceDependencies;
  calendar?: CalendarServiceDependencies;
}

export const createAppointmentRouter = (
  identityService: IdentityService,
  dependencies: AppointmentModuleDependencies = {}
) => {
  const router = Router();
  const appointments = new AppointmentService(dependencies.appointments);
  const calendar = new CalendarService(dependencies.calendar);
  const controller = createAppointmentController(appointments, calendar);

  router.get('/calendar/google/callback', validateRequest({ query: calendarCallbackQuerySchema }), controller.callback);
  router.use(
    [
      '/appointments',
      '/calendar/connection',
      '/calendar/sync',
      '/calendar/external-events',
    ],
    noStore,
    authenticate(identityService)
  );
  router.get('/appointments', validateRequest({ query: listAppointmentsQuerySchema }), controller.list);
  router.post('/appointments', validateRequest({ body: createAppointmentSchema }), controller.create);
  router.get('/appointments/:appointmentId', validateRequest({ params: appointmentParamsSchema }), controller.get);
  router.patch('/appointments/:appointmentId', validateRequest({ params: appointmentParamsSchema, body: updateAppointmentSchema }), controller.update);
  router.patch('/appointments/:appointmentId/status', validateRequest({ params: appointmentParamsSchema, body: updateAppointmentStatusSchema }), controller.status);
  router.delete('/appointments/:appointmentId', validateRequest({ params: appointmentParamsSchema }), controller.cancel);
  router.get('/calendar/connection', controller.connection);
  router.post('/calendar/connection/authorization', controller.authorization);
  router.delete('/calendar/connection', controller.disconnect);
  router.post('/calendar/sync', controller.synchronize);
  router.get('/calendar/external-events', validateRequest({ query: externalEventsQuerySchema }), controller.externalEvents);

  router.use(appointmentErrorHandler);
  return router;
};

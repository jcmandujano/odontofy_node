import type { ErrorRequestHandler } from 'express';

import { ApiError } from '../../platform/http/api-error';
import { AppointmentError } from './appointment.types';

const statusFor = (code: AppointmentError['code']) => {
  if (code === 'APPOINTMENT_NOT_FOUND' || code === 'PATIENT_NOT_FOUND') return 404;
  if (code === 'APPOINTMENT_CANCELLED') return 409;
  if (code === 'CALENDAR_NOT_CONNECTED' || code === 'CALENDAR_REAUTH_REQUIRED') return 409;
  if (code === 'CALENDAR_PROVIDER_UNAVAILABLE') return 503;
  if (code.startsWith('CALENDAR_OAUTH_')) return 400;
  return 422;
};

export const appointmentErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof AppointmentError)) {
    next(error);
    return;
  }
  next(new ApiError({ code: error.code, message: error.message, statusCode: statusFor(error.code) }));
};

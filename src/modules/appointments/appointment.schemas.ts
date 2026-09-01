import { z } from 'zod';

import { APPOINTMENT_STATUSES } from '../../types/appointment.enums';

const id = z.coerce.number().int().positive().max(4_294_967_295);
const nullableText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .transform((value) => value === '' ? null : value);
const dateTime = z.iso.datetime({ offset: true });
const timeZone = z.string().trim().min(1).max(64).refine((value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Zona horaria IANA invalida');

const appointmentRange = (
  value: { startsAt?: string; endsAt?: string },
  context: z.RefinementCtx
) => {
  if (
    value.startsAt &&
    value.endsAt &&
    new Date(value.startsAt).getTime() >= new Date(value.endsAt).getTime()
  ) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'endsAt debe ser posterior a startsAt',
    });
  }
};

export const appointmentParamsSchema = z.strictObject({ appointmentId: id });

export const createAppointmentSchema = z
  .strictObject({
    patientId: id,
    startsAt: dateTime,
    endsAt: dateTime,
    timeZone,
    reason: nullableText(255).optional().default(null),
    note: nullableText(10_000).optional().default(null),
  })
  .superRefine(appointmentRange);

export const updateAppointmentSchema = z
  .strictObject({
    patientId: id.optional(),
    startsAt: dateTime.optional(),
    endsAt: dateTime.optional(),
    timeZone: timeZone.optional(),
    reason: nullableText(255).optional(),
    note: nullableText(10_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  })
  .superRefine(appointmentRange);

export const updateAppointmentStatusSchema = z.strictObject({
  status: z.enum(APPOINTMENT_STATUSES),
});

export const listAppointmentsQuerySchema = z
  .strictObject({
    from: dateTime,
    to: dateTime,
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    patientId: id.optional(),
    status: z
      .union([z.enum(APPOINTMENT_STATUSES), z.literal('active'), z.literal('all')])
      .default('active'),
  })
  .superRefine((value, context) => {
    if (new Date(value.from).getTime() >= new Date(value.to).getTime()) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'to debe ser posterior a from' });
      return;
    }
    if (new Date(value.to).getTime() - new Date(value.from).getTime() > 366 * 86_400_000) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'El rango maximo es de 366 dias' });
    }
  });

export const externalEventsQuerySchema = z
  .strictObject({ from: dateTime, to: dateTime, timeZone })
  .refine(
    (value) =>
      new Date(value.from).getTime() < new Date(value.to).getTime(),
    {
    path: ['to'],
    message: 'to debe ser posterior a from',
    }
  );

// OAuth providers can append informational callback parameters (for example,
// Google sends `iss`, `scope`, `authuser` and `prompt`). Only the values below
// affect the authorization flow; unknown parameters are intentionally ignored.
export const calendarCallbackQuerySchema = z
  .object({
    code: z.string().trim().min(1).max(4096).optional(),
    state: z.string().trim().min(32).max(1024),
    error: z.string().trim().max(255).optional(),
  })
  .passthrough();

export type AppointmentParams = z.infer<typeof appointmentParamsSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type ExternalEventsQuery = z.infer<typeof externalEventsQuerySchema>;
export type CalendarCallbackQuery = z.infer<typeof calendarCallbackQuerySchema>;

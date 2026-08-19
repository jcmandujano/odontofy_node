import type { Request, Response } from 'express';
import moment from 'moment-timezone';

import { AppointmentService } from '../modules/appointments/appointment.service';
import { CalendarService } from '../modules/appointments/calendar.service';
import type { AppointmentStatus } from '../models/appointment.model';
import { errorResponse, successResponse } from '../utils/response';

const appointments = new AppointmentService();
const calendar = new CalendarService();
const userId = (req: Request) => req.authorUid ?? 0;
const synchronizeLegacy = async (ownerId: number) => {
  try {
    await calendar.synchronize(ownerId);
  } catch {
    // The local write already committed and the outbox remains retryable.
  }
};

interface LegacyCompatibleAppointment {
  id: number;
  patientId: number | null;
  patient: { id: number; name: string; lastName: string } | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  note: string | null;
}

const legacy = (value: LegacyCompatibleAppointment) => ({
  id: value.id,
  patient_id: value.patientId,
  appointment_datetime: value.startsAt,
  appointment_end_datetime: value.endsAt,
  status: value.status,
  reason: value.reason,
  note: value.note,
  google_event_id: null,
  source: 'local',
  Patient: value.patient
    ? { id: value.patient.id, name: `${value.patient.name} ${value.patient.lastName}`.trim() }
    : null,
});

const status = (value: unknown): AppointmentStatus => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'confirmada' || normalized === 'confirmed') return 'CONFIRMED';
  if (normalized === 'completada' || normalized === 'completed') return 'COMPLETED';
  if (normalized === 'cancelada' || normalized === 'cancelled') return 'CANCELLED';
  if (normalized === 'no_show') return 'NO_SHOW';
  return 'SCHEDULED';
};

const input = (body: Record<string, unknown>) => {
  const startsAt = new Date(String(body.appointment_datetime));
  const requestedEnd = body.appointment_end_datetime
    ? new Date(String(body.appointment_end_datetime))
    : new Date(startsAt.getTime() + 60 * 60_000);
  return {
    patientId: Number(body.patient_id),
    startsAt: startsAt.toISOString(),
    endsAt: requestedEnd.toISOString(),
    timeZone: String(body.time_zone ?? 'America/Mexico_City'),
    reason: body.reason == null ? null : String(body.reason),
    note: body.note == null ? null : String(body.note),
  };
};

export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      return errorResponse(res, 'El rango de busqueda no es correcto', 400);
    }
    const timeZone = typeof req.query.timezone === 'string' ? req.query.timezone : 'America/Mexico_City';
    if (!moment.tz.zone(timeZone)) return errorResponse(res, 'Timezone no valido', 400);
    const from = moment.tz(startDate, timeZone).startOf('day').toISOString();
    const to = moment.tz(endDate, timeZone).endOf('day').toISOString();
    const local = await appointments.list(userId(req), { from, to, page: 1, pageSize: 100, status: 'all' });
    const values: Array<Record<string, unknown>> = local.appointments.map(legacy);
    try {
      const external = await calendar.externalEvents(userId(req), { from, to, timeZone });
      values.push(...external.map((event) => ({
        id: null,
        patient_id: null,
        appointment_datetime: event.startsAt,
        appointment_end_datetime: event.endsAt,
        status: '',
        reason: event.summary,
        note: null,
        google_event_id: event.id,
        source: 'google',
        Patient: { id: null, name: event.summary ?? 'Evento de Google' },
      })));
    } catch {
      // The legacy agenda remains available when the external provider is unavailable.
    }
    return successResponse(res, values, 'Appointments fetched successfully');
  } catch {
    return errorResponse(res, 'Error al obtener citas', 500);
  }
};

export const getAppointment = async (req: Request, res: Response) => {
  try {
    return successResponse(res, legacy(await appointments.get(userId(req), Number(req.params.id))), 'Appointment found');
  } catch {
    return errorResponse(res, 'Appointment not found', 404);
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const created = await appointments.create(userId(req), input(req.body));
    await synchronizeLegacy(userId(req));
    return successResponse(res, legacy(created), 'Appointment created successfully', 201);
  } catch {
    return errorResponse(res, 'No fue posible crear la cita', 400);
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const updated = await appointments.update(userId(req), Number(req.params.id), input(req.body));
    const desiredStatus = status(req.body.status);
    const result = desiredStatus !== updated.status
      ? await appointments.setStatus(userId(req), updated.id, desiredStatus)
      : updated;
    await synchronizeLegacy(userId(req));
    return successResponse(res, legacy(result), 'Appointment updated successfully');
  } catch {
    return errorResponse(res, 'No fue posible actualizar la cita', 400);
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    await appointments.cancel(userId(req), Number(req.params.id));
    await synchronizeLegacy(userId(req));
    return successResponse(res, {}, 'Appointment deleted successfully');
  } catch {
    return errorResponse(res, 'Appointment not found', 404);
  }
};

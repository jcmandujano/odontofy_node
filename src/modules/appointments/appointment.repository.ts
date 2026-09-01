import { Op, Transaction, WhereOptions } from 'sequelize';

import db from '../../db/connection';
import Appointment from '../../models/appointment.model';
import CalendarConnection from '../../models/calendar-connection.model';
import CalendarSyncJob from '../../models/calendar-sync-job.model';
import Patient from '../../models/patient.model';
import type { AppointmentStatus } from '../../types/appointment.enums';
import {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from './appointment.schemas';
import {
  AppointmentData,
  AppointmentError,
  AppointmentPage,
} from './appointment.types';

const mapAppointment = (appointment: Appointment): AppointmentData => ({
  id: appointment.id,
  patientId: appointment.patient_id,
  patient: appointment.Patient
    ? {
        id: appointment.Patient.id,
        name: appointment.Patient.name,
        lastName: appointment.Patient.last_name,
      }
    : null,
  startsAt: appointment.appointment_datetime,
  endsAt: appointment.appointment_end_datetime,
  timeZone: appointment.time_zone,
  status: appointment.status,
  reason: appointment.reason,
  note: appointment.note,
  cancelledAt: appointment.cancelled_at,
  sync: {
    status: appointment.sync_status,
    version: appointment.sync_version,
    syncedAt: appointment.synced_at,
    errorCode: appointment.sync_error_code,
  },
  createdAt: appointment.createdAt,
  updatedAt: appointment.updatedAt,
});

const includePatient = [{ model: Patient, attributes: ['id', 'name', 'last_name'] }];

const requirePatient = async (
  userId: number,
  patientId: number,
  transaction: Transaction
) => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
  });
  if (!patient) {
    throw new AppointmentError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
  }
};

const enqueue = async (
  appointment: Appointment,
  operation: 'UPSERT' | 'DELETE',
  transaction: Transaction
) => {
  const connected = await CalendarConnection.count({
    where: { user_id: appointment.user_id, status: 'ACTIVE' },
    transaction,
  });
  if (!connected) {
    await CalendarSyncJob.destroy({
      where: { appointment_id: appointment.id },
      transaction,
    });
    await appointment.update(
      { sync_status: 'NOT_CONNECTED', sync_error_code: null },
      { transaction }
    );
    return;
  }

  await appointment.update(
    { sync_status: 'PENDING', sync_error_code: null },
    { transaction }
  );
  const existing = await CalendarSyncJob.findOne({
    where: { appointment_id: appointment.id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const values = {
    user_id: appointment.user_id,
    operation,
    version: appointment.sync_version,
    attempts: 0,
    available_at: new Date(),
    locked_at: null,
    processed_at: null,
    last_error_code: null,
  } as const;
  if (existing) await existing.update(values, { transaction });
  else {
    await CalendarSyncJob.create(
      { ...values, appointment_id: appointment.id },
      { transaction }
    );
  }
};

export interface AppointmentRepository {
  list(userId: number, query: ListAppointmentsQuery): Promise<AppointmentPage>;
  findById(userId: number, appointmentId: number): Promise<AppointmentData | null>;
  create(userId: number, input: CreateAppointmentInput): Promise<AppointmentData>;
  update(userId: number, appointmentId: number, input: UpdateAppointmentInput): Promise<AppointmentData>;
  setStatus(userId: number, appointmentId: number, status: AppointmentStatus): Promise<AppointmentData>;
}

export class SequelizeAppointmentRepository implements AppointmentRepository {
  async list(userId: number, query: ListAppointmentsQuery): Promise<AppointmentPage> {
    const where: WhereOptions = {
      user_id: userId,
      appointment_datetime: { [Op.lt]: new Date(query.to) },
      appointment_end_datetime: { [Op.gt]: new Date(query.from) },
      ...(query.patientId && { patient_id: query.patientId }),
      ...(query.status === 'active'
        ? { status: { [Op.ne]: 'CANCELLED' } }
        : query.status !== 'all' && { status: query.status }),
    };
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: includePatient,
      distinct: true,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['appointment_datetime', 'ASC'], ['id', 'ASC']],
    });
    return { appointments: rows.map(mapAppointment), total: count };
  }

  async findById(userId: number, appointmentId: number) {
    const appointment = await Appointment.findOne({
      where: { id: appointmentId, user_id: userId },
      include: includePatient,
    });
    return appointment ? mapAppointment(appointment) : null;
  }

  async create(userId: number, input: CreateAppointmentInput) {
    let id = 0;
    await db.transaction(async (transaction) => {
      await requirePatient(userId, input.patientId, transaction);
      const appointment = await Appointment.create(
        {
          user_id: userId,
          patient_id: input.patientId,
          appointment_datetime: new Date(input.startsAt),
          appointment_end_datetime: new Date(input.endsAt),
          time_zone: input.timeZone,
          status: 'SCHEDULED',
          reason: input.reason,
          note: input.note,
        },
        { transaction }
      );
      id = appointment.id;
      await enqueue(appointment, 'UPSERT', transaction);
    });
    return (await this.findById(userId, id))!;
  }

  async update(userId: number, appointmentId: number, input: UpdateAppointmentInput) {
    await db.transaction(async (transaction) => {
      const appointment = await this.lock(userId, appointmentId, transaction);
      if (appointment.status === 'CANCELLED') {
        throw new AppointmentError('APPOINTMENT_CANCELLED', 'Una cita cancelada no puede modificarse');
      }
      if (input.patientId !== undefined) await requirePatient(userId, input.patientId, transaction);
      const startsAt = input.startsAt ? new Date(input.startsAt) : appointment.appointment_datetime;
      const endsAt = input.endsAt ? new Date(input.endsAt) : appointment.appointment_end_datetime;
      if (startsAt >= endsAt) {
        throw new AppointmentError('APPOINTMENT_INVALID_RANGE', 'El fin debe ser posterior al inicio');
      }
      await appointment.update(
        {
          ...(input.patientId !== undefined && { patient_id: input.patientId }),
          ...(input.startsAt !== undefined && { appointment_datetime: startsAt }),
          ...(input.endsAt !== undefined && { appointment_end_datetime: endsAt }),
          ...(input.timeZone !== undefined && { time_zone: input.timeZone }),
          ...(input.reason !== undefined && { reason: input.reason }),
          ...(input.note !== undefined && { note: input.note }),
          sync_version: appointment.sync_version + 1,
        },
        { transaction }
      );
      await enqueue(appointment, 'UPSERT', transaction);
    });
    return (await this.findById(userId, appointmentId))!;
  }

  async setStatus(userId: number, appointmentId: number, status: AppointmentStatus) {
    await db.transaction(async (transaction) => {
      const appointment = await this.lock(userId, appointmentId, transaction);
      if (appointment.status === 'CANCELLED') {
        if (status === 'CANCELLED') return;
        throw new AppointmentError('APPOINTMENT_CANCELLED', 'Una cita cancelada no puede reactivarse');
      }
      await appointment.update(
        {
          status,
          cancelled_at: status === 'CANCELLED' ? new Date() : null,
          sync_version: appointment.sync_version + 1,
        },
        { transaction }
      );
      await enqueue(appointment, status === 'CANCELLED' ? 'DELETE' : 'UPSERT', transaction);
    });
    return (await this.findById(userId, appointmentId))!;
  }

  private async lock(userId: number, appointmentId: number, transaction: Transaction) {
    const appointment = await Appointment.findOne({
      where: { id: appointmentId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!appointment) throw new AppointmentError('APPOINTMENT_NOT_FOUND', 'Cita no encontrada');
    return appointment;
  }
}

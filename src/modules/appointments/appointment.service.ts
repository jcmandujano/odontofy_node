import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from './appointment.schemas';
import {
  AppointmentRepository,
  SequelizeAppointmentRepository,
} from './appointment.repository';
import type { AppointmentData } from './appointment.types';
import { AppointmentError } from './appointment.types';
import type { AppointmentStatus } from '../../models/appointment.model';

const serialize = (appointment: AppointmentData) => ({
  ...appointment,
  startsAt: appointment.startsAt.toISOString(),
  endsAt: appointment.endsAt.toISOString(),
  cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
  sync: {
    ...appointment.sync,
    syncedAt: appointment.sync.syncedAt?.toISOString() ?? null,
  },
  createdAt: appointment.createdAt.toISOString(),
  updatedAt: appointment.updatedAt.toISOString(),
});

export interface AppointmentServiceDependencies {
  repository?: AppointmentRepository;
}

export class AppointmentService {
  private readonly repository: AppointmentRepository;

  constructor(dependencies: AppointmentServiceDependencies = {}) {
    this.repository = dependencies.repository ?? new SequelizeAppointmentRepository();
  }

  async list(userId: number, query: ListAppointmentsQuery) {
    const result = await this.repository.list(userId, query);
    return {
      appointments: result.appointments.map(serialize),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    };
  }

  async get(userId: number, appointmentId: number) {
    const appointment = await this.repository.findById(userId, appointmentId);
    if (!appointment) throw this.notFound();
    return serialize(appointment);
  }

  async create(userId: number, input: CreateAppointmentInput) {
    return serialize(await this.repository.create(userId, input));
  }

  async update(userId: number, appointmentId: number, input: UpdateAppointmentInput) {
    return serialize(await this.repository.update(userId, appointmentId, input));
  }

  async setStatus(userId: number, appointmentId: number, status: AppointmentStatus) {
    return serialize(await this.repository.setStatus(userId, appointmentId, status));
  }

  cancel(userId: number, appointmentId: number) {
    return this.setStatus(userId, appointmentId, 'CANCELLED');
  }

  private notFound() {
    return new AppointmentError('APPOINTMENT_NOT_FOUND', 'Cita no encontrada');
  }
}

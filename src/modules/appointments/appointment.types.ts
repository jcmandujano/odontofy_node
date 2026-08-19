import type {
  AppointmentStatus,
  AppointmentSyncStatus,
} from '../../models/appointment.model';

export interface AppointmentData {
  id: number;
  patientId: number | null;
  patient: { id: number; name: string; lastName: string } | null;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  status: AppointmentStatus;
  reason: string | null;
  note: string | null;
  cancelledAt: Date | null;
  sync: {
    status: AppointmentSyncStatus;
    version: number;
    syncedAt: Date | null;
    errorCode: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentPage {
  appointments: AppointmentData[];
  total: number;
}

export type AppointmentErrorCode =
  | 'APPOINTMENT_NOT_FOUND'
  | 'APPOINTMENT_INVALID_RANGE'
  | 'APPOINTMENT_CANCELLED'
  | 'PATIENT_NOT_FOUND'
  | 'CALENDAR_NOT_CONNECTED'
  | 'CALENDAR_REAUTH_REQUIRED'
  | 'CALENDAR_PROVIDER_UNAVAILABLE'
  | 'CALENDAR_OAUTH_DENIED'
  | 'CALENDAR_OAUTH_STATE_INVALID'
  | 'CALENDAR_OAUTH_TOKEN_MISSING'
  | 'CALENDAR_CONFIGURATION_INVALID';

export class AppointmentError extends Error {
  constructor(
    readonly code: AppointmentErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AppointmentError';
  }
}

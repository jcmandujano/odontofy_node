export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export const APPOINTMENT_SYNC_STATUSES = [
  'NOT_CONNECTED',
  'PENDING',
  'SYNCED',
  'FAILED',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentSyncStatus = (typeof APPOINTMENT_SYNC_STATUSES)[number];

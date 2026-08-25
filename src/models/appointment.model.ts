import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_SYNC_STATUSES,
  AppointmentStatus,
  AppointmentSyncStatus,
} from '../types/appointment.enums';
import Patient from './patient.model';

interface AppointmentAttributes {
  id: number;
  user_id: number;
  patient_id: number | null;
  appointment_datetime: Date;
  appointment_end_datetime: Date;
  time_zone: string;
  status: AppointmentStatus;
  reason: string | null;
  note: string | null;
  cancelled_at: Date | null;
  google_event_id: string | null;
  external_etag: string | null;
  source: 'local' | 'google';
  sync_status: AppointmentSyncStatus;
  sync_version: number;
  synced_at: Date | null;
  sync_error_code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AppointmentCreationAttributes = Optional<
  AppointmentAttributes,
  | 'id'
  | 'cancelled_at'
  | 'google_event_id'
  | 'external_etag'
  | 'note'
  | 'reason'
  | 'source'
  | 'sync_error_code'
  | 'sync_status'
  | 'sync_version'
  | 'synced_at'
  | 'createdAt'
  | 'updatedAt'
>;

class Appointment
  extends Model<AppointmentAttributes, AppointmentCreationAttributes>
  implements AppointmentAttributes
{
  id!: number;
  user_id!: number;
  patient_id!: number | null;
  appointment_datetime!: Date;
  appointment_end_datetime!: Date;
  time_zone!: string;
  status!: AppointmentStatus;
  reason!: string | null;
  note!: string | null;
  cancelled_at!: Date | null;
  google_event_id!: string | null;
  external_etag!: string | null;
  source!: 'local' | 'google';
  sync_status!: AppointmentSyncStatus;
  sync_version!: number;
  synced_at!: Date | null;
  sync_error_code!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  Patient?: Patient;
}

Appointment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    appointment_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'starts_at',
    },
    appointment_end_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ends_at',
    },
    time_zone: { type: DataTypes.STRING(64), allowNull: false },
    status: {
      type: DataTypes.ENUM(...APPOINTMENT_STATUSES),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    google_event_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'external_event_id',
    },
    external_etag: { type: DataTypes.STRING(255), allowNull: true },
    source: {
      type: DataTypes.ENUM('local', 'google'),
      allowNull: false,
      defaultValue: 'local',
    },
    sync_status: {
      type: DataTypes.ENUM(...APPOINTMENT_SYNC_STATUSES),
      allowNull: false,
      defaultValue: 'NOT_CONNECTED',
    },
    sync_version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    synced_at: { type: DataTypes.DATE, allowNull: true },
    sync_error_code: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  { sequelize: db, tableName: 'appointments', timestamps: true }
);

Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });

export default Appointment;

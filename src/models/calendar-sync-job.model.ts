import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';

interface CalendarSyncJobAttributes {
  id: number;
  user_id: number;
  appointment_id: number;
  operation: 'UPSERT' | 'DELETE';
  version: number;
  attempts: number;
  available_at: Date;
  locked_at: Date | null;
  processed_at: Date | null;
  last_error_code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CalendarSyncJobCreation = Optional<
  CalendarSyncJobAttributes,
  'id' | 'attempts' | 'locked_at' | 'processed_at' | 'last_error_code' | 'createdAt' | 'updatedAt'
>;

class CalendarSyncJob
  extends Model<CalendarSyncJobAttributes, CalendarSyncJobCreation>
  implements CalendarSyncJobAttributes
{
  id!: number;
  user_id!: number;
  appointment_id!: number;
  operation!: 'UPSERT' | 'DELETE';
  version!: number;
  attempts!: number;
  available_at!: Date;
  locked_at!: Date | null;
  processed_at!: Date | null;
  last_error_code!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

CalendarSyncJob.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    operation: { type: DataTypes.ENUM('UPSERT', 'DELETE'), allowNull: false },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    available_at: { type: DataTypes.DATE, allowNull: false },
    locked_at: { type: DataTypes.DATE, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    last_error_code: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  { sequelize: db, tableName: 'calendar_sync_jobs', timestamps: true }
);

export default CalendarSyncJob;

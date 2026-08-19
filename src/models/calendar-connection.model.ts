import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';

export type CalendarConnectionStatus =
  | 'ACTIVE'
  | 'REAUTH_REQUIRED'
  | 'DISCONNECTED';

interface CalendarConnectionAttributes {
  id: number;
  user_id: number;
  provider: 'GOOGLE';
  encrypted_refresh_token: string;
  token_key_version: number;
  calendar_id: string;
  scopes: string[];
  status: CalendarConnectionStatus;
  connected_at: Date;
  disconnected_at: Date | null;
  last_sync_at: Date | null;
  last_error_code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CalendarConnectionCreation = Optional<
  CalendarConnectionAttributes,
  | 'id'
  | 'provider'
  | 'token_key_version'
  | 'calendar_id'
  | 'status'
  | 'disconnected_at'
  | 'last_sync_at'
  | 'last_error_code'
  | 'createdAt'
  | 'updatedAt'
>;

class CalendarConnection
  extends Model<CalendarConnectionAttributes, CalendarConnectionCreation>
  implements CalendarConnectionAttributes
{
  id!: number;
  user_id!: number;
  provider!: 'GOOGLE';
  encrypted_refresh_token!: string;
  token_key_version!: number;
  calendar_id!: string;
  scopes!: string[];
  status!: CalendarConnectionStatus;
  connected_at!: Date;
  disconnected_at!: Date | null;
  last_sync_at!: Date | null;
  last_error_code!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

CalendarConnection.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    provider: { type: DataTypes.ENUM('GOOGLE'), allowNull: false, defaultValue: 'GOOGLE' },
    encrypted_refresh_token: { type: DataTypes.TEXT, allowNull: false },
    token_key_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    calendar_id: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'primary' },
    scopes: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM('ACTIVE', 'REAUTH_REQUIRED', 'DISCONNECTED'), allowNull: false, defaultValue: 'ACTIVE' },
    connected_at: { type: DataTypes.DATE, allowNull: false },
    disconnected_at: { type: DataTypes.DATE, allowNull: true },
    last_sync_at: { type: DataTypes.DATE, allowNull: true },
    last_error_code: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  { sequelize: db, tableName: 'calendar_connections', timestamps: true }
);

export default CalendarConnection;

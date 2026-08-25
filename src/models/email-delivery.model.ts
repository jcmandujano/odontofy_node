import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import { EMAIL_KINDS, EmailKind } from '../types/email.enums';

interface EmailDeliveryAttributes {
  id: number;
  public_id: string;
  user_id: number | null;
  kind: EmailKind;
  idempotency_key: string;
  encrypted_payload: string;
  key_version: number;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  available_at: Date;
  locked_at: Date | null;
  sent_at: Date | null;
  provider_message_id: string | null;
  last_error_code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type EmailDeliveryCreation = Optional<EmailDeliveryAttributes, 'id' | 'user_id' | 'key_version' | 'status' | 'attempts' | 'locked_at' | 'sent_at' | 'provider_message_id' | 'last_error_code' | 'createdAt' | 'updatedAt'>;

class EmailDelivery extends Model<EmailDeliveryAttributes, EmailDeliveryCreation> implements EmailDeliveryAttributes {
  id!: number;
  public_id!: string;
  user_id!: number | null;
  kind!: EmailKind;
  idempotency_key!: string;
  encrypted_payload!: string;
  key_version!: number;
  status!: 'PENDING' | 'SENT' | 'FAILED';
  attempts!: number;
  available_at!: Date;
  locked_at!: Date | null;
  sent_at!: Date | null;
  provider_message_id!: string | null;
  last_error_code!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

EmailDelivery.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  public_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  kind: { type: DataTypes.ENUM(...EMAIL_KINDS), allowNull: false },
  idempotency_key: { type: DataTypes.UUID, allowNull: false },
  encrypted_payload: { type: DataTypes.TEXT('long'), allowNull: false },
  key_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  status: { type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED'), allowNull: false, defaultValue: 'PENDING' },
  attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  available_at: { type: DataTypes.DATE, allowNull: false },
  locked_at: { type: DataTypes.DATE, allowNull: true },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  provider_message_id: { type: DataTypes.STRING(255), allowNull: true },
  last_error_code: { type: DataTypes.STRING(64), allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, { sequelize: db, tableName: 'email_deliveries', timestamps: true });

export default EmailDelivery;

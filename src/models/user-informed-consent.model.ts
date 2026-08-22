import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';

interface UserInformedConsentAttributes {
  id: number;
  user_id: number;
  informed_consent_id: number | null;
  name: string;
  description: string | null;
  is_custom: boolean;
  template_file_id: number | null;
  status: 'ACTIVE' | 'ARCHIVED';
  version: number;
  archived_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserInformedConsentCreation = Optional<UserInformedConsentAttributes, 'id' | 'informed_consent_id' | 'description' | 'is_custom' | 'template_file_id' | 'status' | 'version' | 'archived_at' | 'createdAt' | 'updatedAt'>;

class UserInformedConsent extends Model<UserInformedConsentAttributes, UserInformedConsentCreation> implements UserInformedConsentAttributes {
  id!: number;
  user_id!: number;
  informed_consent_id!: number | null;
  name!: string;
  description!: string | null;
  is_custom!: boolean;
  template_file_id!: number | null;
  status!: 'ACTIVE' | 'ARCHIVED';
  version!: number;
  archived_at!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

UserInformedConsent.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  informed_consent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_custom: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  template_file_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  status: { type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'), allowNull: false, defaultValue: 'ACTIVE' },
  version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  archived_at: { type: DataTypes.DATE, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, { sequelize: db, tableName: 'user_informed_consents', timestamps: true });

export default UserInformedConsent;

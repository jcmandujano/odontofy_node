import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import { SIGNED_CONSENT_STATUSES, SignedConsentStatus } from '../types/consent.enums';

interface SignedConsentAttributes {
  id: number;
  user_informed_consent_id: number;
  patient_id: number;
  doctor_id: number;
  signed_at: Date;
  template_file_id_snapshot: number | null;
  signed_file_id: number | null;
  status: SignedConsentStatus;
  template_version: number;
  template_name_snapshot: string;
  template_description_snapshot: string | null;
  patient_name_snapshot: string;
  doctor_name_snapshot: string;
  signatory_name: string;
  signatory_capacity: 'PATIENT' | 'REPRESENTATIVE';
  voided_at: Date | null;
  void_reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type SignedConsentCreation = Optional<SignedConsentAttributes, 'id' | 'template_file_id_snapshot' | 'signed_file_id' | 'status' | 'template_description_snapshot' | 'voided_at' | 'void_reason' | 'createdAt' | 'updatedAt'>;

class SignedConsent extends Model<SignedConsentAttributes, SignedConsentCreation> implements SignedConsentAttributes {
  id!: number;
  user_informed_consent_id!: number;
  patient_id!: number;
  doctor_id!: number;
  signed_at!: Date;
  template_file_id_snapshot!: number | null;
  signed_file_id!: number | null;
  status!: SignedConsentStatus;
  template_version!: number;
  template_name_snapshot!: string;
  template_description_snapshot!: string | null;
  patient_name_snapshot!: string;
  doctor_name_snapshot!: string;
  signatory_name!: string;
  signatory_capacity!: 'PATIENT' | 'REPRESENTATIVE';
  voided_at!: Date | null;
  void_reason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

SignedConsent.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_informed_consent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  signed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  template_file_id_snapshot: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  signed_file_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  status: { type: DataTypes.ENUM(...SIGNED_CONSENT_STATUSES), allowNull: false, defaultValue: 'PENDING_DOCUMENT' },
  template_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  template_name_snapshot: { type: DataTypes.STRING(255), allowNull: false },
  template_description_snapshot: { type: DataTypes.TEXT, allowNull: true },
  patient_name_snapshot: { type: DataTypes.STRING(350), allowNull: false },
  doctor_name_snapshot: { type: DataTypes.STRING(350), allowNull: false },
  signatory_name: { type: DataTypes.STRING(350), allowNull: false },
  signatory_capacity: { type: DataTypes.ENUM('PATIENT', 'REPRESENTATIVE'), allowNull: false },
  voided_at: { type: DataTypes.DATE, allowNull: true },
  void_reason: { type: DataTypes.STRING(1000), allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, { sequelize: db, tableName: 'signed_consents', timestamps: true });

export default SignedConsent;

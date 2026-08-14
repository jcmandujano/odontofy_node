// models/signedConsent.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";
import Patient from './patient.model';
import User from './user.model';

interface SignedConsentAttributes {
  id: number;
  consent_id: number;
  patient_id: number;
  doctor_id: number;
  signed_date: Date;
  file_url: string | null;
}

type SignedConsentCreationAttributes = Optional<SignedConsentAttributes, 'id'>;

class SignedConsent extends Model<SignedConsentAttributes, SignedConsentCreationAttributes> implements SignedConsentAttributes {
  public id!: number;
  public consent_id!: number;
  public patient_id!: number;
  public doctor_id!: number;
  public signed_date!: Date;
  public file_url!: string | null;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SignedConsent.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    consent_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_informed_consent_id',
    },
    patient_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Patient,
        key: 'id',
      },
    },
    doctor_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    signed_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'signed_at',
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'signed_consents',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

// Definir las relaciones
/* SignedConsent.belongsTo(InformedConsent, { foreignKey: 'consentId' });
SignedConsent.belongsTo(Patient, { foreignKey: 'patientId' });
SignedConsent.belongsTo(User, { foreignKey: 'doctorId' }); */

export default SignedConsent;

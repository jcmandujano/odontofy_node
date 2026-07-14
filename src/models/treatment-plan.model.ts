import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';
import Patient from './patient.model';
import User from './user.model';
import {
  TREATMENT_PLAN_STATUSES,
  type TreatmentPlanStatus,
} from '../types/treatment-plan.enums';

interface TreatmentPlanAttributes {
  id: number;
  user_id: number;
  patient_id: number;
  title: string;
  description: string | null;
  diagnosis: string | null;
  patient_complaint: string | null;
  clinical_observations: string | null;
  prognosis: string | null;
  status: TreatmentPlanStatus;
  estimated_start_date: Date | null;
  estimated_end_date: Date | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  acceptance_notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
}

type TreatmentPlanCreationAttributes = Optional<TreatmentPlanAttributes, 'id'>;

class TreatmentPlan extends Model<TreatmentPlanAttributes, TreatmentPlanCreationAttributes> implements TreatmentPlanAttributes {
  public id!: number;
  public user_id!: number;
  public patient_id!: number;
  public title!: string;
  public description!: string | null;
  public diagnosis!: string | null;
  public patient_complaint!: string | null;
  public clinical_observations!: string | null;
  public prognosis!: string | null;
  public status!: TreatmentPlanStatus;
  public estimated_start_date!: Date | null;
  public estimated_end_date!: Date | null;
  public accepted_at!: Date | null;
  public rejected_at!: Date | null;
  public acceptance_notes!: string | null;
  public subtotal!: number;
  public discount!: number;
  public total!: number;
}

TreatmentPlan.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    patient_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    patient_complaint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clinical_observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prognosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...TREATMENT_PLAN_STATUSES),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    estimated_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acceptance_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: 'treatment_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

User.hasMany(TreatmentPlan, { foreignKey: 'user_id' });
Patient.hasMany(TreatmentPlan, { foreignKey: 'patient_id' });
TreatmentPlan.belongsTo(User, { foreignKey: 'user_id' });
TreatmentPlan.belongsTo(Patient, { foreignKey: 'patient_id' });

export default TreatmentPlan;

import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';
import TreatmentPlan from './treatment-plan.model';
import UserConcept from './user_concept.model';
import {
  TREATMENT_PLAN_ITEM_PRIORITIES,
  TREATMENT_PLAN_ITEM_STATUSES,
  type TreatmentPlanItemPriority,
  type TreatmentPlanItemStatus,
} from '../types/treatment-plan.enums';

interface TreatmentPlanItemAttributes {
  id: number;
  treatment_plan_id: number;
  user_concept_id: number | null;
  name: string;
  description: string | null;
  tooth: string | null;
  area: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  phase: string | null;
  priority: TreatmentPlanItemPriority | null;
  status: TreatmentPlanItemStatus;
  notes: string | null;
  sort_order: number;
  completed_at: Date | null;
}

type TreatmentPlanItemCreationAttributes = Optional<TreatmentPlanItemAttributes, 'id'>;

class TreatmentPlanItem extends Model<TreatmentPlanItemAttributes, TreatmentPlanItemCreationAttributes> implements TreatmentPlanItemAttributes {
  public id!: number;
  public treatment_plan_id!: number;
  public user_concept_id!: number | null;
  public name!: string;
  public description!: string | null;
  public tooth!: string | null;
  public area!: string | null;
  public quantity!: number;
  public unit_price!: number;
  public subtotal!: number;
  public phase!: string | null;
  public priority!: TreatmentPlanItemPriority | null;
  public status!: TreatmentPlanItemStatus;
  public notes!: string | null;
  public sort_order!: number;
  public completed_at!: Date | null;
}

TreatmentPlanItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    treatment_plan_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    user_concept_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tooth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    area: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    phase: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM(...TREATMENT_PLAN_ITEM_PRIORITIES),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...TREATMENT_PLAN_ITEM_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'treatment_plan_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

TreatmentPlan.hasMany(TreatmentPlanItem, { foreignKey: 'treatment_plan_id' });
TreatmentPlanItem.belongsTo(TreatmentPlan, { foreignKey: 'treatment_plan_id' });
TreatmentPlanItem.belongsTo(UserConcept, { foreignKey: 'user_concept_id', as: 'userConcept' });

export default TreatmentPlanItem;

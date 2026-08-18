import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import Patient from './patient.model'
import TreatmentPlan from './treatment-plan.model'
import TreatmentPlanItem from './treatment-plan-item.model'
import User from './user.model'

interface EvolutionNoteAttributes {
  id: number
  patient_id: number
  treatment_plan_id: number | null
  treatment_plan_item_id: number | null
  author_user_id: number
  author_name: string
  note: string
  version: number
  occurred_at: Date
  archived_at: Date | null
}

type EvolutionNoteCreationAttributes = Optional<
  EvolutionNoteAttributes,
  'archived_at' | 'id' | 'version'
>

class EvolutionNote
  extends Model<EvolutionNoteAttributes, EvolutionNoteCreationAttributes>
  implements EvolutionNoteAttributes
{
  public id!: number
  public patient_id!: number
  public treatment_plan_id!: number | null
  public treatment_plan_item_id!: number | null
  public author_user_id!: number
  public author_name!: string
  public note!: string
  public version!: number
  public occurred_at!: Date
  public archived_at!: Date | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

EvolutionNote.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    treatment_plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    treatment_plan_item_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    author_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_name: { type: DataTypes.STRING(350), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: false },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'evolution_notes',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
)

Patient.hasMany(EvolutionNote, { foreignKey: 'patient_id' })
User.hasMany(EvolutionNote, { foreignKey: 'author_user_id' })
TreatmentPlan.hasMany(EvolutionNote, {
  foreignKey: 'treatment_plan_id',
  as: 'evolutionNotes',
})
TreatmentPlanItem.hasMany(EvolutionNote, {
  foreignKey: 'treatment_plan_item_id',
  as: 'evolutionNotes',
})
EvolutionNote.belongsTo(Patient, { foreignKey: 'patient_id' })
EvolutionNote.belongsTo(User, { foreignKey: 'author_user_id' })
EvolutionNote.belongsTo(TreatmentPlan, {
  foreignKey: 'treatment_plan_id',
  as: 'treatmentPlan',
})
EvolutionNote.belongsTo(TreatmentPlanItem, {
  foreignKey: 'treatment_plan_item_id',
  as: 'treatmentPlanItem',
})

export default EvolutionNote

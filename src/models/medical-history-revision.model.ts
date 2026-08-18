import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import Patient from './patient.model'
import User from './user.model'

interface MedicalHistoryRevisionAttributes {
  id: number
  patient_id: number
  version: number
  questionnaire_version: string
  family_history: Record<string, unknown>
  personal_history: Record<string, unknown>
  author_user_id: number
  author_name: string
  change_reason: string
}

type MedicalHistoryRevisionCreationAttributes = Optional<
  MedicalHistoryRevisionAttributes,
  'id'
>

class MedicalHistoryRevision
  extends Model<
    MedicalHistoryRevisionAttributes,
    MedicalHistoryRevisionCreationAttributes
  >
  implements MedicalHistoryRevisionAttributes
{
  public id!: number
  public patient_id!: number
  public version!: number
  public questionnaire_version!: string
  public family_history!: Record<string, unknown>
  public personal_history!: Record<string, unknown>
  public author_user_id!: number
  public author_name!: string
  public change_reason!: string
  public readonly created_at!: Date
}

MedicalHistoryRevision.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    questionnaire_version: { type: DataTypes.STRING(20), allowNull: false },
    family_history: { type: DataTypes.JSON, allowNull: false },
    personal_history: { type: DataTypes.JSON, allowNull: false },
    author_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_name: { type: DataTypes.STRING(350), allowNull: false },
    change_reason: { type: DataTypes.STRING(500), allowNull: false },
  },
  {
    sequelize: db,
    tableName: 'medical_history_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
)

Patient.hasMany(MedicalHistoryRevision, {
  foreignKey: 'patient_id',
  as: 'medicalHistoryRevisions',
})
MedicalHistoryRevision.belongsTo(Patient, { foreignKey: 'patient_id' })
User.hasMany(MedicalHistoryRevision, { foreignKey: 'author_user_id' })
MedicalHistoryRevision.belongsTo(User, { foreignKey: 'author_user_id' })

export default MedicalHistoryRevision

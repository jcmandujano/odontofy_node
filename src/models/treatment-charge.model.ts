import { DataTypes, Model, Optional } from 'sequelize'
import db from '../db/connection'

interface Attributes {
  id: number
  patient_id: number
  treatment_id: number
  confirmed_by_user_id: number
  occurred_on: string
  description: string
  subtotal_amount: string
  discount_amount: string
  total_amount: string
}
class TreatmentCharge
  extends Model<Attributes, Optional<Attributes, 'id'>>
  implements Attributes
{
  declare id: number
  declare patient_id: number
  declare treatment_id: number
  declare confirmed_by_user_id: number
  declare occurred_on: string
  declare description: string
  declare subtotal_amount: string
  declare discount_amount: string
  declare total_amount: string
  declare created_at: Date
  declare updated_at: Date
}
TreatmentCharge.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    treatment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    confirmed_by_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    occurred_on: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    subtotal_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    sequelize: db,
    tableName: 'treatment_charges',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)
export default TreatmentCharge

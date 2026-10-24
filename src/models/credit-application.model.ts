import { DataTypes, Model, Optional } from 'sequelize'
import db from '../db/connection'

interface Attributes {
  id: number
  payment_id: number
  user_id: number
  idempotency_key: string
  request_hash: string
  occurred_on: string
  snapshot: Record<string, unknown>
}
class CreditApplication
  extends Model<Attributes, Optional<Attributes, 'id'>>
  implements Attributes
{
  declare id: number
  declare payment_id: number
  declare user_id: number
  declare idempotency_key: string
  declare request_hash: string
  declare occurred_on: string
  declare snapshot: Record<string, unknown>
  declare readonly created_at: Date
}
CreditApplication.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    idempotency_key: { type: DataTypes.STRING(36), allowNull: false },
    request_hash: { type: DataTypes.STRING(64), allowNull: false },
    occurred_on: { type: DataTypes.DATEONLY, allowNull: false },
    snapshot: { type: DataTypes.JSON, allowNull: false },
  },
  {
    sequelize: db,
    tableName: 'credit_applications',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)
export default CreditApplication

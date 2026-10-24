import { DataTypes, Model, Optional } from 'sequelize'
import db from '../db/connection'

interface Attributes {
  id: number
  payment_id: number
  charge_id: number
  amount: string
}
class PaymentAllocation
  extends Model<Attributes, Optional<Attributes, 'id'>>
  implements Attributes
{
  declare id: number
  declare payment_id: number
  declare charge_id: number
  declare amount: string
}
PaymentAllocation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    charge_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    sequelize: db,
    tableName: 'payment_allocations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)
export default PaymentAllocation

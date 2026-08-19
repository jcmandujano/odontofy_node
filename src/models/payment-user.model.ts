import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import Payment from './payment.model'
import UserConcept from './user_concept.model'
import type { PaymentMethod } from '../types/payment.enums'

interface PaymentUserAttributes {
  id: number
  paymentId: number
  conceptId: number
  paymentMethod: PaymentMethod
  quantity: number
  description_snapshot: string
  unit_price_snapshot: string | number
  subtotal: string | number
}

type PaymentUserCreationAttributes = Optional<PaymentUserAttributes, 'id'>

class PaymentUser
  extends Model<PaymentUserAttributes, PaymentUserCreationAttributes>
  implements PaymentUserAttributes
{
  public id!: number
  public paymentId!: number
  public conceptId!: number
  public paymentMethod!: PaymentMethod
  public quantity!: number
  public description_snapshot!: string
  public unit_price_snapshot!: string | number
  public subtotal!: string | number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
  public userConcept?: UserConcept
}

PaymentUser.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'payment_id',
    },
    conceptId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_concept_id',
    },
    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'DEBIT', 'CREDIT', 'TRANSFERENCE'),
      allowNull: false,
      defaultValue: 'CASH',
      field: 'payment_method',
    },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    description_snapshot: { type: DataTypes.STRING(255), allowNull: false },
    unit_price_snapshot: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'subtotal_amount',
    },
  },
  {
    sequelize: db,
    tableName: 'payment_items',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
)

Payment.hasMany(PaymentUser, { foreignKey: 'paymentId', as: 'items' })
PaymentUser.belongsTo(Payment, { foreignKey: 'paymentId' })
PaymentUser.belongsTo(UserConcept, {
  foreignKey: 'conceptId',
  as: 'userConcept',
})

export default PaymentUser

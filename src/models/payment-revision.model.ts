import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import Payment from './payment.model'
import User from './user.model'

export const PAYMENT_REVISION_ACTIONS = [
  'CREATED',
  'CORRECTED',
  'CANCELLED',
] as const
export type PaymentRevisionAction = (typeof PAYMENT_REVISION_ACTIONS)[number]

interface PaymentRevisionAttributes {
  id: number
  payment_id: number
  version: number
  action: PaymentRevisionAction
  changed_by_user_id: number
  changed_by_name: string
  snapshot: Record<string, unknown>
  change_reason: string | null
}

type PaymentRevisionCreationAttributes = Optional<
  PaymentRevisionAttributes,
  'id'
>

class PaymentRevision
  extends Model<PaymentRevisionAttributes, PaymentRevisionCreationAttributes>
  implements PaymentRevisionAttributes
{
  public id!: number
  public payment_id!: number
  public version!: number
  public action!: PaymentRevisionAction
  public changed_by_user_id!: number
  public changed_by_name!: string
  public snapshot!: Record<string, unknown>
  public change_reason!: string | null
  public readonly created_at!: Date
}

PaymentRevision.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    payment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    action: {
      type: DataTypes.ENUM(...PAYMENT_REVISION_ACTIONS),
      allowNull: false,
    },
    changed_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    changed_by_name: { type: DataTypes.STRING(350), allowNull: false },
    snapshot: { type: DataTypes.JSON, allowNull: false },
    change_reason: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'payment_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
)

Payment.hasMany(PaymentRevision, { foreignKey: 'payment_id', as: 'revisions' })
PaymentRevision.belongsTo(Payment, { foreignKey: 'payment_id' })
User.hasMany(PaymentRevision, { foreignKey: 'changed_by_user_id' })
PaymentRevision.belongsTo(User, { foreignKey: 'changed_by_user_id' })

export default PaymentRevision

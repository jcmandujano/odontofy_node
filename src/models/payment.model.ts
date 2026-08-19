import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import type {
  BillingPaymentMethod,
  BillingRecordStatus,
} from '../types/billing.enums'
import {
  BILLING_PAYMENT_METHODS,
  BILLING_RECORD_STATUSES,
} from '../types/billing.enums'
import Patient from './patient.model'
import User from './user.model'

interface PaymentAttributes {
  id: number
  user_id: number
  patientId: number
  author_user_id: number
  author_name: string
  payment_date: string
  subtotal: string | number
  income: string | number
  debt: string | number
  total: string | number
  discount: string | number
  payment_method: BillingPaymentMethod | null
  status: BillingRecordStatus
  version: number
  cancelled_at: Date | null
  cancelled_by_user_id: number | null
  cancellation_reason: string | null
  idempotency_key: string | null
  request_hash: string | null
}

type PaymentCreationAttributes = Optional<
  PaymentAttributes,
  | 'cancelled_at'
  | 'cancelled_by_user_id'
  | 'cancellation_reason'
  | 'id'
  | 'idempotency_key'
  | 'request_hash'
  | 'status'
  | 'version'
>

class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: number
  public user_id!: number
  public patientId!: number
  public author_user_id!: number
  public author_name!: string
  public payment_date!: string
  public subtotal!: string | number
  public income!: string | number
  public debt!: string | number
  public total!: string | number
  public discount!: string | number
  public payment_method!: BillingPaymentMethod | null
  public status!: BillingRecordStatus
  public version!: number
  public cancelled_at!: Date | null
  public cancelled_by_user_id!: number | null
  public cancellation_reason!: string | null
  public idempotency_key!: string | null
  public request_hash!: string | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    patientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'patient_id',
    },
    author_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_name: { type: DataTypes.STRING(350), allowNull: false },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'subtotal_amount',
    },
    income: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'amount_received',
    },
    debt: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'balance_after',
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_amount',
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount',
    },
    payment_method: {
      type: DataTypes.ENUM(...BILLING_PAYMENT_METHODS),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...BILLING_RECORD_STATUSES),
      allowNull: false,
      defaultValue: 'POSTED',
    },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    cancelled_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    cancellation_reason: { type: DataTypes.STRING(500), allowNull: true },
    idempotency_key: { type: DataTypes.STRING(36), allowNull: true },
    request_hash: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'payments',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
)

Payment.belongsTo(Patient, { foreignKey: 'patientId' })
Payment.belongsTo(User, { foreignKey: 'author_user_id', as: 'author' })
Payment.belongsTo(User, {
  foreignKey: 'cancelled_by_user_id',
  as: 'cancelledBy',
})

export default Payment

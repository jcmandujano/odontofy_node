// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";
import Patient from './patient.model';

interface PaymentAttributes {
  id: number;
  user_id: number;
  patientId: number;
  payment_date: string;
  income: number;
  debt: number;
  total: number;
  discount: number;
}

type PaymentCreationAttributes = Optional<PaymentAttributes, 'id'>;

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
    public id!: number;
    public user_id!: number;
    public patientId!: number;
    public payment_date!: string;
    public income!: number;
    public debt!: number;
    public total!: number;
    public discount!: number;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
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
    patientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'patient_id',
    },
    payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
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
  },
  {
    sequelize: db,
    tableName: 'payments',
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

// Definir la relación con el modelo Patient
Payment.belongsTo(Patient, { foreignKey: 'patientId' });

export default Payment;

// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";
import Patient from './patient.model';

interface PaymentAttributes {
  id: number;
  user_id: number;
  patientId: number;
  payment_date: Date;
  income: number;
  debt: number;
  total: number;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id'> {}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
    public id!: number;
    public user_id!: number;
    public patientId!: number;
    public payment_date!: Date;
    public income!: number;
    public debt!: number;
    public total!: number;

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
    },
    payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    income: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    debt: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: 'payment',
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

// Definir la relación con el modelo Patient
Payment.belongsTo(Patient, { foreignKey: 'patientId' });

export default Payment;
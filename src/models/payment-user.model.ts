// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";
import Payment from './payment.model';
import Concept from './concept.model';

interface PaymentUserAttributes {
  id: number;
  paymentId: number;
  conceptId: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentUserCreationAttributes extends Optional<PaymentUserAttributes, 'createdAt' | 'updatedAt'> {}

class PaymentUser extends Model<PaymentUserAttributes, PaymentUserCreationAttributes> implements PaymentUserAttributes {
  id!: number;
  paymentId!: number;
  conceptId!: number;
  quantity!: number;
  public createdAt?: Date;
  public updatedAt?: Date;
}

PaymentUser.init(
  {
    id: {
      type: DataTypes.NUMBER,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.NUMBER,
      primaryKey: true,
    },
    conceptId: {
        type: DataTypes.NUMBER,
        primaryKey: true,
      },
    quantity: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },

  },
  {
    sequelize: db,
    tableName: 'payment_concept',
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

// Definir las relaciones con los modelos Payment y Concept
PaymentUser.belongsTo(Payment, { foreignKey: 'paymentId' });
PaymentUser.belongsTo(Concept, { foreignKey: 'conceptId' });

export default PaymentUser;
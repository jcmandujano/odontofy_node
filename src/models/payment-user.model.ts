import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';
import Payment from './payment.model';
import UserConcept from './user_concept.model';
import type { PaymentMethod } from '../types/payment.enums';

interface PaymentUserAttributes {
  id?: number;
  paymentId: number;
  conceptId: number;
  paymentMethod: PaymentMethod;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type PaymentUserCreationAttributes = Optional<
  PaymentUserAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

class PaymentUser
  extends Model<PaymentUserAttributes, PaymentUserCreationAttributes>
  implements PaymentUserAttributes
{
  public id!: number;
  public paymentId!: number;
  public conceptId!: number;
  public paymentMethod!: PaymentMethod;
  public quantity!: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  public userConcept?: UserConcept;
}

PaymentUser.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    conceptId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'DEBIT', 'CREDIT', 'TRANSFERENCE'),
      allowNull: false,
      defaultValue: 'CASH',
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: 'payment_concept',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

PaymentUser.belongsTo(Payment, { foreignKey: 'paymentId' });
PaymentUser.belongsTo(UserConcept, { foreignKey: 'conceptId', as: 'userConcept' });

export default PaymentUser;

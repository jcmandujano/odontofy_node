// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";

interface UserConceptAttributes {
  id: number;
  user_id: number;
  concept_id: number | null;
  description: String;
  unit_price: number;
  is_custom: boolean;
}

interface UserConceptCreationAttributes extends Optional<UserConceptAttributes, 'id'> {}

class UserConcept extends Model<UserConceptAttributes, UserConceptCreationAttributes> implements UserConceptAttributes {
    id!: number;
    user_id!: number;
    concept_id!: number | null;
    description!: String;
    unit_price!: number;
    is_custom!: boolean;
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserConcept.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      concept_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit_price: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    is_custom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    }
  },
  {
    sequelize: db,
    tableName: 'user_concept',
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

export default UserConcept;
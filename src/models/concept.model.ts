// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";

interface ConceptAttributes {
  id: number;
  description: string;
  unit_price: number;
}

type ConceptCreationAttributes = Optional<ConceptAttributes, 'id'>;

class Concept extends Model<ConceptAttributes, ConceptCreationAttributes> implements ConceptAttributes {
    id!: number;
    description!: string;
    unit_price!: number;
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Concept.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

  },
  {
    sequelize: db,
    tableName: 'concepts',
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

export default Concept;

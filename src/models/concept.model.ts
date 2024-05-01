// models/payment.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";

interface ConceptAttributes {
  id: number;
  description: String;
  unit_price: number;
}

interface ConceptCreationAttributes extends Optional<ConceptAttributes, 'id'> {}

class Concept extends Model<ConceptAttributes, ConceptCreationAttributes> implements ConceptAttributes {
    id!: number;
    description!: String;
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
      type: DataTypes.NUMBER,
      allowNull: false,
    },

  },
  {
    sequelize: db,
    tableName: 'concept',
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

export default Concept;
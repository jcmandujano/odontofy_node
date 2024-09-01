// models/informedConsent.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";

interface InformedConsentAttributes {
  id: number;
  name: string | null;
  description: string | null;
  file_url: string | null;
}

interface InformedConsentCreationAttributes extends Optional<InformedConsentAttributes, 'id'> {}

class InformedConsent extends Model<InformedConsentAttributes, InformedConsentCreationAttributes> implements InformedConsentAttributes {
  public id!: number;
  public name!: string | null;
  public description!: string | null;
  public file_url!: string | null;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InformedConsent.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'informed_consent',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

export default InformedConsent;

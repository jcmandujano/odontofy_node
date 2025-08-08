// models/informedConsent.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from "../db/connection";
import SignedConsent from './signed-consent.model';

interface UserInformedConsentAttributes {
  id: number;
  user_id: number;
  informed_consent_id: number | null;
  name: string | null;
  description: string | null;
  file_url: string | null;
  is_custom: boolean;
}

interface UserInformedConsentCreationAttributes extends Optional<UserInformedConsentAttributes, 'id'> { }

class UserInformedConsent extends Model<UserInformedConsentAttributes, UserInformedConsentCreationAttributes> implements UserInformedConsentAttributes {
  public id!: number;
  user_id!: number;
  informed_consent_id!: number | null;
  public name!: string | null;
  public description!: string | null;
  public file_url!: string | null;
  is_custom!: boolean;
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserInformedConsent.init(
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
    informed_consent_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
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
    is_custom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    }
  },
  {
    sequelize: db,
    tableName: 'user_informed_consent',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

SignedConsent.belongsTo(UserInformedConsent, {
  foreignKey: 'consent_id',
  as: 'consent'
});

export default UserInformedConsent;

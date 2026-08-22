import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';

interface InformedConsentAttributes {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type InformedConsentCreation = Optional<InformedConsentAttributes, 'id' | 'description' | 'createdAt' | 'updatedAt'>;

class InformedConsent extends Model<InformedConsentAttributes, InformedConsentCreation> implements InformedConsentAttributes {
  id!: number;
  name!: string;
  description!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

InformedConsent.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, { sequelize: db, tableName: 'informed_consents', timestamps: true });

export default InformedConsent;

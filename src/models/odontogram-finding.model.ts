import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import {
  ODONTOGRAM_CONDITIONS,
  ODONTOGRAM_SURFACES,
  type OdontogramCondition,
  type OdontogramSurface,
} from '../types/odontogram.enums';
import Odontogram from './odontogram.model';

interface OdontogramFindingAttributes {
  id: number;
  odontogram_id: number;
  tooth_code: string;
  condition: OdontogramCondition;
  surface: OdontogramSurface | null;
  notes: string | null;
}

type OdontogramFindingCreationAttributes = Optional<
  OdontogramFindingAttributes,
  'id' | 'notes' | 'surface'
>;

class OdontogramFinding
  extends Model<
    OdontogramFindingAttributes,
    OdontogramFindingCreationAttributes
  >
  implements OdontogramFindingAttributes
{
  public id!: number;
  public odontogram_id!: number;
  public tooth_code!: string;
  public condition!: OdontogramCondition;
  public surface!: OdontogramSurface | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OdontogramFinding.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    odontogram_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    tooth_code: { type: DataTypes.STRING(2), allowNull: false },
    condition: {
      type: DataTypes.ENUM(...ODONTOGRAM_CONDITIONS),
      allowNull: false,
    },
    surface: {
      type: DataTypes.ENUM(...ODONTOGRAM_SURFACES),
      allowNull: true,
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'odontogram_findings',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Odontogram.hasMany(OdontogramFinding, {
  foreignKey: 'odontogram_id',
  as: 'findings',
});
OdontogramFinding.belongsTo(Odontogram, {
  foreignKey: 'odontogram_id',
});

export default OdontogramFinding;

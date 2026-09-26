import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import { ODONTOGRAM_DENTITIONS, type OdontogramDentition } from '../types/odontogram.enums';
import Patient from './patient.model';
import User from './user.model';

interface OdontogramAttributes {
  id: number;
  user_id: number;
  patient_id: number;
  dentition: OdontogramDentition;
  title: string | null;
  author_user_id: number;
  author_name: string;
  occurred_at: Date;
  archived_at: Date | null;
}

type OdontogramCreationAttributes = Optional<
  OdontogramAttributes,
  'archived_at' | 'id' | 'title'
>;

class Odontogram
  extends Model<OdontogramAttributes, OdontogramCreationAttributes>
  implements OdontogramAttributes
{
  public id!: number;
  public user_id!: number;
  public patient_id!: number;
  public dentition!: OdontogramDentition;
  public title!: string | null;
  public author_user_id!: number;
  public author_name!: string;
  public occurred_at!: Date;
  public archived_at!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Odontogram.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    dentition: {
      type: DataTypes.ENUM(...ODONTOGRAM_DENTITIONS),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(255), allowNull: true },
    author_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_name: { type: DataTypes.STRING(350), allowNull: false },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'odontograms',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

User.hasMany(Odontogram, { foreignKey: 'user_id' });
User.hasMany(Odontogram, { foreignKey: 'author_user_id', as: 'authoredOdontograms' });
Patient.hasMany(Odontogram, { foreignKey: 'patient_id' });
Odontogram.belongsTo(User, { foreignKey: 'user_id' });
Odontogram.belongsTo(User, { foreignKey: 'author_user_id', as: 'author' });
Odontogram.belongsTo(Patient, { foreignKey: 'patient_id' });

export default Odontogram;

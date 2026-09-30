import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';

interface LinkAttributes {
  id: number;
  finding_id: number;
  treatment_plan_item_id: number;
}

type LinkCreationAttributes = Optional<LinkAttributes, 'id'>;

class OdontogramFindingTreatmentItem
  extends Model<LinkAttributes, LinkCreationAttributes>
  implements LinkAttributes
{
  public id!: number;
  public finding_id!: number;
  public treatment_plan_item_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OdontogramFindingTreatmentItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    finding_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    treatment_plan_item_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: 'odontogram_finding_treatment_items',
    underscored: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

export default OdontogramFindingTreatmentItem;

import { DataTypes, Model, Optional } from 'sequelize'

import db from '../db/connection'
import EvolutionNote from './evolution-note.model'
import User from './user.model'

export const EVOLUTION_NOTE_REVISION_ACTIONS = [
  'CREATED',
  'AMENDED',
  'ARCHIVED',
  'RESTORED',
] as const
export type EvolutionNoteRevisionAction =
  (typeof EVOLUTION_NOTE_REVISION_ACTIONS)[number]

interface EvolutionNoteRevisionAttributes {
  id: number
  evolution_note_id: number
  version: number
  author_user_id: number
  author_name: string
  action: EvolutionNoteRevisionAction
  note: string
  treatment_plan_id: number | null
  treatment_plan_item_id: number | null
  occurred_at: Date
  archived_at: Date | null
  change_reason: string | null
}

type EvolutionNoteRevisionCreationAttributes = Optional<
  EvolutionNoteRevisionAttributes,
  'id'
>

class EvolutionNoteRevision
  extends Model<
    EvolutionNoteRevisionAttributes,
    EvolutionNoteRevisionCreationAttributes
  >
  implements EvolutionNoteRevisionAttributes
{
  public id!: number
  public evolution_note_id!: number
  public version!: number
  public author_user_id!: number
  public author_name!: string
  public action!: EvolutionNoteRevisionAction
  public note!: string
  public treatment_plan_id!: number | null
  public treatment_plan_item_id!: number | null
  public occurred_at!: Date
  public archived_at!: Date | null
  public change_reason!: string | null
  public readonly created_at!: Date
}

EvolutionNoteRevision.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    evolution_note_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    author_name: { type: DataTypes.STRING(350), allowNull: false },
    action: {
      type: DataTypes.ENUM(...EVOLUTION_NOTE_REVISION_ACTIONS),
      allowNull: false,
    },
    note: { type: DataTypes.TEXT, allowNull: false },
    treatment_plan_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    treatment_plan_item_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
    change_reason: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize: db,
    tableName: 'evolution_note_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
)

EvolutionNote.hasMany(EvolutionNoteRevision, {
  foreignKey: 'evolution_note_id',
  as: 'revisions',
})
EvolutionNoteRevision.belongsTo(EvolutionNote, {
  foreignKey: 'evolution_note_id',
})
User.hasMany(EvolutionNoteRevision, { foreignKey: 'author_user_id' })
EvolutionNoteRevision.belongsTo(User, { foreignKey: 'author_user_id' })

export default EvolutionNoteRevision

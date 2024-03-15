import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface EvolutionNoteAttributes {
    id: number
    patient_id: number
    note: string
}

interface NoteCreationAttributes extends Optional<EvolutionNoteAttributes, "id"> {}

class EvolutionNote extends Model<EvolutionNoteAttributes, NoteCreationAttributes> implements EvolutionNoteAttributes {
    id!: number;
    patient_id!: number;
    note!: string;
}

EvolutionNote.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    patient_id: {
        type: DataTypes.NUMBER
    },
    note: {
        type: DataTypes.STRING
    }
},{
    sequelize: db,
    tableName: "evolution_notes",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  });

export default EvolutionNote;
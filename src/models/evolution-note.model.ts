import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";
import TreatmentPlan from "./treatment-plan.model";
import TreatmentPlanItem from "./treatment-plan-item.model";

interface EvolutionNoteAttributes {
    id: number
    patient_id: number
    treatment_plan_id: number | null
    treatment_plan_item_id: number | null
    note: string
}

interface NoteCreationAttributes extends Optional<EvolutionNoteAttributes, "id"> {}

class EvolutionNote extends Model<EvolutionNoteAttributes, NoteCreationAttributes> implements EvolutionNoteAttributes {
    id!: number;
    patient_id!: number;
    treatment_plan_id!: number | null;
    treatment_plan_item_id!: number | null;
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
    treatment_plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    treatment_plan_item_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
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

TreatmentPlan.hasMany(EvolutionNote, { foreignKey: "treatment_plan_id", as: "evolutionNotes" });
TreatmentPlanItem.hasMany(EvolutionNote, { foreignKey: "treatment_plan_item_id", as: "evolutionNotes" });
EvolutionNote.belongsTo(TreatmentPlan, { foreignKey: "treatment_plan_id", as: "treatmentPlan" });
EvolutionNote.belongsTo(TreatmentPlanItem, { foreignKey: "treatment_plan_item_id", as: "treatmentPlanItem" });

export default EvolutionNote;

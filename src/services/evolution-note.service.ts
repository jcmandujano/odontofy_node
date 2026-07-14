import { Op } from "sequelize";
import Patient from "../models/patient.model";
import EvolutionNote from "../models/evolution-note.model";
import TreatmentPlanItem from "../models/treatment-plan-item.model";
import type { PaginatedResponse } from "../types/api-response";
import type {
    CreateEvolutionNoteInput,
    ListEvolutionNotesFilters,
    UpdateEvolutionNoteInput,
} from "../dtos/evolution-note.dto";
import { getTreatmentPlanForUser } from "./treatment-plan.service";

export class EvolutionNoteServiceError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "EvolutionNoteServiceError";
        this.statusCode = statusCode;
    }
}

const ensurePatientBelongsToUser = async (userId: number, patientId: number) => {
    const patient = await Patient.findOne({
        where: {
            id: patientId,
            user_id: userId,
        },
    });

    if (!patient) {
        throw new EvolutionNoteServiceError("El paciente no existe o no pertenece al usuario autenticado", 404);
    }

    return patient;
};

const ensureClinicalReferencesBelongToPatient = async (
    userId: number,
    patientId: number,
    treatmentPlanId?: number | null,
    treatmentPlanItemId?: number | null
) => {
    if (!treatmentPlanId && treatmentPlanItemId) {
        throw new EvolutionNoteServiceError("El item del plan requiere un plan de tratamiento relacionado", 400);
    }

    if (!treatmentPlanId) {
        return;
    }

    const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);

    if (treatmentPlan.patient_id !== patientId) {
        throw new EvolutionNoteServiceError("El plan de tratamiento no pertenece al paciente indicado", 404);
    }

    if (!treatmentPlanItemId) {
        return;
    }

    const treatmentPlanItem = await TreatmentPlanItem.findOne({
        where: {
            id: treatmentPlanItemId,
            treatment_plan_id: treatmentPlan.id,
        },
    });

    if (!treatmentPlanItem) {
        throw new EvolutionNoteServiceError("El item no existe o no pertenece al plan de tratamiento indicado", 404);
    }
};

const ensureTreatmentPlanItemBelongsToPatient = async (
    userId: number,
    patientId: number,
    treatmentPlanItemId: number
) => {
    const treatmentPlanItem = await TreatmentPlanItem.findByPk(treatmentPlanItemId);

    if (!treatmentPlanItem) {
        throw new EvolutionNoteServiceError("El item no existe o no pertenece al paciente indicado", 404);
    }

    const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanItem.treatment_plan_id);

    if (treatmentPlan.patient_id !== patientId) {
        throw new EvolutionNoteServiceError("El item no pertenece al paciente indicado", 404);
    }
};

const getEvolutionNoteForPatient = async (patientId: number, noteId: number) => {
    const note = await EvolutionNote.findOne({
        where: {
            id: noteId,
            patient_id: patientId,
        },
    });

    if (!note) {
        throw new EvolutionNoteServiceError("La nota de evolucion no existe o no pertenece al paciente indicado", 404);
    }

    return note;
};

export const listEvolutionNotes = async (
    userId: number,
    patientId: number,
    page = 1,
    limit = 10,
    search = "",
    filters: ListEvolutionNotesFilters = {}
): Promise<PaginatedResponse<EvolutionNote>> => {
    await ensurePatientBelongsToUser(userId, patientId);

    if (filters.treatment_plan_id) {
        await ensureClinicalReferencesBelongToPatient(
            userId,
            patientId,
            filters.treatment_plan_id,
            filters.treatment_plan_item_id
        );
    } else if (filters.treatment_plan_item_id) {
        await ensureTreatmentPlanItemBelongsToPatient(userId, patientId, filters.treatment_plan_item_id);
    }

    const offset = (page - 1) * limit;
    const whereClause: {
        patient_id: number;
        note?: { [Op.like]: string };
        treatment_plan_id?: number;
        treatment_plan_item_id?: number;
    } = { patient_id: patientId };

    if (search) {
        whereClause.note = { [Op.like]: `%${search}%` };
    }

    if (filters.treatment_plan_id) {
        whereClause.treatment_plan_id = filters.treatment_plan_id;
    }

    if (filters.treatment_plan_item_id) {
        whereClause.treatment_plan_item_id = filters.treatment_plan_item_id;
    }

    const { count, rows: notes } = await EvolutionNote.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
    });

    return {
        total: count,
        page,
        perPage: limit,
        totalPages: Math.ceil(count / limit),
        results: notes,
    };
};

export const getEvolutionNoteById = async (userId: number, patientId: number, noteId: number) => {
    await ensurePatientBelongsToUser(userId, patientId);
    return getEvolutionNoteForPatient(patientId, noteId);
};

export const createEvolutionNote = async (
    userId: number,
    patientId: number,
    input: CreateEvolutionNoteInput
) => {
    await ensurePatientBelongsToUser(userId, patientId);
    await ensureClinicalReferencesBelongToPatient(
        userId,
        patientId,
        input.treatment_plan_id,
        input.treatment_plan_item_id
    );

    return EvolutionNote.create({
        patient_id: patientId,
        note: input.note,
        treatment_plan_id: input.treatment_plan_id ?? null,
        treatment_plan_item_id: input.treatment_plan_item_id ?? null,
    });
};

export const updateEvolutionNote = async (
    userId: number,
    patientId: number,
    noteId: number,
    input: UpdateEvolutionNoteInput
) => {
    await ensurePatientBelongsToUser(userId, patientId);
    const note = await getEvolutionNoteForPatient(patientId, noteId);
    const nextTreatmentPlanId = input.treatment_plan_id !== undefined
        ? input.treatment_plan_id
        : note.treatment_plan_id;
    const nextTreatmentPlanItemId = nextTreatmentPlanId === null
        ? null
        : input.treatment_plan_item_id !== undefined
            ? input.treatment_plan_item_id
            : note.treatment_plan_item_id;

    await ensureClinicalReferencesBelongToPatient(
        userId,
        patientId,
        nextTreatmentPlanId,
        nextTreatmentPlanItemId
    );

    await note.update({
        ...input,
        treatment_plan_id: nextTreatmentPlanId,
        treatment_plan_item_id: nextTreatmentPlanItemId,
    });

    return note;
};

export const deleteEvolutionNote = async (userId: number, patientId: number, noteId: number) => {
    await ensurePatientBelongsToUser(userId, patientId);
    const note = await getEvolutionNoteForPatient(patientId, noteId);

    await note.destroy();

    return note;
};

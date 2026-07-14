import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/response";
import {
    EvolutionNoteServiceError,
    createEvolutionNote as createEvolutionNoteService,
    deleteEvolutionNote as deleteEvolutionNoteService,
    getEvolutionNoteById as getEvolutionNoteByIdService,
    listEvolutionNotes as listEvolutionNotesService,
    updateEvolutionNote as updateEvolutionNoteService,
} from "../services/evolution-note.service";

const getAuthorUid = (req: Request) => {
    if (typeof req.authorUid !== "number") {
        throw new EvolutionNoteServiceError("Usuario autenticado no valido", 401);
    }

    return req.authorUid;
};

const handleEvolutionNoteError = (res: Response, error: unknown) => {
    console.error("Error in evolution-note.controller:", error);

    if (error instanceof EvolutionNoteServiceError) {
        return errorResponse(res, error.message, error.statusCode);
    }

    return errorResponse(res, "An error ocurred while processing notes", 500, error);
};

/**
 * Obtener una lista paginada de notas evolutivas asociadas a un paciente.
 */
export const listNotes = async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patient_id, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string)?.trim() || "";

    try {
        const authorUid = getAuthorUid(req);
        const response = await listEvolutionNotesService(authorUid, patientId, page, limit, search, {
            treatment_plan_id: req.query.treatment_plan_id
                ? parseInt(req.query.treatment_plan_id as string, 10)
                : undefined,
            treatment_plan_item_id: req.query.treatment_plan_item_id
                ? parseInt(req.query.treatment_plan_item_id as string, 10)
                : undefined,
        });

        return successResponse(res, response, "Notes list fetched successfully");
    } catch (error) {
        return handleEvolutionNoteError(res, error);
    }
};

/**
 * Obtener una nota evolutiva por ID asociada a un paciente.
 */
export const getNote = async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patient_id, 10);
    const id = parseInt(req.params.id, 10);

    try {
        const authorUid = getAuthorUid(req);
        const note = await getEvolutionNoteByIdService(authorUid, patientId, id);

        return successResponse(res, note, "Note fetched successfully");
    } catch (error) {
        return handleEvolutionNoteError(res, error);
    }
};

/**
 * Crear una nueva nota evolutiva asociada a un paciente.
 */
export const createNote = async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patient_id, 10);

    try {
        const authorUid = getAuthorUid(req);
        const newNote = await createEvolutionNoteService(authorUid, patientId, req.body);

        return successResponse(res, newNote, "Note created successfully");
    } catch (error) {
        return handleEvolutionNoteError(res, error);
    }
};

/**
 * Actualizar una nota evolutiva por ID asociada a un paciente.
 */
export const updateNote = async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patient_id, 10);
    const id = parseInt(req.params.id, 10);

    try {
        const authorUid = getAuthorUid(req);
        const note = await updateEvolutionNoteService(authorUid, patientId, id, req.body);

        return successResponse(res, note, "Note updated successfully");
    } catch (error) {
        return handleEvolutionNoteError(res, error);
    }
};

/**
 * Eliminar una nota evolutiva por ID asociada a un paciente.
 */
export const deleteNote = async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patient_id, 10);
    const id = parseInt(req.params.id, 10);

    try {
        const authorUid = getAuthorUid(req);
        const note = await deleteEvolutionNoteService(authorUid, patientId, id);

        return successResponse(res, note, "Note deleted successfully");
    } catch (error) {
        return handleEvolutionNoteError(res, error);
    }
};

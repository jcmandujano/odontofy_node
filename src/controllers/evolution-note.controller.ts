import { Request, Response } from "express"
import EvolutionNote from "../models/evolution-note.model";
import { errorResponse, successResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";

/**
 * Obtener una lista paginada de notas evolutivas asociadas a un paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con la lista de notas o un mensaje de error
 */
export const listNotes = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id

    // Configuración de paginación: página actual y límite de resultados
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: notes } = await EvolutionNote.findAndCountAll({
            where: {
                patient_id: patientId
            },
            limit,
            offset
        });

        const response: PaginatedResponse<typeof notes[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: notes
        };

        // Respuesta estandarizada
        return successResponse(res, response, 'Notes list fetched successfully');
    } catch (error) {
        console.log("Error in listNotes:", error);
        return errorResponse(res, 'An error ocurred while fetching notes', 500);
    }

}

/**
 * Obtener una nota evolutiva por su ID asociada a un paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @return {Response} Respuesta con la nota o un mensaje de error
 * */
export const getNote = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const { id } = req.params;

    try {
        // Verifica si la nota existe
        // y pertenece al paciente autenticado
        const note = await EvolutionNote.findOne({
            where: {
                id: id,
                patient_id: patientId
            }
        });
        // Si la nota no existe, devuelve un error 404
        // Si la nota existe, devuelve la nota
        if (note) {
            return successResponse(res, note, 'Note fetched successfully');
        } else {
            return errorResponse(res, 'Note not found', 404);
        }

    } catch (error) {
        console.log("Error in getNote:", error);
        return errorResponse(res, 'An error ocurred while fetching notes', 500);

    }
}

/**
 * Crear una nueva nota evolutiva asociada a un paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con la nota creada o un mensaje de error
 */
export const createNote = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id
    const { body } = req;
    const note = new EvolutionNote(body)
    try {
        note.patient_id = parseInt(patientId)
        const newNote = await EvolutionNote.create(note.dataValues);
        return successResponse(res, newNote, 'Note created successfully');
    } catch (error) {
        return errorResponse(res, 'An error ocurred while creating the note', 500, error);
    }
}

/**
 * Actualizar una nota evolutiva por su ID asociada a un paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con la nota actualizada o un mensaje de error
 */
export const updateNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;
    try {
        const note = await EvolutionNote.findByPk(id);


        if (!note) {
            return errorResponse(res, "No existe una nota con el id" + id, 404);
        }

        await note.update(body);
        return successResponse(res, note, 'Note updated successfully');

    } catch (error) {
        console.log("Error in updateNote:", error);
        return errorResponse(res, 'An error ocurred while updating the note', 500);
    }
}

/**
 * Eliminar una nota evolutiva por su ID asociada a un paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con un mensaje de éxito o un mensaje de error
 */
export const deleteNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const note = await EvolutionNote.findByPk(id);
        if (!note) {
            return errorResponse(res, "No existe una nota con el id" + id, 404);
        }
        await note.destroy()
        return successResponse(res, note, 'Note deleted successfully');
    } catch (error) {
        console.log("Error in deleteNote:", error);
        return errorResponse(res, 'An error ocurred while deleting the note', 500, error);
    }
}
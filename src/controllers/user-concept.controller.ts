import { Request, Response } from "express";
import UserConcept from "../models/user_concept.model";
import { errorResponse, successResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";
import { getRouteParam } from "../utils/route-param";

// Listar todos los conceptos (globales y personalizados del usuario)
export const listUserConcepts = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    try {
        // Obtener conceptos personalizados del usuario
        const { count, rows: userConcepts } = await UserConcept.findAndCountAll({ where: { user_id: authorUid, active: true }, limit, offset: (page - 1) * limit });


        const response: PaginatedResponse<typeof userConcepts[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: userConcepts
        };

        return successResponse(res, response, "Concepts fetched successfully")

    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while fetching the concepts', 500, error);
    }
};

// Obtener un concepto (global o personalizado)
export const getUserConcept = async (req: Request, res: Response) => {
    const id = getRouteParam(req, 'id');
    const { authorUid } = req;
    try {
        // Buscar en la tabla de conceptos personalizados primero
        const userConcept = await UserConcept.findOne({ where: { id, user_id: authorUid, active: true } });

        if (userConcept) {
            return successResponse(res, userConcept, "Concept founded")
        } else {
            return errorResponse(res, 'Failed to find concept', 500);
        }

    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while finding the concept', 500, error);
    }
};

// Crear un nuevo concepto personalizado
export const createUserConcept = async (req: Request, res: Response) => {
    const { description, unit_price, is_custom = true } = req.body;
    const { authorUid } = req;

    try {
        const newConcept = await UserConcept.create({
            user_id: authorUid || 0, // ID del usuario
            concept_id: null, // Concepto nuevo, no relacionado con los globales
            description,
            unit_price,
            is_custom
        });

        return successResponse(res, newConcept, "Concepts created successfully")

    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while creating new concept', 500, error);
    }
};

// Editar un concepto global (crea una copia en los personalizados si no existe)
export const updateUserConcept = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const id = parseInt(getRouteParam(req, 'id'), 10); // ID del concepto global
    const { description, unit_price } = req.body;

    try {

        // Si el concepto global no existe, buscar en los conceptos personalizados
        const userConcept = await UserConcept.findOne({
            where: { user_id: authorUid, id, active: true },
        });

        if (userConcept) {
            // Si existe, actualizar el concepto personalizado
            await userConcept.update({
                description: description || userConcept.description,
                unit_price: unit_price || userConcept.unit_price,
            });

            return successResponse(res, userConcept, "Concepts updated successfully")

        } else {
            return errorResponse(res, 'Failed to find concept', 500);
        }


    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while update the concept', 500, error);
    }
};

// Eliminar un concepto personalizado
export const deleteUserConcept = async (req: Request, res: Response) => {
    const id = getRouteParam(req, 'id');
    const { authorUid } = req;
    try {
        const userConcept = await UserConcept.findOne({ where: { id, user_id: authorUid, active: true } });

        if (!userConcept) {
            return errorResponse(res, 'Failed to find concept', 500);
        }

        await userConcept.update({ active: false });
        return successResponse(res, "Concepts deleted successfully")
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while delete the concept', 500, error);
    }
};

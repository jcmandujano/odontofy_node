import { Request, Response } from "express";
import UserInformedConsent from "../models/user-informed-consent.model";
import { PaginatedResponse } from "../types/api-response";
import { errorResponse, successResponse } from "../utils/response";


// Listar todos los consentimientos informados
export const listUserConsents = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    try {

        // Obtener consentimientos personalizados del usuario
        const { count, rows: userInformedConsents } = await UserInformedConsent.findAndCountAll({ where: { user_id: authorUid }, limit, offset: (page - 1) * limit });

        const response: PaginatedResponse<typeof userInformedConsents[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: userInformedConsents
        };

        return successResponse(res, response, "Consentimientos informados obtenidos exitosamente");

    } catch (error) {
        console.error(error);
        return errorResponse(res, "Error al obtener los consentimientos informados", 500, error);
    }
};

// Obtener un consentimiento informado
export const getUserConsents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        // Buscar en la tabla de consentimientos personalizados
        const userInformedConsent = await UserInformedConsent.findOne({ where: { id, user_id: authorUid } });

        if (userInformedConsent) {
            return successResponse(res, userInformedConsent, "Consentimiento informado obtenido exitosamente");
        }

    } catch (error) {
        console.error(error);
        return errorResponse(res, "Error al obtener el consentimiento informado", 500, error);
    }
};

// Crear un nuevo consentimiento 
export const createUserConsent = async (req: Request, res: Response) => {
    const { name, description, file_url, is_custom = true } = req.body;
    const { authorUid } = req;

    try {
        const newConsent = await UserInformedConsent.create({
            user_id: authorUid || 0,
            informed_consent_id: null,
            name,
            description,
            file_url,
            is_custom
        });

        return successResponse(res, newConsent, "Consentimiento creado exitosamente");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Error al crear el consentimiento", 500, error);
    }
};

// Editar un consentimiento informado
export const updateUserConsent = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const id = parseInt(req.params.id, 10);
    const { name, description, file_url } = req.body;

    try {

        // Buscamos el consentimiento a actualizar
        const userInformedConsent = await UserInformedConsent.findOne({
            where: { user_id: authorUid, id },
        });

        if (userInformedConsent) {
            // Si existe, actualizar el consentimiento
            await userInformedConsent.update({
                name,
                description,
                file_url,
            });

            return successResponse(res, userInformedConsent, "Consentimiento actualizado exitosamente");
        } else {
            return errorResponse(res, "Consentimiento no encontrado", 404);
        }

    } catch (error) {
        console.error(error);
        return errorResponse(res, "Error al personalizar el consentimiento", 500, error);
    }
};

// Eliminar un consentimiento informado
export const deleteUserConsent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const userInformedConsent = await UserInformedConsent.findOne({ where: { id, user_id: authorUid } });

        if (!userInformedConsent) {
            return errorResponse(res, "Consentimiento no encontrado", 404);
        }

        await userInformedConsent.destroy();
        return successResponse(res, null, "Consentimiento eliminado exitosamente");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Error al eliminar el consentimiento", 500, error);
    }
};

import { Request, Response } from "express";
import UserInformedConsent from "../models/user-informed-consent.model";


// Listar todos los consentimientos informados
export const listUserConsents = async (req: Request, res: Response) => {
    const { authorUid } = req;
    try {

        // Obtener consentimientos personalizados del usuario
        const userInformedConsents = await UserInformedConsent.findAll({ where: { user_id:authorUid } });

        res.json({
            consents: userInformedConsents // Retornamos los consentimientos por usuario
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener los consentimientos informados" });
    }
};

// Obtener un consentimiento informado
export const getUserConsents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        // Buscar en la tabla de consentimientos personalizados 
        const userInformedConsent = await UserInformedConsent.findOne({ where: { id, user_id : authorUid} });

        if (userInformedConsent) {
            return res.json({ consent: userInformedConsent });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el consentimiento' });
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

        res.json({
            msg: 'Consentimiento creado exitosamente',
            consent: newConsent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear el consentimiento' });
    }
};

// Editar un consentimiento informado
export const updateUserConsent = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const id = parseInt(req.params.id, 10);
    const { name, description, file_url } = req.body;

    try {

        // Buscamos el consentimiento a actualizar
        let userInformedConsent = await UserInformedConsent.findOne({   
            where: { user_id:authorUid, id },
        });
        
        if (userInformedConsent) {
            // Si existe, actualizar el consentimiento
            await userInformedConsent.update({
                name,
                description,
                file_url,
            });

            res.json({
                msg: "Consentimiento actualizado exitosamente",
                consent: userInformedConsent,
            });
        } else {
            res.status(404).json({ msg: 'Consentimiento no encontrado' });
        }

        
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al personalizar el consentimiento" });
    }
};

// Eliminar un consentimiento informado
export const deleteUserConsent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const userInformedConsent = await UserInformedConsent.findOne({ where: { id, user_id:authorUid } });

        if (!userInformedConsent) {
            return res.status(404).json({ msg: 'Consentimiento no encontrado' });
        }

        await userInformedConsent.destroy();
        res.json({ msg: 'Consentimiento eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el consentimiento' });
    }
};

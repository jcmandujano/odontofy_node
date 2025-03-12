import { Request, Response } from "express";
import UserConcept from "../models/user_concept.model";
import PaymentUser from "../models/payment-user.model";

// Listar todos los conceptos (globales y personalizados del usuario)
export const listUserConcepts = async (req: Request, res: Response) => {
    const { authorUid } = req;
    try {
        // Obtener conceptos personalizados del usuario
        const userConcepts = await UserConcept.findAll({ where: { user_id:authorUid } });

        res.json({
            concepts: userConcepts, // Combinar conceptos globales y personalizados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener los conceptos" });
    }
};

// Obtener un concepto (global o personalizado)
export const getUserConcept = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        // Buscar en la tabla de conceptos personalizados primero
        const userConcept = await UserConcept.findOne({ where: { id, user_id : authorUid} });

        if (userConcept) {
            return res.json({ concept: userConcept });
        } else {
            res.status(404).json({ msg: 'Concepto no encontrado' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el concepto' });
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

        res.json({
            msg: 'Concepto creado exitosamente',
            concept: newConcept
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear el concepto' });
    }
};

// Editar un concepto global (crea una copia en los personalizados si no existe)
export const updateUserConcept = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const id = parseInt(req.params.id, 10); // ID del concepto global
    const { description, unit_price } = req.body;

    try {

        // Si el concepto global no existe, buscar en los conceptos personalizados
        let userConcept = await UserConcept.findOne({   
            where: { user_id:authorUid, id },
        });
        
        if (userConcept) {
            // Si existe, actualizar el concepto personalizado
            await userConcept.update({
                description: description || userConcept.description,
                unit_price: unit_price || userConcept.unit_price,
            });

            res.json({
                msg: "Concepto personalizado actualizado",
                concept: userConcept,
            });
        } else {
            res.status(404).json({ msg: 'Concepto no encontrado' });
        }

        
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al personalizar el concepto" });
    }
};

// Eliminar un concepto personalizado
export const deleteUserConcept = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const userConcept = await UserConcept.findOne({ where: { id, user_id:authorUid } });

        if (!userConcept) {
            return res.status(404).json({ msg: 'Concepto no encontrado' });
        }

        // Verificar si existe una relación en PaymentUser
        const relatedPayments = await PaymentUser.findOne({ where: { conceptId: id } });

        if (relatedPayments) {
            return res.status(400).json({ msg: 'No se puede eliminar el concepto porque está asociado a pagos' });
        }

        await userConcept.destroy();
        res.json({ msg: 'Concepto eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el concepto' });
    }
};

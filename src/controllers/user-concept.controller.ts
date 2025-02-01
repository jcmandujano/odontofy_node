import { Request, Response } from "express";
import Concept from "../models/concept.model";
import UserConcept from "../models/user_concept.model";

// Listar todos los conceptos (globales y personalizados del usuario)
export const listUserConcepts = async (req: Request, res: Response) => {
    const { authorUid } = req;
    try {
        // Obtener todos los conceptos globales
        const globalConcepts = await Concept.findAll();

        // Obtener conceptos personalizados del usuario
        const userConcepts = await UserConcept.findAll({ where: { user_id:authorUid } });

        // Crear un set de IDs de los conceptos personalizados
        const personalizedConceptIds = new Set(userConcepts.map((uc) => uc.concept_id));

        // Filtrar los conceptos globales que no han sido personalizados
        const filteredGlobalConcepts = globalConcepts.filter(
            (concept) => !personalizedConceptIds.has(concept.id)
        );

        res.json({
            concepts: [...filteredGlobalConcepts, ...userConcepts], // Combinar conceptos globales y personalizados
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
        }

        // Si no está en la tabla personalizada, buscar en la tabla global
        const concept = await Concept.findByPk(id);

        if (concept) {
            return res.json({ concept });
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
        // Verificar si el concepto global existe
        const globalConcept = await Concept.findByPk(id);

        //Si el concepto global existe, clonamos con la informacion customizada
        if (globalConcept) {
            console.log("Quieres editar o clonar un concepto global");
            // crea una copia personalizada
            let userConcept = await UserConcept.create({
                user_id:authorUid || 0,
                concept_id: id,
                description: description || globalConcept.description,
                unit_price: unit_price || globalConcept.unit_price,
                is_custom: false,
            });

            res.json({
                msg: "Concepto global copiado y personalizado",
                concept: userConcept,
            });
        }else{
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

        await userConcept.destroy();
        res.json({ msg: 'Concepto eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el concepto' });
    }
};

import { body, param, query } from "express-validator";
import { validarCampos } from "./validarCampos";

const validateIdParam = (name: string, label: string) =>
    param(name)
        .isInt({ min: 1 })
        .withMessage(`${label} debe ser un numero entero valido`);

const optionalReferenceBody = (name: string, label: string) =>
    body(name)
        .optional({ values: "null" })
        .isInt({ min: 1 })
        .withMessage(`${label} debe ser un numero entero valido`);

export const validateListEvolutionNotes = [
    validateIdParam("patient_id", "El paciente"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("La pagina debe ser un numero entero mayor a 0"),
    query("limit")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El limite debe ser un numero entero mayor a 0"),
    query("treatment_plan_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El plan de tratamiento debe ser un numero entero valido"),
    query("treatment_plan_item_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El item del plan de tratamiento debe ser un numero entero valido"),
    validarCampos,
];

export const validateEvolutionNoteIdParams = [
    validateIdParam("patient_id", "El paciente"),
    validateIdParam("id", "La nota de evolucion"),
    validarCampos,
];

export const validateCreateEvolutionNote = [
    validateIdParam("patient_id", "El paciente"),
    body("note")
        .isString()
        .withMessage("La nota debe ser texto")
        .trim()
        .notEmpty()
        .withMessage("La nota es obligatoria"),
    optionalReferenceBody("treatment_plan_id", "El plan de tratamiento"),
    optionalReferenceBody("treatment_plan_item_id", "El item del plan de tratamiento"),
    validarCampos,
];

export const validateUpdateEvolutionNote = [
    validateIdParam("patient_id", "El paciente"),
    validateIdParam("id", "La nota de evolucion"),
    body("note")
        .optional()
        .isString()
        .withMessage("La nota debe ser texto")
        .trim()
        .notEmpty()
        .withMessage("La nota no puede estar vacia"),
    optionalReferenceBody("treatment_plan_id", "El plan de tratamiento"),
    optionalReferenceBody("treatment_plan_item_id", "El item del plan de tratamiento"),
    validarCampos,
];

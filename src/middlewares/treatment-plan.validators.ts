import { body, param } from 'express-validator';
import {
  TREATMENT_PLAN_ITEM_PRIORITIES,
  TREATMENT_PLAN_ITEM_STATUSES,
  TREATMENT_PLAN_STATUSES,
} from '../types/treatment-plan.enums';
import { validarCampos } from './validarCampos';

const validateIdParam = (name: string, label: string) =>
  param(name)
    .isInt({ min: 1 })
    .withMessage(`${label} debe ser un número entero válido`);

const optionalString = (name: string, label: string) =>
  body(name)
    .optional({ values: 'null' })
    .isString()
    .withMessage(`${label} debe ser texto`)
    .trim();

const optionalDate = (name: string, label: string) =>
  body(name)
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage(`${label} debe tener formato de fecha válido`);

const treatmentPlanBodyValidators = [
  optionalString('description', 'La descripción'),
  optionalString('diagnosis', 'El diagnóstico'),
  optionalString('patient_complaint', 'El motivo de consulta'),
  optionalString('clinical_observations', 'Las observaciones clínicas'),
  optionalString('prognosis', 'El pronóstico'),
  optionalString('acceptance_notes', 'Las notas de aceptación'),
  optionalDate('estimated_start_date', 'La fecha estimada de inicio'),
  optionalDate('estimated_end_date', 'La fecha estimada de finalización'),
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El descuento no puede ser negativo'),
];

export const validatePatientTreatmentPlansParams = [
  validateIdParam('patientId', 'El paciente'),
  validarCampos,
];

export const validateTreatmentPlanIdParam = [
  validateIdParam('id', 'El plan de tratamiento'),
  validarCampos,
];

export const validateCreateTreatmentPlan = [
  validateIdParam('patientId', 'El paciente'),
  body('title')
    .isString()
    .withMessage('El título debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio'),
  ...treatmentPlanBodyValidators,
  validarCampos,
];

export const validateUpdateTreatmentPlan = [
  validateIdParam('id', 'El plan de tratamiento'),
  body('title')
    .optional()
    .isString()
    .withMessage('El título debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El título no puede estar vacío'),
  ...treatmentPlanBodyValidators,
  validarCampos,
];

export const validateUpdateTreatmentPlanStatus = [
  validateIdParam('id', 'El plan de tratamiento'),
  body('status')
    .isIn(TREATMENT_PLAN_STATUSES)
    .withMessage('El estado del plan de tratamiento no es válido'),
  optionalString('acceptance_notes', 'Las notas de aceptación'),
  validarCampos,
];

const validateTreatmentPlanItemParams = [
  validateIdParam('id', 'El plan de tratamiento'),
  validateIdParam('itemId', 'El ítem del plan de tratamiento'),
];

const treatmentPlanItemOptionalBodyValidators = [
  body('user_concept_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El concepto debe ser un número entero válido'),
  optionalString('description', 'La descripción'),
  optionalString('tooth', 'El diente'),
  optionalString('area', 'El área'),
  optionalString('phase', 'La fase'),
  body('priority')
    .optional({ values: 'null' })
    .isIn(TREATMENT_PLAN_ITEM_PRIORITIES)
    .withMessage('La prioridad del ítem no es válida'),
  optionalString('notes', 'Las notas'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero válido'),
];

export const validateCreateTreatmentPlanItem = [
  validateIdParam('id', 'El plan de tratamiento'),
  body('name')
    .isString()
    .withMessage('El nombre del ítem debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El nombre del ítem es obligatorio'),
  body('quantity')
    .isFloat({ gt: 0 })
    .withMessage('La cantidad debe ser mayor a 0'),
  body('unit_price')
    .isFloat({ min: 0 })
    .withMessage('El precio unitario no puede ser negativo'),
  ...treatmentPlanItemOptionalBodyValidators,
  validarCampos,
];

export const validateUpdateTreatmentPlanItem = [
  ...validateTreatmentPlanItemParams,
  body('name')
    .optional()
    .isString()
    .withMessage('El nombre del ítem debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El nombre del ítem no puede estar vacío'),
  body('quantity')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('La cantidad debe ser mayor a 0'),
  body('unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio unitario no puede ser negativo'),
  ...treatmentPlanItemOptionalBodyValidators,
  validarCampos,
];

export const validateDeleteTreatmentPlanItem = [
  ...validateTreatmentPlanItemParams,
  validarCampos,
];

export const validateUpdateTreatmentPlanItemStatus = [
  ...validateTreatmentPlanItemParams,
  body('status')
    .isIn(TREATMENT_PLAN_ITEM_STATUSES)
    .withMessage('El estado del ítem no es válido'),
  validarCampos,
];

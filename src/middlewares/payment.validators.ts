import { body, param, query } from 'express-validator';
import { PAYMENT_METHODS } from '../types/payment.enums';
import { validarCampos } from './validarCampos';

const MAX_MONEY_VALUE = 99_999_999.99;

const validatePatientId = param('patient_id')
  .isInt({ min: 1 })
  .withMessage('El paciente debe ser un numero entero valido');

const validatePaymentId = param('id')
  .isInt({ min: 1 })
  .withMessage('El pago debe ser un numero entero valido');

const paymentBodyValidators = [
  body('payment_date')
    .isISO8601({ strict: true })
    .withMessage('La fecha de pago debe tener formato YYYY-MM-DD'),
  body('income')
    .isFloat({ min: 0, max: MAX_MONEY_VALUE })
    .withMessage('El ingreso debe ser un importe valido mayor o igual a 0'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: MAX_MONEY_VALUE })
    .withMessage('El descuento debe ser un importe valido mayor o igual a 0'),
  body('concepts')
    .isArray({ min: 1 })
    .withMessage('El pago debe incluir al menos un concepto'),
  body('concepts.*.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El identificador del concepto de pago no es valido'),
  body('concepts.*.conceptId')
    .isInt({ min: 1 })
    .withMessage('El concepto debe ser un numero entero valido'),
  body('concepts.*.paymentMethod')
    .isIn(PAYMENT_METHODS)
    .withMessage('El metodo de pago no es valido'),
  body('concepts.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un numero entero mayor a 0'),
];

export const validateListPayments = [
  validatePatientId,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La pagina debe ser un numero entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El limite debe ser un numero entero entre 1 y 100'),
  validarCampos,
];

export const validatePaymentParams = [validatePatientId, validatePaymentId, validarCampos];

export const validateCreatePayment = [
  validatePatientId,
  ...paymentBodyValidators,
  validarCampos,
];

export const validateUpdatePayment = [
  validatePatientId,
  validatePaymentId,
  ...paymentBodyValidators,
  validarCampos,
];

export const validatePaymentBalance = [
  query('currentMonthOnly')
    .optional()
    .isBoolean()
    .withMessage('currentMonthOnly debe ser verdadero o falso'),
  validarCampos,
];

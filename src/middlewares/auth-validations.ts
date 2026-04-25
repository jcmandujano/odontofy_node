import { body } from 'express-validator';

// Validaciones para registro de usuario
export const registerValidations = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('middle_name')
        .optional()
        .trim()
        .isLength({ min: 0, max: 50 })
        .withMessage('El segundo nombre debe tener máximo 50 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]*$/)
        .withMessage('El segundo nombre solo puede contener letras y espacios'),

    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('Los apellidos son obligatorios')
        .isLength({ min: 2, max: 50 })
        .withMessage('Los apellidos deben tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Los apellidos solo pueden contener letras y espacios'),

    body('date_of_birth')
        .notEmpty()
        .withMessage('La fecha de nacimiento es obligatoria')
        .isISO8601()
        .withMessage('La fecha de nacimiento debe tener un formato válido')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18 || age > 120) {
                throw new Error('La edad debe estar entre 18 y 120 años');
            }
            return true;
        }),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('El teléfono es obligatorio')
        .matches(/^[\+]?[0-9\-\s\(\)]{10,15}$/)
        .withMessage('El teléfono debe tener un formato válido'),

    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('El email debe tener un formato válido'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),

    body('avatar')
        .optional()
        .isURL()
        .withMessage('El avatar debe ser una URL válida')
];

// Validaciones para login
export const loginValidations = [
    body('username')
        .isEmail()
        .normalizeEmail()
        .withMessage('El email debe tener un formato válido'),

    body('password')
        .notEmpty()
        .withMessage('La contraseña es obligatoria')
];

// Validaciones para recuperación de contraseña
export const forgotPasswordValidations = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('El email debe tener un formato válido')
];

// Validaciones para reset password
export const resetPasswordValidations = [
    body('token')
        .notEmpty()
        .withMessage('El token es obligatorio')
        .isLength({ min: 32, max: 64 })
        .withMessage('El token tiene un formato inválido'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial')
];
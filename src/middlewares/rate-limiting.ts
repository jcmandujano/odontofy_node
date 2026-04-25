import rateLimit from 'express-rate-limit';

// Rate limiting para login - máximo 5 intentos por 15 minutos
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por ventana
    message: {
        error: 'Demasiados intentos de login',
        message: 'Has excedido el límite de intentos de login. Intenta de nuevo en 15 minutos.',
        retryAfter: 15 * 60 // segundos
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // no cuenta los exitosos
    skip: (req) => req.ip === '127.0.0.1' // permitir localhost para desarrollo
});

// Rate limiting para registro - máximo 3 registros por hora por IP
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    message: {
        error: 'Demasiados intentos de registro',
        message: 'Has excedido el límite de registros. Intenta de nuevo en 1 hora.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para recuperación de contraseña - máximo 3 por hora
export const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    message: {
        error: 'Demasiados intentos de recuperación',
        message: 'Has excedido el límite de solicitudes de recuperación. Intenta de nuevo en 1 hora.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting general para endpoints de auth - máximo 10 por minuto
export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10,
    message: {
        error: 'Demasiadas solicitudes',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo en 1 minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});
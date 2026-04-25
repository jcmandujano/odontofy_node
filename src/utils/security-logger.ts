import winston from 'winston';

// Configuración del logger para seguridad
export const securityLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'odontofy-auth' },
    transports: [
        // Log de errores de seguridad
        new winston.transports.File({
            filename: 'logs/security.log',
            level: 'warn'
        }),
        // Log general de auth
        new winston.transports.File({
            filename: 'logs/auth.log'
        })
    ]
});

// En desarrollo, también loggear a consola
if (process.env.NODE_ENV !== 'production') {
    securityLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Funciones helper para logging de eventos de seguridad
export const logAuthEvent = (event: string, userId?: number, email?: string, ip?: string, userAgent?: string, details?: any) => {
    securityLogger.info('AUTH_EVENT', {
        event,
        userId,
        email,
        ip,
        userAgent,
        details,
        timestamp: new Date().toISOString()
    });
};

export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';

    securityLogger.log(level, 'SECURITY_EVENT', {
        event,
        severity,
        details,
        timestamp: new Date().toISOString()
    });
};
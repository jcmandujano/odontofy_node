import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import pino, { Logger } from 'pino';
import pinoHttp from 'pino-http';

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const incomingRequestId = (req: IncomingMessage): string | undefined => {
  const value = req.headers['x-request-id'];
  return typeof value === 'string' && requestIdPattern.test(value)
    ? value
    : undefined;
};

export const applicationLogger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
    ],
    censor: '[REDACTED]',
  },
});

export const createRequestLogger = (logger: Logger = applicationLogger) =>
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const requestId = incomingRequestId(req) ?? randomUUID();
      res.setHeader('X-Request-Id', requestId);
      return requestId;
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.url === '/health/live',
    },
  });

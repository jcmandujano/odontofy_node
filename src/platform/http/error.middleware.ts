import { ErrorRequestHandler, RequestHandler } from 'express';

import { ApiError } from './api-error';
import { sendError } from './response';

interface HttpParserError extends Error {
  status?: number;
  type?: string;
}

const isHttpParserError = (error: unknown): error is HttpParserError =>
  error instanceof Error &&
  'status' in error &&
  typeof (error as HttpParserError).status === 'number';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(req, res, {
    code: 'ROUTE_NOT_FOUND',
    message: 'Ruta no encontrada',
    statusCode: 404,
  });
};

export const apiErrorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    sendError(req, res, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
    return;
  }

  if (isHttpParserError(error) && error.status === 400) {
    sendError(req, res, {
      code: 'MALFORMED_JSON',
      message: 'El cuerpo JSON no es valido',
      statusCode: 400,
    });
    return;
  }

  if (isHttpParserError(error) && error.status === 413) {
    sendError(req, res, {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'El cuerpo de la solicitud excede el limite permitido',
      statusCode: 413,
    });
    return;
  }

  req.log.error({ err: error, requestId: req.requestId }, 'Unhandled API error');
  sendError(req, res, {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrio un error interno',
    statusCode: 500,
  });
};

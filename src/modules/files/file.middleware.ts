import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { ApiError } from '../../platform/http/api-error';
import { FileError } from './file.types';

const maxBytes = Number(process.env.FILE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);

export const receivePdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1, fields: 4 },
}).single('file');

export const fileErrorHandler: ErrorRequestHandler = (error: unknown, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    next(new ApiError({ code: 'FILE_INVALID', message: 'El archivo excede los limites permitidos', statusCode: 400 }));
    return;
  }
  if (!(error instanceof FileError)) {
    next(error);
    return;
  }
  const statusCode = error.code === 'FILE_NOT_FOUND' ? 404
    : error.code === 'FILE_PROVIDER_UNAVAILABLE' ? 503
      : error.code === 'FILE_IN_USE' || error.code === 'FILE_NOT_AVAILABLE' ? 409
        : 400;
  next(new ApiError({ code: error.code, message: error.message, statusCode }));
};

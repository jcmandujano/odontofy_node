import type { ErrorRequestHandler } from 'express';

import { ApiError } from '../../platform/http/api-error';
import { FileError } from '../files/file.types';
import { ConsentError } from './consent.types';

export const consentErrorHandler: ErrorRequestHandler = (error: unknown, _req, _res, next) => {
  if (error instanceof FileError) {
    next(new ApiError({ code: error.code, message: error.message, statusCode: error.code === 'FILE_NOT_FOUND' ? 404 : 409 }));
    return;
  }
  if (!(error instanceof ConsentError)) {
    next(error);
    return;
  }
  const statusCode = error.code.endsWith('NOT_FOUND') ? 404
    : error.code === 'CONSENT_TEMPLATE_DUPLICATE' || error.code === 'CONSENT_DOCUMENT_ATTACHED' || error.code === 'CONSENT_VOIDED' || error.code === 'CONSENT_TEMPLATE_ARCHIVED' ? 409
      : 422;
  next(new ApiError({ code: error.code, message: error.message, statusCode }));
};

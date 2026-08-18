import { ErrorRequestHandler } from 'express';

import { ApiError } from '../../platform/http/api-error';
import { PatientError } from './patient.types';

export const patientErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof PatientError)) {
    next(error);
    return;
  }

  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: 404,
    })
  );
};

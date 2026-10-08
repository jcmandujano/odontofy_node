import { ErrorRequestHandler } from 'express';

import { ApiError } from '../../platform/http/api-error';
import { OdontogramError } from './odontogram.types';

const statusByCode: Record<OdontogramError['code'], number> = {
  PATIENT_NOT_FOUND: 404,
  ODONTOGRAM_NOT_FOUND: 404,
  ODONTOGRAM_ARCHIVED: 409,
  ODONTOGRAM_FINDING_NOT_FOUND: 404,
  TREATMENT_PLAN_ITEM_NOT_FOUND: 404,
  TREATMENT_PATIENT_MISMATCH: 409,
  INVALID_TOOTH_CODE: 400,
};

export const odontogramErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof OdontogramError)) {
    next(error);
    return;
  }

  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: statusByCode[error.code],
    })
  );
};

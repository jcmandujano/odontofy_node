import { ErrorRequestHandler } from 'express';

import { ApiError } from '../../platform/http/api-error';
import { TreatmentPlanError } from './treatment-plan.types';

const notFoundCodes = new Set([
  'PATIENT_NOT_FOUND',
  'TREATMENT_PLAN_NOT_FOUND',
  'TREATMENT_PLAN_ITEM_NOT_FOUND',
  'USER_CONCEPT_NOT_FOUND',
]);

export const treatmentPlanErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof TreatmentPlanError)) {
    next(error);
    return;
  }

  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: notFoundCodes.has(error.code) ? 404 : 409,
    })
  );
};

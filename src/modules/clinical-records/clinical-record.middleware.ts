import { ErrorRequestHandler } from 'express'

import { ApiError } from '../../platform/http/api-error'
import { ClinicalRecordError } from './clinical-record.types'

const notFoundCodes = new Set([
  'PATIENT_NOT_FOUND',
  'EVOLUTION_NOTE_NOT_FOUND',
  'TREATMENT_PLAN_NOT_FOUND',
  'TREATMENT_PLAN_ITEM_NOT_FOUND',
])

export const clinicalRecordErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof ClinicalRecordError)) {
    next(error)
    return
  }

  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: notFoundCodes.has(error.code) ? 404 : 409,
    })
  )
}

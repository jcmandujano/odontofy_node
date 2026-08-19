import type { ErrorRequestHandler } from 'express'

import { ApiError } from '../../platform/http/api-error'
import { BillingError } from './billing.types'

const statusFor = (code: BillingError['code']) => {
  if (
    code === 'PATIENT_NOT_FOUND' ||
    code === 'BILLING_CONCEPT_NOT_FOUND' ||
    code === 'BILLING_RECORD_NOT_FOUND'
  ) {
    return 404
  }
  if (
    code === 'BILLING_CONCEPT_ARCHIVED' ||
    code === 'BILLING_RECORD_CANCELLED' ||
    code === 'IDEMPOTENCY_KEY_REUSED'
  ) {
    return 409
  }
  return 422
}

export const billingErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next
) => {
  if (!(error instanceof BillingError)) {
    next(error)
    return
  }
  next(
    new ApiError({
      code: error.code,
      message: error.message,
      statusCode: statusFor(error.code),
    })
  )
}

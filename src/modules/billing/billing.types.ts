import type {
  BillingPaymentMethod,
  BillingRecordStatus,
} from '../../types/billing.enums'

export interface BillingConceptData {
  id: number
  description: string
  unitPrice: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BillingItemData {
  id: number
  billingRecordId: number
  conceptId: number
  description: string
  unitPrice: string
  quantity: number
  subtotal: string
}

export interface BillingRecordData {
  id: number
  patientId: number
  occurredOn: string
  subtotal: string
  discount: string
  total: string
  amountReceived: string
  balanceChange: string
  balanceAfter: string
  paymentMethod: BillingPaymentMethod | null
  status: BillingRecordStatus
  version: number
  author: { userId: number; name: string }
  cancelledAt: Date | null
  cancelledBy: { userId: number } | null
  cancellationReason: string | null
  items: BillingItemData[]
  createdAt: Date
  updatedAt: Date
}

export interface BillingRecordRevisionData extends BillingRecordData {
  revisionId: number
  action: 'CREATED' | 'CORRECTED' | 'CANCELLED'
  changedBy: { userId: number; name: string }
  changeReason: string | null
  recordedAt: Date
}

export interface BillingPage<T> {
  records: T[]
  total: number
}

export type BillingErrorCode =
  | 'PATIENT_NOT_FOUND'
  | 'BILLING_CONCEPT_NOT_FOUND'
  | 'BILLING_RECORD_NOT_FOUND'
  | 'BILLING_CONCEPT_ARCHIVED'
  | 'BILLING_RECORD_CANCELLED'
  | 'BILLING_DISCOUNT_EXCEEDS_SUBTOTAL'
  | 'BILLING_PAYMENT_METHOD_REQUIRED'
  | 'BILLING_AMOUNT_LIMIT_EXCEEDED'
  | 'IDEMPOTENCY_KEY_REUSED'

export class BillingError extends Error {
  readonly code: BillingErrorCode

  constructor(code: BillingErrorCode, message: string) {
    super(message)
    this.name = 'BillingError'
    this.code = code
  }
}

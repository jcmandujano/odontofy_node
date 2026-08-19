export const BILLING_PAYMENT_METHODS = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
  'MIXED',
] as const

export const BILLING_RECORD_STATUSES = ['POSTED', 'CANCELLED'] as const

export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number]
export type BillingRecordStatus = (typeof BILLING_RECORD_STATUSES)[number]

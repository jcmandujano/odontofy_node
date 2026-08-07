export const PAYMENT_METHODS = [
  'CASH',
  'DEBIT',
  'CREDIT',
  'TRANSFERENCE',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

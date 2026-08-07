import type { PaymentMethod } from '../types/payment.enums';

export interface PaymentConceptInput {
  id?: number;
  conceptId: number;
  paymentMethod: PaymentMethod;
  quantity: number;
}

export interface SavePaymentInput {
  payment_date: string;
  income: number;
  discount?: number;
  concepts: PaymentConceptInput[];
}

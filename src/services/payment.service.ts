import { randomUUID } from 'node:crypto';

import dayjs from 'dayjs';
import { Op, Transaction } from 'sequelize';
import { ZodError } from 'zod';
import type { SavePaymentInput } from '../dtos/payment.dto';
import { createBillingRecordSchema } from '../modules/billing/billing.schemas';
import { BillingService } from '../modules/billing/billing.service';
import { BillingError } from '../modules/billing/billing.types';
import Patient from '../models/patient.model';
import Payment from '../models/payment.model';
import PaymentUser from '../models/payment-user.model';
import type { PaginatedResponse } from '../types/api-response';

const MAX_MONEY_IN_CENTS = 999_999_999_999;
const billingService = new BillingService();

export class PaymentServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentServiceError';
    this.statusCode = statusCode;
  }
}

const toCents = (value: number | string, field: string) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new PaymentServiceError(`${field} debe ser un importe valido`);
  }

  return Math.round(numericValue * 100);
};

const fromCents = (value: number) => Number((value / 100).toFixed(2));

const legacyDecimal = (value: number | string, field: string) => {
  const cents = toCents(value, field);
  ensureMoneyFitsColumn(cents, field);
  if (cents < 0)
    throw new PaymentServiceError(`${field} no puede ser negativo`);
  return (cents / 100).toFixed(2);
};

const ensureMoneyFitsColumn = (valueInCents: number, field: string) => {
  if (Math.abs(valueInCents) > MAX_MONEY_IN_CENTS) {
    throw new PaymentServiceError(
      `${field} excede el importe maximo permitido`
    );
  }
};

const ensurePatientBelongsToUser = async (
  userId: number,
  patientId: number,
  transaction?: Transaction
) => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
  });

  if (!patient) {
    throw new PaymentServiceError(
      'El paciente no existe o no pertenece al usuario autenticado',
      404
    );
  }

  return patient;
};

const getPaymentForUser = async (
  userId: number,
  patientId: number,
  paymentId: number,
  transaction?: Transaction
) => {
  const payment = await Payment.findOne({
    where: { id: paymentId, patientId, user_id: userId, status: 'POSTED' },
    transaction,
  });

  if (!payment) {
    throw new PaymentServiceError(
      'El pago no existe o no pertenece al paciente indicado',
      404
    );
  }

  return payment;
};

const billingInput = (input: SavePaymentInput) => {
  if (!Array.isArray(input.concepts) || input.concepts.length === 0) {
    throw new PaymentServiceError('El pago debe incluir al menos un concepto');
  }
  const amountReceived = legacyDecimal(input.income, 'El ingreso');
  const methods = new Set(
    input.concepts.map((concept) => concept.paymentMethod)
  );
  const singleMethod = methods.values().next().value;
  const paymentMethod =
    amountReceived === '0.00'
      ? null
      : methods.size > 1
        ? ('MIXED' as const)
        : singleMethod === 'DEBIT'
          ? ('DEBIT_CARD' as const)
          : singleMethod === 'CREDIT'
            ? ('CREDIT_CARD' as const)
            : singleMethod === 'TRANSFERENCE'
              ? ('BANK_TRANSFER' as const)
              : ('CASH' as const);
  return createBillingRecordSchema.parse({
    occurredOn: input.payment_date,
    discount: legacyDecimal(input.discount ?? 0, 'El descuento'),
    amountReceived,
    paymentMethod,
    items: input.concepts.map((concept) => ({
      conceptId: Number(concept.conceptId),
      quantity: Number(concept.quantity),
    })),
  });
};

const translateBillingError = (error: unknown): never => {
  if (error instanceof BillingError) {
    const statusCode = error.code.endsWith('NOT_FOUND') ? 404 : 400;
    throw new PaymentServiceError(error.message, statusCode);
  }
  if (error instanceof ZodError) {
    throw new PaymentServiceError('El pago contiene valores no validos');
  }
  throw error;
};

const attachConcepts = async (payments: Payment[]) => {
  if (payments.length === 0) return [];

  const paymentConcepts = await PaymentUser.findAll({
    where: { paymentId: { [Op.in]: payments.map(({ id }) => id) } },
    order: [['id', 'ASC']],
  });

  const conceptsByPayment = new Map<number, PaymentUser[]>();
  for (const paymentConcept of paymentConcepts) {
    const concepts = conceptsByPayment.get(paymentConcept.paymentId) ?? [];
    concepts.push(paymentConcept);
    conceptsByPayment.set(paymentConcept.paymentId, concepts);
  }

  return payments.map((payment) => ({
    ...payment.toJSON(),
    subtotal: fromCents(
      toCents(payment.total, 'El total') +
        toCents(payment.discount, 'El descuento')
    ),
    concepts: (conceptsByPayment.get(payment.id) ?? []).map((concept) => ({
      id: concept.id,
      paymentId: concept.paymentId,
      conceptId: concept.conceptId,
      paymentMethod: concept.paymentMethod,
      quantity: concept.quantity,
      description: concept.description_snapshot,
      unitPrice: Number(concept.unit_price_snapshot),
    })),
  }));
};

export const listPayments = async (
  userId: number,
  patientId: number,
  page = 1,
  limit = 10
): Promise<
  PaginatedResponse<Awaited<ReturnType<typeof attachConcepts>>[number]>
> => {
  await ensurePatientBelongsToUser(userId, patientId);

  const offset = (page - 1) * limit;
  const { count, rows } = await Payment.findAndCountAll({
    where: { patientId, user_id: userId, status: 'POSTED' },
    limit,
    offset,
    order: [
      ['payment_date', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  const payments = await attachConcepts(rows);

  return {
    total: count,
    page,
    perPage: limit,
    totalPages: Math.ceil(count / limit),
    results: payments,
  };
};

export const getPaymentById = async (
  userId: number,
  patientId: number,
  paymentId: number
) => {
  const payment = await getPaymentForUser(userId, patientId, paymentId);
  const [paymentWithConcepts] = await attachConcepts([payment]);

  return paymentWithConcepts;
};

export const createPayment = async (
  userId: number,
  patientId: number,
  input: SavePaymentInput
) => {
  try {
    const translated = billingInput(input);
    const idempotencyKey = randomUUID();
    const record = await billingService.createRecord(
      userId,
      patientId,
      translated,
      idempotencyKey
    );
    return getPaymentById(userId, patientId, record.id);
  } catch (error) {
    return translateBillingError(error);
  }
};

export const updatePayment = async (
  userId: number,
  patientId: number,
  paymentId: number,
  input: SavePaymentInput
) => {
  try {
    await billingService.correctRecord(userId, patientId, paymentId, {
      ...billingInput(input),
      changeReason: 'Correccion solicitada mediante API legacy',
    });
    return getPaymentById(userId, patientId, paymentId);
  } catch (error) {
    return translateBillingError(error);
  }
};

export const deletePayment = async (
  userId: number,
  patientId: number,
  paymentId: number
) => {
  try {
    await billingService.cancelRecord(userId, patientId, paymentId, {
      changeReason: 'Cancelacion solicitada mediante API legacy',
    });
  } catch (error) {
    return translateBillingError(error);
  }
};

export const getPaymentBalance = async (
  userId: number,
  currentMonthOnly: boolean
) => {
  const summary = await billingService.summary(
    userId,
    currentMonthOnly
      ? {
          dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
          dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
        }
      : {}
  );

  return {
    totalPayments: Number(summary.totalBilled),
    totalDebt: Number(summary.netChange),
    totalIncome: Number(summary.totalReceived),
    totalDiscount: Number(summary.totalDiscount),
  };
};

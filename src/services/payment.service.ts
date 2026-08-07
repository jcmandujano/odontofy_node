import dayjs from 'dayjs';
import { Op, Transaction } from 'sequelize';
import db from '../db/connection';
import type { SavePaymentInput } from '../dtos/payment.dto';
import Patient from '../models/patient.model';
import Payment from '../models/payment.model';
import PaymentUser from '../models/payment-user.model';
import UserConcept from '../models/user_concept.model';
import type { PaginatedResponse } from '../types/api-response';

const MAX_MONEY_IN_CENTS = 9_999_999_999;

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

const ensureMoneyFitsColumn = (valueInCents: number, field: string) => {
  if (Math.abs(valueInCents) > MAX_MONEY_IN_CENTS) {
    throw new PaymentServiceError(`${field} excede el importe maximo permitido`);
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
    where: { id: paymentId, patientId, user_id: userId },
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

const calculatePaymentAmounts = async (
  userId: number,
  input: SavePaymentInput,
  transaction: Transaction
) => {
  if (!Array.isArray(input.concepts) || input.concepts.length === 0) {
    throw new PaymentServiceError('El pago debe incluir al menos un concepto');
  }

  const conceptIds = [...new Set(input.concepts.map(({ conceptId }) => Number(conceptId)))];
  const userConcepts = await UserConcept.findAll({
    where: {
      id: { [Op.in]: conceptIds },
      user_id: userId,
    },
    transaction,
  });

  if (userConcepts.length !== conceptIds.length) {
    throw new PaymentServiceError(
      'Uno o mas conceptos no existen o no pertenecen al usuario autenticado'
    );
  }

  const conceptPriceInCents = new Map(
    userConcepts.map((concept) => [
      concept.id,
      toCents(concept.unit_price, `El precio del concepto ${concept.id}`),
    ])
  );

  const subtotalInCents = input.concepts.reduce((subtotal, concept) => {
    const quantity = Number(concept.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new PaymentServiceError('La cantidad de cada concepto debe ser un entero mayor a 0');
    }

    const unitPriceInCents = conceptPriceInCents.get(Number(concept.conceptId));
    if (unitPriceInCents === undefined) {
      throw new PaymentServiceError('No fue posible obtener el precio de uno de los conceptos');
    }

    return subtotal + unitPriceInCents * quantity;
  }, 0);

  const requestedDiscountInCents = toCents(input.discount ?? 0, 'El descuento');
  const incomeInCents = toCents(input.income, 'El ingreso');

  if (requestedDiscountInCents < 0) {
    throw new PaymentServiceError('El descuento no puede ser negativo');
  }

  if (incomeInCents < 0) {
    throw new PaymentServiceError('El ingreso no puede ser negativo');
  }

  ensureMoneyFitsColumn(subtotalInCents, 'El subtotal');
  const discountInCents = Math.min(requestedDiscountInCents, subtotalInCents);
  const totalInCents = subtotalInCents - discountInCents;
  const debtInCents = totalInCents - incomeInCents;
  ensureMoneyFitsColumn(incomeInCents, 'El ingreso');
  ensureMoneyFitsColumn(debtInCents, 'El adeudo');

  return {
    subtotal: fromCents(subtotalInCents),
    discount: fromCents(discountInCents),
    total: fromCents(totalInCents),
    income: fromCents(incomeInCents),
    debt: fromCents(debtInCents),
  };
};

const savePaymentConcepts = async (
  paymentId: number,
  input: SavePaymentInput,
  transaction: Transaction
) => {
  await PaymentUser.bulkCreate(
    input.concepts.map((concept) => ({
      paymentId,
      conceptId: Number(concept.conceptId),
      paymentMethod: concept.paymentMethod,
      quantity: Number(concept.quantity),
    })),
    { transaction }
  );
};

const attachConcepts = async (userId: number, payments: Payment[]) => {
  if (payments.length === 0) return [];

  const paymentConcepts = await PaymentUser.findAll({
    where: { paymentId: { [Op.in]: payments.map(({ id }) => id) } },
    include: [
      {
        model: UserConcept,
        as: 'userConcept',
        attributes: ['id', 'description', 'unit_price'],
        where: { user_id: userId },
        required: false,
      },
    ],
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
    subtotal: fromCents(toCents(payment.total, 'El total') + toCents(payment.discount, 'El descuento')),
    concepts: (conceptsByPayment.get(payment.id) ?? []).map((concept) => ({
      id: concept.id,
      paymentId: concept.paymentId,
      conceptId: concept.conceptId,
      paymentMethod: concept.paymentMethod,
      quantity: concept.quantity,
      description: concept.userConcept ? String(concept.userConcept.description) : null,
      unitPrice: concept.userConcept ? Number(concept.userConcept.unit_price) : null,
    })),
  }));
};

export const listPayments = async (
  userId: number,
  patientId: number,
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Awaited<ReturnType<typeof attachConcepts>>[number]>> => {
  await ensurePatientBelongsToUser(userId, patientId);

  const offset = (page - 1) * limit;
  const { count, rows } = await Payment.findAndCountAll({
    where: { patientId, user_id: userId },
    limit,
    offset,
    order: [
      ['payment_date', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  const payments = await attachConcepts(userId, rows);

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
  const [paymentWithConcepts] = await attachConcepts(userId, [payment]);

  return paymentWithConcepts;
};

export const createPayment = async (
  userId: number,
  patientId: number,
  input: SavePaymentInput
) => {
  const paymentId = await db.transaction(async (transaction) => {
    await ensurePatientBelongsToUser(userId, patientId, transaction);
    const amounts = await calculatePaymentAmounts(userId, input, transaction);
    const payment = await Payment.create(
      {
        user_id: userId,
        patientId,
        payment_date: input.payment_date,
        income: amounts.income,
        debt: amounts.debt,
        total: amounts.total,
        discount: amounts.discount,
      },
      { transaction }
    );

    await savePaymentConcepts(payment.id, input, transaction);
    return payment.id;
  });

  return getPaymentById(userId, patientId, paymentId);
};

export const updatePayment = async (
  userId: number,
  patientId: number,
  paymentId: number,
  input: SavePaymentInput
) => {
  await db.transaction(async (transaction) => {
    const payment = await getPaymentForUser(userId, patientId, paymentId, transaction);
    const amounts = await calculatePaymentAmounts(userId, input, transaction);

    await payment.update(
      {
        payment_date: input.payment_date,
        income: amounts.income,
        debt: amounts.debt,
        total: amounts.total,
        discount: amounts.discount,
      },
      { transaction }
    );

    await PaymentUser.destroy({ where: { paymentId }, transaction });
    await savePaymentConcepts(paymentId, input, transaction);
  });

  return getPaymentById(userId, patientId, paymentId);
};

export const deletePayment = async (
  userId: number,
  patientId: number,
  paymentId: number
) => {
  await db.transaction(async (transaction) => {
    const payment = await getPaymentForUser(userId, patientId, paymentId, transaction);
    await PaymentUser.destroy({ where: { paymentId }, transaction });
    await payment.destroy({ transaction });
  });
};

export const getPaymentBalance = async (userId: number, currentMonthOnly: boolean) => {
  const dateFilter = currentMonthOnly
    ? {
        payment_date: {
          [Op.between]: [
            dayjs().startOf('month').format('YYYY-MM-DD'),
            dayjs().endOf('month').format('YYYY-MM-DD'),
          ],
        },
      }
    : {};
  const where = { user_id: userId, ...dateFilter };
  const [totalPayments, totalDebt, totalIncome, totalDiscount] = await Promise.all([
    Payment.sum('total', { where }),
    Payment.sum('debt', { where }),
    Payment.sum('income', { where }),
    Payment.sum('discount', { where }),
  ]);

  return {
    totalPayments: Number(totalPayments ?? 0),
    totalDebt: Number(totalDebt ?? 0),
    totalIncome: Number(totalIncome ?? 0),
    totalDiscount: Number(totalDiscount ?? 0),
  };
};

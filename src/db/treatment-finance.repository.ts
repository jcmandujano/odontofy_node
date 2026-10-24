import { Op, Transaction } from 'sequelize'
import Patient from '../models/patient.model'
import Payment from '../models/payment.model'
import PaymentAllocation from '../models/payment-allocation.model'
import TreatmentCharge from '../models/treatment-charge.model'
import TreatmentPlanItem from '../models/treatment-plan-item.model'
import { ApiError } from '../platform/http/api-error'
import { amount, cents } from '../platform/finance-money'

export const financialConflict = (message: string) =>
  new ApiError({ code: 'TREATMENT_FINANCIAL_LOCKED', message, statusCode: 409 })
export const planFinancialLocked = async (
  planId: number,
  transaction: Transaction
) =>
  (await TreatmentPlanItem.count({
    where: {
      treatment_plan_id: planId,
      charge_discount_amount: { [Op.ne]: null },
    },
    transaction,
  })) > 0

export const assertPlanFinancialEditable = async (
  planId: number,
  transaction: Transaction
) => {
  if (await planFinancialLocked(planId, transaction))
    throw financialConflict(
      'El plan tiene cargos confirmados. Sus cantidades, servicios y descuento están fijados; los datos clínicos siguen editables.'
    )
}

export const assertTreatmentFinancialEditable = async (
  item: TreatmentPlanItem,
  input: {
    userConceptId?: number | null
    quantity?: string
    unitPrice?: string
    name?: string
  },
  transaction: Transaction
) => {
  if (
    input.userConceptId !== undefined &&
    input.userConceptId !== item.user_concept_id &&
    (await Payment.count({
      where: { advance_treatment_id: item.id, status: 'POSTED' },
      transaction,
    }))
  ) {
    throw financialConflict(
      'El tratamiento tiene anticipos vigentes. No se puede cambiar su vínculo al catálogo; cancela el recibo si necesitas corregirlo.'
    )
  }
  const changed =
    (input.quantity !== undefined &&
      cents(input.quantity) !== cents(item.quantity)) ||
    (input.userConceptId !== undefined &&
      input.userConceptId !== item.user_concept_id) ||
    (input.unitPrice !== undefined &&
      cents(input.unitPrice) !== cents(item.unit_price)) ||
    (input.name !== undefined && input.name !== item.name)
  if (!changed) return
  if (
    item.charge_discount_amount !== null ||
    (item.treatment_plan_id !== null &&
      (await planFinancialLocked(item.treatment_plan_id, transaction)))
  ) {
    throw financialConflict(
      'El tratamiento tiene un cargo o pertenece a una cotización fijada. No se pueden sobrescribir sus importes.'
    )
  }
}

export const allocatedAmounts = async (
  chargeIds: number[],
  transaction?: Transaction
) => {
  const paid = new Map<number, bigint>()
  if (!chargeIds.length) return paid
  const allocations = await PaymentAllocation.findAll({
    where: { charge_id: { [Op.in]: chargeIds } },
    transaction,
  })
  const paymentIds = [...new Set(allocations.map((row) => row.payment_id))]
  const payments = paymentIds.length
    ? await Payment.findAll({
        where: { id: { [Op.in]: paymentIds }, status: 'POSTED' },
        attributes: ['id'],
        transaction,
      })
    : []
  const posted = new Set(payments.map((row) => row.id))
  for (const row of allocations)
    if (posted.has(row.payment_id))
      paid.set(
        row.charge_id,
        (paid.get(row.charge_id) ?? 0n) + cents(row.amount)
      )
  return paid
}

// A patient lock must be held by the caller. Old records are retained; no links are inferred.
export const recalculatePatientFinancialBalance = async (
  patient: Patient,
  transaction: Transaction
) => {
  const records = await Payment.findAll({
    where: { patientId: patient.id, user_id: patient.user_id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  const charges = await TreatmentCharge.findAll({
    where: { patient_id: patient.id },
    transaction,
  })
  const events = [
    ...charges.map((charge) => ({
      date: charge.occurred_on,
      kind: 0,
      id: charge.id,
      delta: cents(charge.total_amount),
      record: null as Payment | null,
    })),
    ...records.map((record) => ({
      date: record.payment_date,
      kind: 1,
      id: record.id,
      delta:
        record.status === 'POSTED'
          ? cents(record.total) - cents(record.income)
          : 0n,
      record,
    })),
  ].sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind - b.kind || a.id - b.id
  )
  let balance = 0n
  for (const event of events) {
    balance += event.delta
    if (balance > 999_999_999_999n || balance < -999_999_999_999n)
      throw new ApiError({
        code: 'BILLING_AMOUNT_LIMIT_EXCEEDED',
        message: 'El saldo del paciente excede el límite permitido',
        statusCode: 409,
      })
    if (event.record && cents(event.record.debt) !== balance)
      await event.record.update({ debt: amount(balance) }, { transaction })
  }
  await patient.update({ debt: amount(balance) }, { transaction })
}

import { Op, Transaction, UniqueConstraintError, WhereOptions } from 'sequelize'
import db from '../../db/connection'
import {
  allocatedAmounts,
  recalculatePatientFinancialBalance,
} from '../../db/treatment-finance.repository'
import Patient from '../../models/patient.model'
import Payment from '../../models/payment.model'
import PaymentAllocation from '../../models/payment-allocation.model'
import PaymentRevision from '../../models/payment-revision.model'
import TreatmentCharge from '../../models/treatment-charge.model'
import TreatmentPlan from '../../models/treatment-plan.model'
import TreatmentPlanItem from '../../models/treatment-plan-item.model'
import User from '../../models/user.model'
import { amount, cents, distributeDiscount } from '../../platform/finance-money'
import { ApiError } from '../../platform/http/api-error'
import type {
  ChargeQuery,
  ConfirmChargeInput,
  TreatmentPaymentInput,
} from './treatment-charge.schemas'

const fail = (code: string, message: string, statusCode = 409): never => {
  throw new ApiError({ code, message, statusCode })
}
const ownedPatient = async (
  userId: number,
  patientId: number,
  transaction?: Transaction
) => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
    ...(transaction && { lock: transaction.LOCK.UPDATE }),
  })
  return patient ?? fail('PATIENT_NOT_FOUND', 'Paciente no encontrado', 404)
}

export class SequelizeTreatmentChargeRepository {
  async list(userId: number, patientId: number, query: ChargeQuery) {
    await ownedPatient(userId, patientId)
    const where: WhereOptions = {
      patient_id: patientId,
      ...(query.scope === 'independent' && { treatment_plan_id: null }),
      ...(query.scope === 'plan' && { treatment_plan_id: { [Op.ne]: null } }),
      ...(query.treatmentPlanId !== undefined && {
        treatment_plan_id: query.treatmentPlanId,
      }),
    }
    const { count, rows } = await TreatmentPlanItem.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['id', 'ASC']],
    })
    const all = await TreatmentPlanItem.findAll({
      where: { patient_id: patientId },
    })
    const plans = await TreatmentPlan.findAll({
      where: { patient_id: patientId, user_id: userId },
    })
    const shares = new Map<number, string>()
    for (const plan of plans) {
      const members = all.filter(item => item.treatment_plan_id === plan.id)
      const eligible = members.filter(item => item.status !== 'CANCELLED')
      if (members.every((item) => item.charge_discount_amount === null)) {
        for (const [id, share] of distributeDiscount(eligible, plan.discount))
          shares.set(id, share)
      }
    }
    const charges = await TreatmentCharge.findAll({
      where: { patient_id: patientId },
    })
    const byItem = new Map(
      charges.map((charge) => [charge.treatment_id, charge])
    )
    const paid = await allocatedAmounts(charges.map((charge) => charge.id))
    const mapRow = (item: TreatmentPlanItem) => {
      const charge = byItem.get(item.id)
      const discount =
        charge?.discount_amount ??
        item.charge_discount_amount ??
        shares.get(item.id) ??
        '0.00'
      const total =
        charge?.total_amount ?? amount(cents(item.subtotal) - cents(discount))
      return {
        treatmentId: item.id,
        treatmentPlanId: item.treatment_plan_id,
        name: item.name,
        clinicalStatus: item.status,
        catalogLinked: item.user_concept_id !== null,
        chargeId: charge?.id ?? null,
        subtotal: String(item.subtotal),
        discount,
        total,
        paid: amount(charge ? (paid.get(charge.id) ?? 0n) : 0n),
        balance: amount(
          charge ? cents(total) - (paid.get(charge.id) ?? 0n) : 0n
        ),
        financialStatus: !charge
          ? 'UNCONFIRMED'
          : cents(total) === (paid.get(charge.id) ?? 0n)
            ? 'PAID'
            : (paid.get(charge.id) ?? 0n) > 0n
              ? 'PARTIAL'
              : 'UNPAID',
      }
    }
    const filteredIds = new Set(
      all
        .filter(
          (item) =>
            (query.scope !== 'independent' ||
              item.treatment_plan_id === null) &&
            (query.scope !== 'plan' || item.treatment_plan_id !== null) &&
            (query.treatmentPlanId === undefined ||
              item.treatment_plan_id === query.treatmentPlanId)
        )
        .map((item) => item.id)
    )
    const selected = charges.filter((charge) =>
      filteredIds.has(charge.treatment_id)
    )
    const charged = selected.reduce(
      (sum, charge) => sum + cents(charge.total_amount),
      0n
    )
    const received = selected.reduce(
      (sum, charge) => sum + (paid.get(charge.id) ?? 0n),
      0n
    )
    return {
      records: rows.map(mapRow),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: count,
        totalPages: Math.ceil(count / query.pageSize),
      },
      summary: {
        charged: amount(charged),
        paid: amount(received),
        balance: amount(charged - received),
      },
    }
  }

  async confirm(
    userId: number,
    patientId: number,
    treatmentId: number,
    input: ConfirmChargeInput
  ) {
    return db.transaction(async (transaction) => {
      const patient = await ownedPatient(userId, patientId, transaction)
      const candidate = await TreatmentPlanItem.findOne({
        where: { id: treatmentId, patient_id: patientId },
        transaction,
      })
      if (!candidate)
        return fail('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado', 404)
      const plan =
        candidate.treatment_plan_id === null
          ? null
          : await TreatmentPlan.findOne({
              where: {
                id: candidate.treatment_plan_id,
                patient_id: patientId,
                user_id: userId,
              },
              transaction,
              lock: transaction.LOCK.UPDATE,
            })
      if (candidate.treatment_plan_id !== null && !plan)
        return fail('TREATMENT_NOT_FOUND', 'Tratamiento no encontrado', 404)
      const item = (await TreatmentPlanItem.findByPk(treatmentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }))!
      const existing = await TreatmentCharge.findOne({
        where: { treatment_id: treatmentId },
        transaction,
      })
      if (existing) {
        if (
          existing.occurred_on !== input.occurredOn ||
          existing.total_amount !== input.expectedTotal ||
          (!plan && existing.discount_amount !== input.discount)
        )
          return fail(
            'CHARGE_ALREADY_CONFIRMED',
            'El cargo ya fue confirmado con otros datos; no se modificó.'
          )
        return {
          chargeId: existing.id,
          treatmentId,
          total: existing.total_amount,
        }
      }
      if (!item.user_concept_id)
        return fail(
          'TREATMENT_CATALOG_REQUIRED',
          'Vincula el tratamiento histórico al catálogo antes de confirmar un cargo'
        )
      if (item.status === 'CANCELLED' || plan?.status === 'CANCELLED')
        return fail(
          'TREATMENT_CANCELLED',
          'No se puede confirmar un tratamiento o plan cancelado'
        )
      let discount = input.discount
      if (plan) {
        if (input.discount !== '0.00')
          return fail(
            'PLAN_DISCOUNT_FIXED',
            'El descuento proviene del plan; no se aplica un segundo descuento'
          )
        const siblings = await TreatmentPlanItem.findAll({
          where: { treatment_plan_id: plan.id },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        if (!siblings.some((row) => row.charge_discount_amount !== null)) {
          const shares = distributeDiscount(
            siblings.filter((row) => row.status !== 'CANCELLED'),
            plan.discount
          )
          for (const sibling of siblings)
            await sibling.update(
              { charge_discount_amount: shares.get(sibling.id) ?? '0.00' },
              { transaction }
            )
        }
        await item.reload({ transaction })
        discount = item.charge_discount_amount ?? '0.00'
      }
      if (cents(discount) > cents(item.subtotal))
        return fail(
          'CHARGE_DISCOUNT_EXCEEDS_SUBTOTAL',
          'El descuento excede el importe'
        )
      if (cents(input.expectedTotal) !== cents(item.subtotal) - cents(discount))
        return fail(
          'CHARGE_QUOTE_CHANGED',
          'El importe cambió desde que abriste la confirmación. Actualiza y revisa la cotización.'
        )
      await item.update({ charge_discount_amount: discount }, { transaction })
      const charge = await TreatmentCharge.create(
        {
          patient_id: patientId,
          treatment_id: item.id,
          confirmed_by_user_id: userId,
          occurred_on: input.occurredOn,
          description: item.name,
          subtotal_amount: String(item.subtotal),
          discount_amount: discount,
          total_amount: amount(cents(item.subtotal) - cents(discount)),
        },
        { transaction }
      )
      await recalculatePatientFinancialBalance(patient, transaction)
      return { chargeId: charge.id, treatmentId, total: charge.total_amount }
    })
  }

  async pay(
    userId: number,
    patientId: number,
    input: TreatmentPaymentInput,
    key: string,
    hash: string
  ) {
    return db
      .transaction(async (transaction) => {
        const patient = await ownedPatient(userId, patientId, transaction)
        const existing = await Payment.findOne({
          where: { user_id: userId, idempotency_key: key },
          transaction,
        })
        if (existing) {
          if (
            existing.patientId !== patientId ||
            existing.record_kind !== 'TREATMENT_PAYMENT' ||
            existing.request_hash !== hash
          )
            return fail(
              'IDEMPOTENCY_KEY_REUSED',
              'La llave ya se utilizó con otros datos'
            )
          return {
            billingRecordId: existing.id,
            amountReceived: String(existing.income),
          }
        }
        const ids = input.allocations.map((row) => row.chargeId)
        const charges = await TreatmentCharge.findAll({
          where: { id: { [Op.in]: ids }, patient_id: patientId },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        if (charges.length !== ids.length)
          return fail('CHARGE_NOT_FOUND', 'Cargo no encontrado', 404)
        const paid = await allocatedAmounts(ids, transaction)
        let received = 0n
        for (const row of input.allocations) {
          const charge = charges.find(
            (candidate) => candidate.id === row.chargeId
          )!
          if (input.occurredOn < charge.occurred_on)
            return fail(
              'PAYMENT_BEFORE_CHARGE',
              'La fecha del abono no puede ser anterior al cargo'
            )
          if (
            cents(row.amount) >
            cents(charge.total_amount) - (paid.get(charge.id) ?? 0n)
          )
            return fail(
              'PAYMENT_EXCEEDS_BALANCE',
              'El abono excede el saldo del cargo. Los anticipos se habilitarán en la siguiente etapa.'
            )
          received += cents(row.amount)
        }
        if (received > 999_999_999_999n)
          return fail(
            'BILLING_AMOUNT_LIMIT_EXCEEDED',
            'El importe excede el límite permitido'
          )
        const user = (await User.findByPk(userId, { transaction }))!
        const name = [user.name, user.middle_name, user.last_name]
          .filter(Boolean)
          .join(' ')
        const record = await Payment.create(
          {
            record_kind: 'TREATMENT_PAYMENT',
            user_id: userId,
            patientId,
            author_user_id: userId,
            author_name: name,
            payment_date: input.occurredOn,
            subtotal: '0.00',
            discount: '0.00',
            total: '0.00',
            income: amount(received),
            debt: '0.00',
            payment_method: input.paymentMethod,
            idempotency_key: key,
            request_hash: hash,
          },
          { transaction }
        )
        await PaymentAllocation.bulkCreate(
          input.allocations.map((row) => ({
            payment_id: record.id,
            charge_id: row.chargeId,
            amount: row.amount,
          })),
          { transaction }
        )
        await recalculatePatientFinancialBalance(patient, transaction)
        await record.reload({ transaction })
        await PaymentRevision.create(
          {
            payment_id: record.id,
            version: 1,
            action: 'CREATED',
            changed_by_user_id: userId,
            changed_by_name: name,
            change_reason: null,
            snapshot: {
              id: record.id,
              patientId,
              occurredOn: record.payment_date,
              recordKind: record.record_kind,
              subtotal: '0.00',
              discount: '0.00',
              total: '0.00',
              amountReceived: amount(received),
              balanceChange: amount(-received),
              balanceAfter: String(record.debt),
              paymentMethod: record.payment_method,
              status: 'POSTED',
              version: 1,
              author: { userId, name },
              cancelledAt: null,
              cancelledBy: null,
              cancellationReason: null,
              items: [],
              allocations: input.allocations.map((row) => ({
                ...row,
                treatmentId: charges.find(
                  (charge) => charge.id === row.chargeId
                )!.treatment_id,
                description: charges.find(
                  (charge) => charge.id === row.chargeId
                )!.description,
              })),
              createdAt: record.createdAt.toISOString(),
              updatedAt: record.updatedAt.toISOString(),
            },
          },
          { transaction }
        )
        return { billingRecordId: record.id, amountReceived: amount(received) }
      })
      .catch((error) => {
        if (error instanceof UniqueConstraintError)
          return fail(
            'IDEMPOTENCY_KEY_REUSED',
            'La llave ya se utilizó en otra operación. No se duplicó el pago.'
          )
        throw error
      })
  }
}

import { Op, UniqueConstraintError } from 'sequelize'
import db from '../../db/connection'
import { allocatedAmounts } from '../../db/treatment-finance.repository'
import CreditApplication from '../../models/credit-application.model'
import Payment from '../../models/payment.model'
import PaymentAllocation from '../../models/payment-allocation.model'
import TreatmentCharge from '../../models/treatment-charge.model'
import User from '../../models/user.model'
import { amount, cents } from '../../platform/finance-money'
import { ApiError } from '../../platform/http/api-error'
import { ownedPatient } from './treatment-charge.repository'
import type { ApplyCreditInput, CreditQuery } from './treatment-charge.schemas'

const fail = (code: string, message: string, statusCode = 409): never => {
  throw new ApiError({ code, message, statusCode })
}

export class PatientCreditRepository {
  async list(userId: number, patientId: number, query: CreditQuery) {
    // Read a consistent snapshot while other requests apply or cancel receipts.
    return db.transaction(async (transaction) => {
      await ownedPatient(userId, patientId, transaction)
      const where = {
        user_id: userId,
        patientId,
        record_kind: 'TREATMENT_PAYMENT',
        advance_treatment_id: { [Op.ne]: null },
      }
      const { count, rows } = await Payment.findAndCountAll({
        where,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
        order: [['id', 'DESC']],
        transaction,
      })
      const all = await Payment.findAll({ where, transaction })
      const allocations = all.length
        ? await PaymentAllocation.findAll({
            where: { payment_id: { [Op.in]: all.map((row) => row.id) } },
            transaction,
          })
        : []
      const used = new Map<number, bigint>()
      for (const row of allocations)
        used.set(
          row.payment_id,
          (used.get(row.payment_id) ?? 0n) + cents(row.amount)
        )
      const available = (record: Payment) =>
        record.status === 'POSTED'
          ? cents(record.income) - (used.get(record.id) ?? 0n)
          : 0n
      const applications = rows.length
        ? await CreditApplication.findAll({
            where: { payment_id: { [Op.in]: rows.map((row) => row.id) } },
            order: [['id', 'ASC']],
            transaction,
          })
        : []
      return {
        records: rows.map((row) => ({
          paymentId: row.id,
          treatmentId: row.advance_treatment_id!,
          treatmentName: row.advance_treatment_name!,
          occurredOn: row.payment_date,
          amountReceived: String(row.income),
          applied: amount(used.get(row.id) ?? 0n),
          available: amount(available(row)),
          status: row.status,
          applications: applications
            .filter((event) => event.payment_id === row.id)
            .map((event) => ({
              id: event.id,
              occurredOn: event.occurred_on,
              recordedAt: event.created_at,
              ...event.snapshot,
            })),
        })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: count,
          totalPages: Math.ceil(count / query.pageSize),
        },
        availableCredit: amount(
          all.reduce((sum, row) => sum + available(row), 0n)
        ),
      }
    })
  }

  async apply(
    userId: number,
    patientId: number,
    paymentId: number,
    input: ApplyCreditInput,
    key: string,
    hash: string
  ) {
    return db
      .transaction(async (transaction) => {
        await ownedPatient(userId, patientId, transaction)
        const payment = await Payment.findOne({
          where: {
            id: paymentId,
            user_id: userId,
            patientId,
            record_kind: 'TREATMENT_PAYMENT',
            advance_treatment_id: { [Op.ne]: null },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        if (!payment)
          return fail('CREDIT_NOT_FOUND', 'Anticipo no encontrado', 404)
        const existing = await CreditApplication.findOne({
          where: { user_id: userId, idempotency_key: key },
          transaction,
        })
        if (existing) {
          if (
            existing.payment_id !== paymentId ||
            existing.request_hash !== hash
          )
            return fail(
              'IDEMPOTENCY_KEY_REUSED',
              'La llave ya se utilizó con otros datos'
            )
          return {
            applicationId: existing.id,
            paymentId,
            amountApplied: existing.snapshot.amountApplied as string,
          }
        }
        if (payment.status !== 'POSTED')
          return fail('CREDIT_CANCELLED', 'El anticipo está cancelado')
        if (input.occurredOn < payment.payment_date)
          return fail(
            'APPLICATION_BEFORE_PAYMENT',
            'La aplicación no puede ser anterior al anticipo'
          )
        const previous = await PaymentAllocation.findAll({
          where: { payment_id: paymentId },
          transaction,
        })
        const available =
          cents(payment.income) -
          previous.reduce((sum, row) => sum + cents(row.amount), 0n)
        const requested = input.allocations.reduce(
          (sum, row) => sum + cents(row.amount),
          0n
        )
        if (requested > available)
          return fail(
            'INSUFFICIENT_CREDIT',
            'El importe excede el anticipo disponible. Actualiza los saldos.'
          )
        const ids = input.allocations.map((row) => row.chargeId)
        const charges = await TreatmentCharge.findAll({
          where: { id: { [Op.in]: ids }, patient_id: patientId },
          transaction,
          order: [['id', 'ASC']],
          lock: transaction.LOCK.UPDATE,
        })
        if (charges.length !== ids.length)
          return fail('CHARGE_NOT_FOUND', 'Cargo no encontrado', 404)
        const paid = await allocatedAmounts(ids, transaction)
        for (const row of input.allocations) {
          const charge = charges.find(
            (candidate) => candidate.id === row.chargeId
          )!
          if (input.occurredOn < charge.occurred_on)
            return fail(
              'APPLICATION_BEFORE_CHARGE',
              'La aplicación no puede ser anterior al cargo'
            )
          if (
            cents(row.amount) >
            cents(charge.total_amount) - (paid.get(charge.id) ?? 0n)
          )
            return fail(
              'PAYMENT_EXCEEDS_BALANCE',
              'El importe aplicado excede el saldo del cargo'
            )
          const allocation = previous.find(
            (candidate) => candidate.charge_id === row.chargeId
          )
          if (allocation)
            await allocation.update(
              { amount: amount(cents(allocation.amount) + cents(row.amount)) },
              { transaction }
            )
          else
            await PaymentAllocation.create(
              {
                payment_id: paymentId,
                charge_id: row.chargeId,
                amount: row.amount,
              },
              { transaction }
            )
        }
        const user = (await User.findByPk(userId, { transaction }))!
        const event = await CreditApplication.create(
          {
            payment_id: paymentId,
            user_id: userId,
            idempotency_key: key,
            request_hash: hash,
            occurred_on: input.occurredOn,
            snapshot: {
              amountApplied: amount(requested),
              availableAfter: amount(available - requested),
              actor: {
                userId,
                name: [user.name, user.middle_name, user.last_name]
                  .filter(Boolean)
                  .join(' '),
              },
              allocations: input.allocations.map((row) => ({
                ...row,
                treatmentId: charges.find(
                  (charge) => charge.id === row.chargeId
                )!.treatment_id,
                description: charges.find(
                  (charge) => charge.id === row.chargeId
                )!.description,
              })),
            },
          },
          { transaction }
        )
        // No new receipt and no balance recomputation: applying received money is not income.
        return {
          applicationId: event.id,
          paymentId,
          amountApplied: amount(requested),
        }
      })
      .catch((error) => {
        if (error instanceof UniqueConstraintError)
          return fail(
            'IDEMPOTENCY_KEY_REUSED',
            'La llave ya se utilizó en otra aplicación. No se duplicó el movimiento.'
          )
        throw error
      })
  }
}

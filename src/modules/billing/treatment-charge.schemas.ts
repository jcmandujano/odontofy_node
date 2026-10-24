import { z } from 'zod'
import { BILLING_PAYMENT_METHODS } from '../../types/billing.enums'

const id = z.coerce.number().int().positive().max(4_294_967_295)
const money = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  .transform(
    (value) =>
      `${value.split('.')[0]}.${(value.split('.')[1] ?? '').padEnd(2, '0')}`
  )
const date = z.iso
  .date()
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'No se permiten fechas futuras'
  )
export const chargePatientParams = z.strictObject({ patientId: id })
export const chargeTreatmentParams = z.strictObject({
  patientId: id,
  treatmentId: id,
})
export const chargeQuery = z
  .strictObject({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    scope: z.enum(['all', 'independent', 'plan']).default('all'),
    treatmentPlanId: id.optional(),
  })
  .refine(
    (value) =>
      value.scope !== 'independent' || value.treatmentPlanId === undefined,
    'Un tratamiento independiente no pertenece a un plan'
  )
export const confirmChargeSchema = z.strictObject({
  occurredOn: date,
  expectedTotal: money,
  discount: money.optional().default('0.00'),
})
export const treatmentPaymentSchema = z
  .strictObject({
    occurredOn: date,
    paymentMethod: z.enum(BILLING_PAYMENT_METHODS),
    allocations: z
      .array(
        z.strictObject({
          chargeId: id,
          amount: money.refine(
            (value) => value !== '0.00',
            'El abono debe ser mayor a cero'
          ),
        })
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) =>
      new Set(value.allocations.map((row) => row.chargeId)).size ===
      value.allocations.length,
    'No repitas un cargo en el mismo pago'
  )
export type ChargeQuery = z.infer<typeof chargeQuery>
export type ConfirmChargeInput = z.infer<typeof confirmChargeSchema>
export type TreatmentPaymentInput = z.infer<typeof treatmentPaymentSchema>

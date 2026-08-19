import { z } from 'zod'

import {
  BILLING_PAYMENT_METHODS,
  BILLING_RECORD_STATUSES,
} from '../../types/billing.enums'

const id = z.coerce.number().int().positive().max(4_294_967_295)
const text = (max: number) => z.string().trim().min(1).max(max)
const decimal = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  .transform(
    (value) =>
      `${value.split('.')[0]}.${(value.split('.')[1] ?? '').padEnd(2, '0')}`
  )

export const billingConceptParamsSchema = z.strictObject({ conceptId: id })
export const patientBillingParamsSchema = z.strictObject({ patientId: id })
export const billingRecordParamsSchema = z.strictObject({
  patientId: id,
  billingRecordId: id,
})

export const createBillingConceptSchema = z.strictObject({
  description: text(255),
  unitPrice: decimal,
})
export const updateBillingConceptSchema = z
  .strictObject({
    description: text(255).optional(),
    unitPrice: decimal.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  })
export const listBillingConceptsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'archived', 'all']).default('active'),
})

const billingItemSchema = z.strictObject({
  conceptId: id,
  quantity: z.number().int().min(1).max(1_000_000),
})

const billingRecordFields = {
  occurredOn: z.iso.date(),
  discount: decimal,
  amountReceived: decimal,
  paymentMethod: z.union([z.enum(BILLING_PAYMENT_METHODS), z.null()]),
  items: z.array(billingItemSchema).min(1).max(100),
} as const

const validateRecord = (
  value: {
    occurredOn: string
    amountReceived: string
    paymentMethod: string | null
    items: Array<{ conceptId: number }>
  },
  context: z.RefinementCtx
) => {
  if (value.occurredOn > new Date().toISOString().slice(0, 10)) {
    context.addIssue({
      code: 'custom',
      path: ['occurredOn'],
      message: 'La fecha del registro no puede estar en el futuro',
    })
  }
  if (value.amountReceived !== '0.00' && value.paymentMethod == null) {
    context.addIssue({
      code: 'custom',
      path: ['paymentMethod'],
      message: 'El metodo de pago es obligatorio cuando existe un ingreso',
    })
  }
  if (value.amountReceived === '0.00' && value.paymentMethod != null) {
    context.addIssue({
      code: 'custom',
      path: ['paymentMethod'],
      message: 'No debe indicarse metodo cuando no existe ingreso',
    })
  }
  const seen = new Set<number>()
  value.items.forEach((item, index) => {
    if (seen.has(item.conceptId)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'conceptId'],
        message: 'Cada concepto solo puede aparecer una vez',
      })
    }
    seen.add(item.conceptId)
  })
}

export const createBillingRecordSchema = z
  .strictObject({
    occurredOn: billingRecordFields.occurredOn,
    discount: billingRecordFields.discount.optional().default('0.00'),
    amountReceived: billingRecordFields.amountReceived
      .optional()
      .default('0.00'),
    paymentMethod: billingRecordFields.paymentMethod.optional().default(null),
    items: billingRecordFields.items,
  })
  .superRefine(validateRecord)

export const correctBillingRecordSchema = z
  .strictObject({
    occurredOn: billingRecordFields.occurredOn,
    discount: billingRecordFields.discount.optional().default('0.00'),
    amountReceived: billingRecordFields.amountReceived
      .optional()
      .default('0.00'),
    paymentMethod: billingRecordFields.paymentMethod.optional().default(null),
    items: billingRecordFields.items,
    changeReason: text(500),
  })
  .superRefine(validateRecord)

export const cancelBillingRecordSchema = z.strictObject({
  changeReason: text(500),
})
export const idempotencyHeadersSchema = z.object({
  'idempotency-key': z.string().trim().uuid(),
})
const validDateRange = (value: { dateFrom?: string; dateTo?: string }) =>
  !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo

export const listBillingRecordsQuerySchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .union([z.enum(BILLING_RECORD_STATUSES), z.literal('all')])
      .default('POSTED'),
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .refine(validDateRange, {
    path: ['dateTo'],
    message: 'dateTo debe ser igual o posterior a dateFrom',
  })
export const listBillingRevisionsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export const billingSummaryQuerySchema = z
  .strictObject({
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .refine(validDateRange, {
    path: ['dateTo'],
    message: 'dateTo debe ser igual o posterior a dateFrom',
  })

export type CreateBillingConceptInput = z.infer<
  typeof createBillingConceptSchema
>
export type UpdateBillingConceptInput = z.infer<
  typeof updateBillingConceptSchema
>
export type ListBillingConceptsQuery = z.infer<
  typeof listBillingConceptsQuerySchema
>
export type CreateBillingRecordInput = z.infer<typeof createBillingRecordSchema>
export type CorrectBillingRecordInput = z.infer<
  typeof correctBillingRecordSchema
>
export type CancelBillingRecordInput = z.infer<typeof cancelBillingRecordSchema>
export type ListBillingRecordsQuery = z.infer<
  typeof listBillingRecordsQuerySchema
>
export type ListBillingRevisionsQuery = z.infer<
  typeof listBillingRevisionsQuerySchema
>
export type BillingSummaryQuery = z.infer<typeof billingSummaryQuerySchema>
export type BillingConceptParams = z.infer<typeof billingConceptParamsSchema>
export type PatientBillingParams = z.infer<typeof patientBillingParamsSchema>
export type BillingRecordParams = z.infer<typeof billingRecordParamsSchema>
export type IdempotencyHeaders = z.infer<typeof idempotencyHeadersSchema>

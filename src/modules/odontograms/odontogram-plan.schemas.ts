import { z } from 'zod'

export const createOdontogramPlanSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(255),
    expectedSubtotal: z
      .string()
      .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
      .transform(
        (value) =>
          `${value.split('.')[0]}.${(value.split('.')[1] ?? '').padEnd(2, '0')}`
      ),
    treatments: z
      .array(
        z.strictObject({
          treatmentId: z.number().int().positive().max(4_294_967_295),
          revision: z.string().regex(/^[a-f0-9]{64}$/),
        })
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) =>
      new Set(value.treatments.map((item) => item.treatmentId)).size ===
      value.treatments.length,
    'No repitas tratamientos en el plan'
  )

export type CreateOdontogramPlanInput = z.infer<
  typeof createOdontogramPlanSchema
>

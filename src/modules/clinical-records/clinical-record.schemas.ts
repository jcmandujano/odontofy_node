import { z } from 'zod'

import {
  MEDICAL_ANSWER_VALUES,
  MEDICAL_QUESTION_IDS,
} from './clinical-record.types'

const id = z.coerce.number().int().positive().max(4_294_967_295)
const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength)
const nullableText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .transform((value) => (value === '' ? null : value))

export const patientClinicalRecordParamsSchema = z.strictObject({
  patientId: id,
})
export const evolutionNoteParamsSchema = z.strictObject({
  patientId: id,
  noteId: id,
})

const medicalAnswerSchema = z.strictObject({
  questionId: z.enum(MEDICAL_QUESTION_IDS),
  answer: z.enum(MEDICAL_ANSWER_VALUES),
  notes: nullableText(2_000).optional().default(null),
})

export const updateMedicalHistorySchema = z
  .strictObject({
    questionnaireVersion: z.literal('1.0'),
    familyHistory: nullableText(10_000).optional().default(null),
    answers: z.array(medicalAnswerSchema).max(MEDICAL_QUESTION_IDS.length),
    otherNotes: nullableText(10_000).optional().default(null),
    changeReason: trimmedText(500),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.answers.forEach((answer, index) => {
      if (seen.has(answer.questionId)) {
        context.addIssue({
          code: 'custom',
          path: ['answers', index, 'questionId'],
          message: 'Cada pregunta solo puede responderse una vez',
        })
      }
      seen.add(answer.questionId)
    })
  })

const noteReferences = {
  treatmentPlanId: z.union([id, z.null()]),
  treatmentPlanItemId: z.union([id, z.null()]),
} as const

const validateReferences = (
  value: {
    treatmentPlanId?: number | null
    treatmentPlanItemId?: number | null
    completeTreatmentItem?: boolean
  },
  context: z.RefinementCtx
) => {
  if (value.treatmentPlanItemId != null && value.treatmentPlanId == null) {
    context.addIssue({
      code: 'custom',
      path: ['treatmentPlanId'],
      message: 'El plan es obligatorio cuando se referencia un item',
    })
  }
  if (value.completeTreatmentItem && value.treatmentPlanItemId == null) {
    context.addIssue({
      code: 'custom',
      path: ['completeTreatmentItem'],
      message: 'Se requiere un item para completarlo',
    })
  }
}

const occurredAt = z.iso
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() <= Date.now(),
    'La fecha clinica no puede ser futura'
  )

export const createEvolutionNoteSchema = z
  .strictObject({
    note: trimmedText(50_000),
    treatmentPlanId: noteReferences.treatmentPlanId.optional().default(null),
    treatmentPlanItemId: noteReferences.treatmentPlanItemId
      .optional()
      .default(null),
    occurredAt: occurredAt.optional(),
    completeTreatmentItem: z.boolean().optional().default(false),
  })
  .superRefine(validateReferences)

export const updateEvolutionNoteSchema = z
  .strictObject({
    note: trimmedText(50_000).optional(),
    treatmentPlanId: noteReferences.treatmentPlanId.optional(),
    treatmentPlanItemId: noteReferences.treatmentPlanItemId.optional(),
    occurredAt: occurredAt.optional(),
    changeReason: trimmedText(500),
  })
  .refine(
    (value) =>
      value.note !== undefined ||
      value.treatmentPlanId !== undefined ||
      value.treatmentPlanItemId !== undefined ||
      value.occurredAt !== undefined,
    { message: 'Se requiere al menos un cambio clinico' }
  )
  .superRefine(validateReferences)

export const noteLifecycleSchema = z.strictObject({
  changeReason: trimmedText(500),
})

export const listEvolutionNotesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  treatmentPlanId: z.union([id, z.undefined()]).optional(),
  treatmentPlanItemId: z.union([id, z.undefined()]).optional(),
})

export const listRevisionsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PatientClinicalRecordParams = z.infer<
  typeof patientClinicalRecordParamsSchema
>
export type EvolutionNoteParams = z.infer<typeof evolutionNoteParamsSchema>
export type UpdateMedicalHistoryInput = z.infer<
  typeof updateMedicalHistorySchema
>
export type CreateEvolutionNoteInput = z.infer<typeof createEvolutionNoteSchema>
export type UpdateEvolutionNoteInput = z.infer<typeof updateEvolutionNoteSchema>
export type NoteLifecycleInput = z.infer<typeof noteLifecycleSchema>
export type ListEvolutionNotesQuery = z.infer<
  typeof listEvolutionNotesQuerySchema
>
export type ListRevisionsQuery = z.infer<typeof listRevisionsQuerySchema>

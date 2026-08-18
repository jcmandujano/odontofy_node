import { z } from 'zod';

import {
  TREATMENT_PLAN_ITEM_PRIORITIES,
  TREATMENT_PLAN_ITEM_STATUSES,
  TREATMENT_PLAN_STATUSES,
} from '../../types/treatment-plan.enums';
import { normalizeDecimal } from './treatment-plan.money';

const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const nullableText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .transform((value) => value === '' ? null : value);

const decimal = (integerDigits: number) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^(?:0|[1-9]\\d{0,${integerDigits - 1}})(?:\\.\\d{1,2})?$`))
    .transform(normalizeDecimal);

const money = decimal(10);
const quantity = decimal(8).refine((value) => value !== '0.00', {
  message: 'La cantidad debe ser mayor que cero',
});

const nullableDate = z.union([z.iso.date(), z.null()]);

const planFields = {
  title: trimmedText(255),
  description: nullableText(20_000),
  diagnosis: nullableText(20_000),
  patientComplaint: nullableText(20_000),
  clinicalObservations: nullableText(20_000),
  prognosis: nullableText(20_000),
  estimatedStartDate: nullableDate,
  estimatedEndDate: nullableDate,
  acceptanceNotes: nullableText(20_000),
  discount: money,
} as const;

const validateDateRange = (
  value: { estimatedStartDate?: string | null; estimatedEndDate?: string | null },
  context: z.RefinementCtx
) => {
  if (
    value.estimatedStartDate &&
    value.estimatedEndDate &&
    value.estimatedEndDate < value.estimatedStartDate
  ) {
    context.addIssue({
      code: 'custom',
      path: ['estimatedEndDate'],
      message: 'La fecha final no puede ser anterior a la fecha inicial',
    });
  }
};

export const createTreatmentPlanSchema = z
  .strictObject({
    title: planFields.title,
    description: planFields.description.optional().default(null),
    diagnosis: planFields.diagnosis.optional().default(null),
    patientComplaint: planFields.patientComplaint.optional().default(null),
    clinicalObservations: planFields.clinicalObservations
      .optional()
      .default(null),
    prognosis: planFields.prognosis.optional().default(null),
    estimatedStartDate: planFields.estimatedStartDate.optional().default(null),
    estimatedEndDate: planFields.estimatedEndDate.optional().default(null),
    acceptanceNotes: planFields.acceptanceNotes.optional().default(null),
    discount: planFields.discount.optional().default('0.00'),
  })
  .superRefine(validateDateRange);

export const updateTreatmentPlanSchema = z
  .strictObject({
    title: planFields.title.optional(),
    description: planFields.description.optional(),
    diagnosis: planFields.diagnosis.optional(),
    patientComplaint: planFields.patientComplaint.optional(),
    clinicalObservations: planFields.clinicalObservations.optional(),
    prognosis: planFields.prognosis.optional(),
    estimatedStartDate: planFields.estimatedStartDate.optional(),
    estimatedEndDate: planFields.estimatedEndDate.optional(),
    acceptanceNotes: planFields.acceptanceNotes.optional(),
    discount: planFields.discount.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  })
  .superRefine(validateDateRange);

export const updateTreatmentPlanStatusSchema = z.strictObject({
  status: z.enum(TREATMENT_PLAN_STATUSES),
  acceptanceNotes: planFields.acceptanceNotes.optional(),
});

const itemFields = {
  userConceptId: z
    .union([z.number().int().positive().max(4_294_967_295), z.null()]),
  name: trimmedText(255),
  description: nullableText(20_000),
  tooth: nullableText(50),
  area: nullableText(100),
  quantity,
  unitPrice: money,
  phase: nullableText(100),
  priority: z.union([z.enum(TREATMENT_PLAN_ITEM_PRIORITIES), z.null()]),
  notes: nullableText(20_000),
  sortOrder: z.number().int().min(0).max(4_294_967_295),
} as const;

export const createTreatmentPlanItemSchema = z.strictObject({
  userConceptId: itemFields.userConceptId.optional().default(null),
  name: itemFields.name,
  description: itemFields.description.optional().default(null),
  tooth: itemFields.tooth.optional().default(null),
  area: itemFields.area.optional().default(null),
  quantity: itemFields.quantity.optional().default('1.00'),
  unitPrice: itemFields.unitPrice,
  phase: itemFields.phase.optional().default(null),
  priority: itemFields.priority.optional().default(null),
  notes: itemFields.notes.optional().default(null),
  sortOrder: itemFields.sortOrder.optional().default(0),
});

export const updateTreatmentPlanItemSchema = z
  .strictObject({
    userConceptId: itemFields.userConceptId.optional(),
    name: itemFields.name.optional(),
    description: itemFields.description.optional(),
    tooth: itemFields.tooth.optional(),
    area: itemFields.area.optional(),
    quantity: itemFields.quantity.optional(),
    unitPrice: itemFields.unitPrice.optional(),
    phase: itemFields.phase.optional(),
    priority: itemFields.priority.optional(),
    notes: itemFields.notes.optional(),
    sortOrder: itemFields.sortOrder.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  });

export const updateTreatmentPlanItemStatusSchema = z.strictObject({
  status: z.enum(TREATMENT_PLAN_ITEM_STATUSES),
});

const id = z.coerce.number().int().positive().max(4_294_967_295);

export const patientTreatmentPlansParamsSchema = z.strictObject({
  patientId: id,
});

export const treatmentPlanParamsSchema = z.strictObject({
  treatmentPlanId: id,
});

export const treatmentPlanItemParamsSchema = z.strictObject({
  treatmentPlanId: id,
  itemId: id,
});

export const listTreatmentPlansQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.union([z.enum(TREATMENT_PLAN_STATUSES), z.literal('all')]).default('all'),
});

export type CreateTreatmentPlanInput = z.infer<typeof createTreatmentPlanSchema>;
export type UpdateTreatmentPlanInput = z.infer<typeof updateTreatmentPlanSchema>;
export type UpdateTreatmentPlanStatusInput = z.infer<typeof updateTreatmentPlanStatusSchema>;
export type CreateTreatmentPlanItemInput = z.infer<typeof createTreatmentPlanItemSchema>;
export type UpdateTreatmentPlanItemInput = z.infer<typeof updateTreatmentPlanItemSchema>;
export type UpdateTreatmentPlanItemStatusInput = z.infer<typeof updateTreatmentPlanItemStatusSchema>;
export type PatientTreatmentPlansParams = z.infer<typeof patientTreatmentPlansParamsSchema>;
export type TreatmentPlanParams = z.infer<typeof treatmentPlanParamsSchema>;
export type TreatmentPlanItemParams = z.infer<typeof treatmentPlanItemParamsSchema>;
export type ListTreatmentPlansQuery = z.infer<typeof listTreatmentPlansQuerySchema>;

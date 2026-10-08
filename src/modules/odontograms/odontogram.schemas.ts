import { z } from 'zod';

import {
  ODONTOGRAM_CONDITIONS,
  ODONTOGRAM_DENTITIONS,
  ODONTOGRAM_SURFACES,
  isToothCodeForDentition,
  type OdontogramDentition,
} from '../../types/odontogram.enums';

const id = z.coerce.number().int().positive().max(4_294_967_295);
const nullableText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .transform((value) => (value === '' ? null : value));
const occurredAt = z.iso
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() <= Date.now(),
    'La fecha clinica no puede ser futura'
  );

export const odontogramFindingSchema = z.strictObject({
  toothCode: z.string().regex(/^\d{2}$/),
  condition: z.enum(ODONTOGRAM_CONDITIONS),
  surface: z
    .union([z.enum(ODONTOGRAM_SURFACES), z.null()])
    .optional()
    .default(null),
  notes: nullableText(2_000).optional().default(null),
});

type FindingInput = z.infer<typeof odontogramFindingSchema>;

const wholeToothConditions = new Set([
  'HEALTHY',
  'MISSING',
  'NOT_ERUPTED',
  'CROWN',
  'ROOT_CANAL',
  'IMPLANT',
  'EXTRACTION_INDICATED',
]);
const exclusiveConditions = new Set(['HEALTHY', 'MISSING', 'NOT_ERUPTED']);

const validateUniqueFindings = (
  findings: FindingInput[],
  context: z.RefinementCtx
) => {
  const seen = new Set<string>();
  findings.forEach((finding, index) => {
    const key = `${finding.toothCode}:${finding.condition}:${finding.surface ?? ''}`;
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        path: ['findings', index],
        message: 'El mismo hallazgo no puede registrarse dos veces',
      });
    }
    seen.add(key);
  });
};

const validateFindingConsistency = (
  findings: FindingInput[],
  context: z.RefinementCtx
) => {
  const byTooth = new Map<string, FindingInput[]>();
  findings.forEach((finding, index) => {
    if (finding.surface && wholeToothConditions.has(finding.condition)) {
      context.addIssue({
        code: 'custom',
        path: ['findings', index, 'surface'],
        message: 'La condicion de pieza completa no admite superficie',
      });
    }
    byTooth.set(finding.toothCode, [
      ...(byTooth.get(finding.toothCode) ?? []),
      finding,
    ]);
  });
  byTooth.forEach((toothFindings, toothCode) => {
    if (
      toothFindings.length > 1 &&
      toothFindings.some((finding) =>
        exclusiveConditions.has(finding.condition)
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['findings'],
        message: `La condicion exclusiva de la pieza ${toothCode} no admite otros hallazgos`,
      });
    }
  });
};

const validateToothCodes = (
  dentition: OdontogramDentition,
  findings: FindingInput[],
  context: z.RefinementCtx
) => {
  findings.forEach((finding, index) => {
    if (!isToothCodeForDentition(dentition, finding.toothCode)) {
      context.addIssue({
        code: 'custom',
        path: ['findings', index, 'toothCode'],
        message: 'La pieza no pertenece a la denticion seleccionada',
      });
    }
  });
};

export const patientOdontogramsParamsSchema = z.strictObject({
  patientId: id,
});

export const odontogramParamsSchema = z.strictObject({
  odontogramId: id,
});

export const odontogramTreatmentLinkParamsSchema = z.strictObject({
  odontogramId: id,
  findingId: id,
  itemId: id,
});

export const listOdontogramsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dentition: z
    .union([z.enum(ODONTOGRAM_DENTITIONS), z.literal('all')])
    .default('all'),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});

export const createOdontogramSchema = z
  .strictObject({
    dentition: z.enum(ODONTOGRAM_DENTITIONS),
    title: nullableText(255).optional().default(null),
    occurredAt: occurredAt.optional(),
    findings: z.array(odontogramFindingSchema).max(500).default([]),
  })
  .superRefine((value, context) => {
    validateUniqueFindings(value.findings, context);
    validateFindingConsistency(value.findings, context);
    validateToothCodes(value.dentition, value.findings, context);
  });

export const updateOdontogramSchema = z
  .strictObject({
    title: nullableText(255).optional(),
    occurredAt: occurredAt.optional(),
    findings: z.array(odontogramFindingSchema).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  })
  .superRefine((value, context) => {
    if (value.findings) {
      validateUniqueFindings(value.findings, context);
      validateFindingConsistency(value.findings, context);
    }
  });

export type PatientOdontogramsParams = z.infer<
  typeof patientOdontogramsParamsSchema
>;
export type OdontogramParams = z.infer<typeof odontogramParamsSchema>;
export type OdontogramTreatmentLinkParams = z.infer<
  typeof odontogramTreatmentLinkParamsSchema
>;
export type ListOdontogramsQuery = z.infer<typeof listOdontogramsQuerySchema>;
export type CreateOdontogramInput = z.infer<typeof createOdontogramSchema>;
export type UpdateOdontogramInput = z.infer<typeof updateOdontogramSchema>;
export type OdontogramFindingInput = z.infer<typeof odontogramFindingSchema>;

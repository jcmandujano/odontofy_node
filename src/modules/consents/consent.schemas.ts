import { z } from 'zod';

const id = z.coerce.number().int().positive().max(4_294_967_295);
const page = z.coerce.number().int().min(1).max(1_000_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
const nullableDescription = z.union([z.string().trim().max(10_000), z.null()]).transform((value) => value === '' ? null : value);

export const consentTemplateParamsSchema = z.strictObject({ templateId: id });
export const patientConsentsParamsSchema = z.strictObject({ patientId: id });
export const signedConsentParamsSchema = z.strictObject({ patientId: id, consentId: id });
export const listConsentTemplatesQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.enum(['active', 'archived', 'all']).default('active'),
});
export const listSignedConsentsQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.enum(['PENDING_DOCUMENT', 'COMPLETED', 'VOIDED', 'all']).default('all'),
});
export const createConsentTemplateSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  description: nullableDescription.optional().default(null),
  templateFileId: z.uuid().nullable().optional().default(null),
});
export const createFromCatalogSchema = z.strictObject({
  catalogId: id,
  templateFileId: z.uuid().nullable().optional().default(null),
});
export const updateConsentTemplateSchema = z.strictObject({
  name: z.string().trim().min(1).max(255).optional(),
  description: nullableDescription.optional(),
  templateFileId: z.uuid().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Se requiere al menos una propiedad' });
export const createSignedConsentSchema = z.strictObject({
  templateId: id,
  signedAt: z.iso.datetime({ offset: true }),
  signedDocumentFileId: z.uuid().nullable().optional().default(null),
  signatoryName: z.string().trim().min(1).max(350),
  signatoryCapacity: z.enum(['PATIENT', 'REPRESENTATIVE']),
});
export const attachSignedDocumentSchema = z.strictObject({ signedDocumentFileId: z.uuid() });
export const voidSignedConsentSchema = z.strictObject({ reason: z.string().trim().min(3).max(1000) });

export type ConsentTemplateParams = z.infer<typeof consentTemplateParamsSchema>;
export type PatientConsentsParams = z.infer<typeof patientConsentsParamsSchema>;
export type SignedConsentParams = z.infer<typeof signedConsentParamsSchema>;
export type ListConsentTemplatesQuery = z.infer<typeof listConsentTemplatesQuerySchema>;
export type ListSignedConsentsQuery = z.infer<typeof listSignedConsentsQuerySchema>;
export type CreateConsentTemplateInput = z.infer<typeof createConsentTemplateSchema>;
export type CreateFromCatalogInput = z.infer<typeof createFromCatalogSchema>;
export type UpdateConsentTemplateInput = z.infer<typeof updateConsentTemplateSchema>;
export type CreateSignedConsentInput = z.infer<typeof createSignedConsentSchema>;
export type AttachSignedDocumentInput = z.infer<typeof attachSignedDocumentSchema>;
export type VoidSignedConsentInput = z.infer<typeof voidSignedConsentSchema>;

import { z } from 'zod';

const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const nullableText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .transform((value) => value === '' ? null : value);

const nullablePhone = z
  .union([
    z.string().trim().max(30).regex(/^[0-9+(). -]*$/),
    z.null(),
  ])
  .transform((value) => value === '' ? null : value);

const nullableEmail = z
  .union([
    z.string().trim().toLowerCase().pipe(z.email().max(254)),
    z.literal(''),
    z.null(),
  ])
  .transform((value) => value === '' ? null : value);

const isoDate = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    value <= today
  );
}, 'Fecha invalida o futura');

const nullableDate = z
  .union([isoDate, z.literal(''), z.null()])
  .transform((value) => value === '' ? null : value);

const nullableRfc = z
  .union([
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z&\u00d1]{3,4}\d{6}[A-Z0-9]{3}$/),
    z.literal(''),
    z.null(),
  ])
  .transform((value) => value === '' ? null : value);

const medicalHistory = z
  .record(z.string().max(100), z.unknown())
  .superRefine((value, context) => {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'El historial debe ser serializable como JSON',
      });
      return;
    }

    if (Buffer.byteLength(serialized, 'utf8') > 64 * 1024) {
      context.addIssue({
        code: 'custom',
        message: 'El historial no debe exceder 64 KiB',
      });
    }
  });

const nullableHistory = medicalHistory.nullable();

const patientFields = {
  name: trimmedText(100),
  middleName: nullableText(100),
  lastName: trimmedText(150),
  gender: nullableText(50),
  dateOfBirth: nullableDate,
  phone: nullablePhone,
  maritalStatus: nullableText(50),
  occupation: nullableText(150),
  address: nullableText(10_000),
  emergencyContactName: nullableText(200),
  emergencyContactPhone: nullablePhone,
  emergencyContactRelationship: nullableText(100),
  reasonForConsultation: nullableText(10_000),
  rfc: nullableRfc,
  familyMedicalHistory: nullableHistory,
  personalMedicalHistory: nullableHistory,
  email: nullableEmail,
} as const;

export const createPatientSchema = z.strictObject({
  name: patientFields.name,
  middleName: patientFields.middleName.optional().default(null),
  lastName: patientFields.lastName,
  gender: patientFields.gender.optional().default(null),
  dateOfBirth: patientFields.dateOfBirth.optional().default(null),
  phone: patientFields.phone.optional().default(null),
  maritalStatus: patientFields.maritalStatus.optional().default(null),
  occupation: patientFields.occupation.optional().default(null),
  address: patientFields.address.optional().default(null),
  emergencyContactName: patientFields.emergencyContactName
    .optional()
    .default(null),
  emergencyContactPhone: patientFields.emergencyContactPhone
    .optional()
    .default(null),
  emergencyContactRelationship: patientFields.emergencyContactRelationship
    .optional()
    .default(null),
  reasonForConsultation: patientFields.reasonForConsultation
    .optional()
    .default(null),
  rfc: patientFields.rfc.optional().default(null),
  familyMedicalHistory: patientFields.familyMedicalHistory
    .optional()
    .default(null),
  personalMedicalHistory: patientFields.personalMedicalHistory
    .optional()
    .default(null),
  email: patientFields.email.optional().default(null),
});

export const updatePatientSchema = z
  .strictObject({
    name: patientFields.name.optional(),
    middleName: patientFields.middleName.optional(),
    lastName: patientFields.lastName.optional(),
    gender: patientFields.gender.optional(),
    dateOfBirth: patientFields.dateOfBirth.optional(),
    phone: patientFields.phone.optional(),
    maritalStatus: patientFields.maritalStatus.optional(),
    occupation: patientFields.occupation.optional(),
    address: patientFields.address.optional(),
    emergencyContactName: patientFields.emergencyContactName.optional(),
    emergencyContactPhone: patientFields.emergencyContactPhone.optional(),
    emergencyContactRelationship:
      patientFields.emergencyContactRelationship.optional(),
    reasonForConsultation: patientFields.reasonForConsultation.optional(),
    rfc: patientFields.rfc.optional(),
    familyMedicalHistory: patientFields.familyMedicalHistory.optional(),
    personalMedicalHistory: patientFields.personalMedicalHistory.optional(),
    email: patientFields.email.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  });

export const patientIdParamsSchema = z.strictObject({
  patientId: z.coerce.number().int().positive().max(4_294_967_295),
});

export const listPatientsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientIdParams = z.infer<typeof patientIdParamsSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

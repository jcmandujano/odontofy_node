import { z } from 'zod';

const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional();

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

const isoDate = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}, 'Fecha invalida');

const storedPasswordSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.includes('\0'),
    'La contrasena contiene caracteres invalidos'
  )
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contrasena no debe exceder 72 bytes'
  );

export const passwordSchema = z
  .string()
  .min(12, 'La contrasena debe tener al menos 12 caracteres')
  .refine((value) => !value.includes('\0'), 'La contrasena contiene caracteres invalidos')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contrasena no debe exceder 72 bytes'
  );

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: storedPasswordSchema,
});

export const registerSchema = z.strictObject({
  name: trimmedText(100),
  middleName: optionalText(100).default(''),
  lastName: trimmedText(150),
  dateOfBirth: isoDate.optional(),
  phone: optionalText(30).default(''),
  avatar: optionalText(2048).default(''),
  email: emailSchema,
  password: passwordSchema,
});

export const emptyBodySchema = z.strictObject({}).default({});

export const accountVerificationRequestSchema = z.strictObject({
  email: emailSchema,
});

export const accountVerificationConfirmSchema = z.strictObject({
  userId: z.number().int().positive(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
});

export const forgotPasswordSchema = accountVerificationRequestSchema;

export const resetPasswordSchema = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: passwordSchema,
});

export const verifyPasswordSchema = z.strictObject({
  password: storedPasswordSchema,
});

export const updateProfileSchema = z
  .strictObject({
    name: trimmedText(100).optional(),
    middleName: z.string().trim().max(100).optional(),
    lastName: trimmedText(150).optional(),
    dateOfBirth: isoDate.nullable().optional(),
    phone: z.string().trim().max(30).optional(),
    avatar: z.string().trim().max(2048).optional(),
    showFinanceStats: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos una propiedad',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AccountVerificationRequestInput = z.infer<
  typeof accountVerificationRequestSchema
>;
export type AccountVerificationConfirmInput = z.infer<
  typeof accountVerificationConfirmSchema
>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

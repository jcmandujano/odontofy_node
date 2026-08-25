export const EMAIL_KINDS = ['ACCOUNT_VERIFICATION', 'PASSWORD_RESET'] as const;

export type EmailKind = (typeof EMAIL_KINDS)[number];

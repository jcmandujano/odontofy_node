export const SIGNED_CONSENT_STATUSES = [
  'PENDING_DOCUMENT',
  'COMPLETED',
  'VOIDED',
] as const;

export type SignedConsentStatus = (typeof SIGNED_CONSENT_STATUSES)[number];

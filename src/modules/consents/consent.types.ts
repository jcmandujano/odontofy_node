import type { SignedConsentStatus } from '../../models/signed-consent.model';

export interface ConsentTemplateData {
  id: number;
  userId: number;
  catalogId: number | null;
  name: string;
  description: string | null;
  isCustom: boolean;
  templateFileId: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  version: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignedConsentData {
  id: number;
  patientId: number;
  templateId: number;
  templateFileId: string | null;
  signedDocumentFileId: string | null;
  status: SignedConsentStatus;
  signedAt: Date;
  templateVersion: number;
  templateName: string;
  templateDescription: string | null;
  patientName: string;
  doctorName: string;
  signatoryName: string;
  signatoryCapacity: 'PATIENT' | 'REPRESENTATIVE';
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsentErrorCode =
  | 'CONSENT_TEMPLATE_NOT_FOUND'
  | 'CONSENT_TEMPLATE_ARCHIVED'
  | 'CONSENT_TEMPLATE_DUPLICATE'
  | 'CONSENT_NOT_FOUND'
  | 'CONSENT_DOCUMENT_ATTACHED'
  | 'CONSENT_VOIDED'
  | 'CONSENT_INVALID_DATE'
  | 'PATIENT_NOT_FOUND';

export class ConsentError extends Error {
  constructor(readonly code: ConsentErrorCode, message: string) {
    super(message);
    this.name = 'ConsentError';
  }
}

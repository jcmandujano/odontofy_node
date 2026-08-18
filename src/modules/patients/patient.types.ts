export interface PatientData {
  id: number;
  name: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  phone: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  reasonForConsultation: string | null;
  rfc: string | null;
  familyMedicalHistory: Record<string, unknown> | null;
  personalMedicalHistory: Record<string, unknown> | null;
  email: string | null;
  active: boolean;
  currentBalance: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientSummaryData {
  id: number;
  name: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  currentBalance: string;
  createdAt: Date;
}

export interface PublicPatient
  extends Omit<PatientData, 'createdAt' | 'dateOfBirth' | 'updatedAt'> {
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPatientSummary
  extends Omit<PatientSummaryData, 'createdAt' | 'dateOfBirth'> {
  dateOfBirth: string | null;
  createdAt: string;
}

export interface PatientPage {
  patients: PatientSummaryData[];
  total: number;
}

export type PatientErrorCode = 'PATIENT_NOT_FOUND';

export class PatientError extends Error {
  readonly code: PatientErrorCode;

  constructor(code: PatientErrorCode, message: string) {
    super(message);
    this.name = 'PatientError';
    this.code = code;
  }
}

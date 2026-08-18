import type { EvolutionNoteRevisionAction } from '../../models/evolution-note-revision.model'

export const MEDICAL_QUESTION_IDS = [
  'MEDICAL_TREATMENT',
  'PRIOR_SURGERY',
  'SUBSTANCE_USE',
  'HYPERTENSION',
  'HEPATITIS',
  'HIV',
  'STI',
  'HEART_DISEASE',
  'RHEUMATIC_FEVER',
  'ASTHMA',
  'DIABETES',
  'PEPTIC_ULCER',
  'THYROID_DISEASE',
  'ALLERGIES',
  'EPILEPSY',
  'GASTRITIS',
  'PREGNANCY',
] as const

export const MEDICAL_ANSWER_VALUES = ['YES', 'NO', 'UNKNOWN'] as const
export type MedicalQuestionId = (typeof MEDICAL_QUESTION_IDS)[number]
export type MedicalAnswerValue = (typeof MEDICAL_ANSWER_VALUES)[number]

export interface MedicalAnswerData {
  questionId: MedicalQuestionId
  answer: MedicalAnswerValue
  notes: string | null
}

export interface MedicalHistoryData {
  patientId: number
  questionnaireVersion: '1.0'
  version: number
  familyHistory: string | null
  answers: MedicalAnswerData[]
  otherNotes: string | null
  author: { userId: number; name: string } | null
  changeReason: string | null
  recordedAt: Date | null
}

export interface MedicalHistoryRevisionData extends MedicalHistoryData {
  author: { userId: number; name: string }
  changeReason: string
  recordedAt: Date
}

export interface EvolutionNoteData {
  id: number
  patientId: number
  treatmentPlanId: number | null
  treatmentPlanItemId: number | null
  author: { userId: number; name: string }
  note: string
  version: number
  occurredAt: Date
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface EvolutionNoteRevisionData {
  id: number
  evolutionNoteId: number
  version: number
  author: { userId: number; name: string }
  action: EvolutionNoteRevisionAction
  note: string
  treatmentPlanId: number | null
  treatmentPlanItemId: number | null
  occurredAt: Date
  archivedAt: Date | null
  changeReason: string | null
  recordedAt: Date
}

export interface EvolutionNotePage {
  notes: EvolutionNoteData[]
  total: number
}

export interface RevisionPage<T> {
  revisions: T[]
  total: number
}

export type ClinicalRecordErrorCode =
  | 'PATIENT_NOT_FOUND'
  | 'EVOLUTION_NOTE_NOT_FOUND'
  | 'TREATMENT_PLAN_NOT_FOUND'
  | 'TREATMENT_PLAN_ITEM_NOT_FOUND'
  | 'EVOLUTION_NOTE_ARCHIVED'
  | 'EVOLUTION_NOTE_ACTIVE'
  | 'TREATMENT_REFERENCE_INVALID'
  | 'TREATMENT_NOT_COMPLETABLE'

export class ClinicalRecordError extends Error {
  readonly code: ClinicalRecordErrorCode

  constructor(code: ClinicalRecordErrorCode, message: string) {
    super(message)
    this.name = 'ClinicalRecordError'
    this.code = code
  }
}

import type {
  OdontogramCondition,
  OdontogramDentition,
  OdontogramSurface,
} from '../../types/odontogram.enums';
import type { TreatmentPlanItemStatus } from '../../types/treatment-plan.enums';

export interface OdontogramTreatmentItemData {
  id: number;
  treatmentPlanId: number;
  userConceptId: number | null;
  name: string;
  status: TreatmentPlanItemStatus;
}

export interface OdontogramFindingData {
  id: number;
  odontogramId: number;
  toothCode: string;
  condition: OdontogramCondition;
  surface: OdontogramSurface | null;
  notes: string | null;
  treatmentPlanItemIds: number[];
  treatmentPlanItems: OdontogramTreatmentItemData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OdontogramData {
  id: number;
  patientId: number;
  dentition: OdontogramDentition;
  title: string | null;
  author: { userId: number; name: string };
  occurredAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OdontogramDetailData extends OdontogramData {
  findings: OdontogramFindingData[];
}

export interface OdontogramPage {
  odontograms: OdontogramData[];
  total: number;
}

export type OdontogramErrorCode =
  | 'PATIENT_NOT_FOUND'
  | 'ODONTOGRAM_NOT_FOUND'
  | 'ODONTOGRAM_ARCHIVED'
  | 'ODONTOGRAM_FINDING_NOT_FOUND'
  | 'TREATMENT_PLAN_ITEM_NOT_FOUND'
  | 'TREATMENT_PATIENT_MISMATCH'
  | 'INVALID_TOOTH_CODE';

export class OdontogramError extends Error {
  readonly code: OdontogramErrorCode;

  constructor(code: OdontogramErrorCode, message: string) {
    super(message);
    this.name = 'OdontogramError';
    this.code = code;
  }
}

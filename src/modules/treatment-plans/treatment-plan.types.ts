import type {
  TreatmentPlanItemPriority,
  TreatmentPlanItemStatus,
  TreatmentPlanStatus,
} from '../../types/treatment-plan.enums';

export interface TreatmentPlanData {
  id: number;
  patientId: number;
  title: string;
  description: string | null;
  diagnosis: string | null;
  patientComplaint: string | null;
  clinicalObservations: string | null;
  prognosis: string | null;
  status: TreatmentPlanStatus;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  acceptanceNotes: string | null;
  subtotal: string;
  discount: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlanSummaryData {
  id: number;
  patientId: number;
  title: string;
  description: string | null;
  status: TreatmentPlanStatus;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  subtotal: string;
  discount: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlanItemData {
  id: number;
  treatmentPlanId: number;
  userConceptId: number | null;
  name: string;
  description: string | null;
  tooth: string | null;
  area: string | null;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  phase: string | null;
  priority: TreatmentPlanItemPriority | null;
  status: TreatmentPlanItemStatus;
  notes: string | null;
  sortOrder: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlanDetailData extends TreatmentPlanData {
  items: TreatmentPlanItemData[];
}

type SerializedDates<T> = Omit<
  T,
  | 'acceptedAt'
  | 'completedAt'
  | 'createdAt'
  | 'estimatedEndDate'
  | 'estimatedStartDate'
  | 'rejectedAt'
  | 'updatedAt'
>;

export interface PublicTreatmentPlan extends SerializedDates<TreatmentPlanData> {
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTreatmentPlanSummary
  extends SerializedDates<TreatmentPlanSummaryData> {
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTreatmentPlanItem
  extends SerializedDates<TreatmentPlanItemData> {
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTreatmentPlanDetail extends PublicTreatmentPlan {
  items: PublicTreatmentPlanItem[];
}

export interface TreatmentPlanPage {
  treatmentPlans: TreatmentPlanSummaryData[];
  total: number;
}

export interface TreatmentPlanItemMutationData {
  item: TreatmentPlanItemData;
  treatmentPlan: TreatmentPlanDetailData;
}

export type TreatmentPlanErrorCode =
  | 'PATIENT_NOT_FOUND'
  | 'TREATMENT_PLAN_NOT_FOUND'
  | 'TREATMENT_PLAN_ITEM_NOT_FOUND'
  | 'USER_CONCEPT_NOT_FOUND'
  | 'TREATMENT_PLAN_NOT_EDITABLE'
  | 'TREATMENT_PLAN_DISCOUNT_EXCEEDS_SUBTOTAL'
  | 'TREATMENT_PLAN_AMOUNT_LIMIT_EXCEEDED'
  | 'TREATMENT_PLAN_DATE_RANGE_INVALID';

export class TreatmentPlanError extends Error {
  readonly code: TreatmentPlanErrorCode;

  constructor(code: TreatmentPlanErrorCode, message: string) {
    super(message);
    this.name = 'TreatmentPlanError';
    this.code = code;
  }
}

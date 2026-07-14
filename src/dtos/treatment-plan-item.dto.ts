import type {
  TreatmentPlanItemPriority,
  TreatmentPlanItemStatus,
} from '../types/treatment-plan.enums';

export interface CreateTreatmentPlanItemInput {
  user_concept_id?: number | null;
  name: string;
  description?: string | null;
  tooth?: string | null;
  area?: string | null;
  quantity: number;
  unit_price: number;
  phase?: string | null;
  priority?: TreatmentPlanItemPriority | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateTreatmentPlanItemInput {
  user_concept_id?: number | null;
  name?: string;
  description?: string | null;
  tooth?: string | null;
  area?: string | null;
  quantity?: number;
  unit_price?: number;
  phase?: string | null;
  priority?: TreatmentPlanItemPriority | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateTreatmentPlanItemStatusInput {
  status: TreatmentPlanItemStatus;
}

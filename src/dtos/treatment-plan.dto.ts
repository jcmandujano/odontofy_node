import type { TreatmentPlanStatus } from '../types/treatment-plan.enums';

export interface CreateTreatmentPlanInput {
  title: string;
  description?: string | null;
  diagnosis?: string | null;
  patient_complaint?: string | null;
  clinical_observations?: string | null;
  prognosis?: string | null;
  estimated_start_date?: Date | null;
  estimated_end_date?: Date | null;
  acceptance_notes?: string | null;
  discount?: number;
}

export interface UpdateTreatmentPlanInput {
  title?: string;
  description?: string | null;
  diagnosis?: string | null;
  patient_complaint?: string | null;
  clinical_observations?: string | null;
  prognosis?: string | null;
  estimated_start_date?: Date | null;
  estimated_end_date?: Date | null;
  acceptance_notes?: string | null;
  discount?: number;
}

export interface UpdateTreatmentPlanStatusInput {
  status: TreatmentPlanStatus;
  acceptance_notes?: string | null;
}

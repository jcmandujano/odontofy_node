export const TREATMENT_PLAN_STATUSES = [
  'DRAFT',
  'PROPOSED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const TREATMENT_PLAN_ITEM_STATUSES = [
  'PENDING',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const TREATMENT_PLAN_ITEM_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;

export type TreatmentPlanStatus = (typeof TREATMENT_PLAN_STATUSES)[number];
export type TreatmentPlanItemStatus = (typeof TREATMENT_PLAN_ITEM_STATUSES)[number];
export type TreatmentPlanItemPriority = (typeof TREATMENT_PLAN_ITEM_PRIORITIES)[number];

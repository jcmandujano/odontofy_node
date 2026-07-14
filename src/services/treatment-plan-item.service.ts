import TreatmentPlanItem from '../models/treatment-plan-item.model';
import UserConcept from '../models/user_concept.model';
import type {
  CreateTreatmentPlanItemInput,
  UpdateTreatmentPlanItemInput,
  UpdateTreatmentPlanItemStatusInput,
} from '../dtos/treatment-plan-item.dto';
import {
  TREATMENT_PLAN_ITEM_STATUSES,
  type TreatmentPlanItemStatus,
} from '../types/treatment-plan.enums';
import {
  TreatmentPlanServiceError,
  getTreatmentPlanForUser,
  recalculateTreatmentPlanTotals,
} from './treatment-plan.service';

const toMoney = (value: number) => Number(value.toFixed(2));

const calculateItemSubtotal = (quantity: number, unitPrice: number) => toMoney(quantity * unitPrice);

const ensureUserConceptBelongsToUser = async (userId: number, userConceptId?: number | null) => {
  if (userConceptId === undefined || userConceptId === null) {
    return;
  }

  const userConcept = await UserConcept.findOne({
    where: {
      id: userConceptId,
      user_id: userId,
    },
  });

  if (!userConcept) {
    throw new TreatmentPlanServiceError('El concepto no existe o no pertenece al usuario autenticado', 404);
  }
};

const getTreatmentPlanItemForPlan = async (treatmentPlanId: number, itemId: number) => {
  const treatmentPlanItem = await TreatmentPlanItem.findOne({
    where: {
      id: itemId,
      treatment_plan_id: treatmentPlanId,
    },
  });

  if (!treatmentPlanItem) {
    throw new TreatmentPlanServiceError('El ítem no existe o no pertenece al plan indicado', 404);
  }

  return treatmentPlanItem;
};

export const createTreatmentPlanItem = async (
  userId: number,
  treatmentPlanId: number,
  input: CreateTreatmentPlanItemInput
) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  await ensureUserConceptBelongsToUser(userId, input.user_concept_id);

  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unit_price);
  const treatmentPlanItem = await TreatmentPlanItem.create({
    treatment_plan_id: treatmentPlan.id,
    user_concept_id: input.user_concept_id ?? null,
    name: input.name,
    description: input.description ?? null,
    tooth: input.tooth ?? null,
    area: input.area ?? null,
    quantity,
    unit_price: unitPrice,
    subtotal: calculateItemSubtotal(quantity, unitPrice),
    phase: input.phase ?? null,
    priority: input.priority ?? null,
    status: 'PENDING',
    notes: input.notes ?? null,
    sort_order: input.sort_order ?? 0,
    completed_at: null,
  });

  const updatedTreatmentPlan = await recalculateTreatmentPlanTotals(userId, treatmentPlan.id);

  return {
    item: treatmentPlanItem,
    treatmentPlan: updatedTreatmentPlan,
  };
};

export const updateTreatmentPlanItem = async (
  userId: number,
  treatmentPlanId: number,
  itemId: number,
  input: UpdateTreatmentPlanItemInput
) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  const treatmentPlanItem = await getTreatmentPlanItemForPlan(treatmentPlan.id, itemId);

  await ensureUserConceptBelongsToUser(userId, input.user_concept_id);

  const quantity = Number(input.quantity ?? treatmentPlanItem.quantity);
  const unitPrice = Number(input.unit_price ?? treatmentPlanItem.unit_price);

  await treatmentPlanItem.update({
    ...input,
    quantity,
    unit_price: unitPrice,
    subtotal: calculateItemSubtotal(quantity, unitPrice),
  });

  const updatedTreatmentPlan = await recalculateTreatmentPlanTotals(userId, treatmentPlan.id);

  return {
    item: treatmentPlanItem,
    treatmentPlan: updatedTreatmentPlan,
  };
};

export const deleteTreatmentPlanItem = async (
  userId: number,
  treatmentPlanId: number,
  itemId: number
) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  const treatmentPlanItem = await getTreatmentPlanItemForPlan(treatmentPlan.id, itemId);

  await treatmentPlanItem.destroy();
  const updatedTreatmentPlan = await recalculateTreatmentPlanTotals(userId, treatmentPlan.id);

  return {
    treatmentPlan: updatedTreatmentPlan,
  };
};

export const updateTreatmentPlanItemStatus = async (
  userId: number,
  treatmentPlanId: number,
  itemId: number,
  input: UpdateTreatmentPlanItemStatusInput
) => {
  if (!TREATMENT_PLAN_ITEM_STATUSES.includes(input.status)) {
    throw new TreatmentPlanServiceError('El estado del ítem no es válido', 400);
  }

  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  const treatmentPlanItem = await getTreatmentPlanItemForPlan(treatmentPlan.id, itemId);
  const statusUpdate: Partial<{
    status: TreatmentPlanItemStatus;
    completed_at: Date | null;
  }> = {
    status: input.status,
  };

  if (input.status === 'COMPLETED') {
    statusUpdate.completed_at = new Date();
  }

  await treatmentPlanItem.update(statusUpdate);

  return treatmentPlanItem;
};

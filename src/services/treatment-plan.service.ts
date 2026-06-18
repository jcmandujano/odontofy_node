import Patient from '../models/patient.model';
import TreatmentPlan from '../models/treatment-plan.model';
import TreatmentPlanItem from '../models/treatment-plan-item.model';
import {
  TREATMENT_PLAN_STATUSES,
} from '../types/treatment-plan.enums';
import type {
  CreateTreatmentPlanInput,
  UpdateTreatmentPlanInput,
  UpdateTreatmentPlanStatusInput,
} from '../dtos/treatment-plan.dto';

export class TreatmentPlanServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'TreatmentPlanServiceError';
    this.statusCode = statusCode;
  }
}

const ensureNonNegativeDiscount = (discount?: number) => {
  if (discount !== undefined && Number(discount) < 0) {
    throw new TreatmentPlanServiceError('El descuento no puede ser negativo', 400);
  }
};

const toMoney = (value: number) => Number(value.toFixed(2));

const ensurePatientBelongsToUser = async (userId: number, patientId: number) => {
  const patient = await Patient.findOne({
    where: {
      id: patientId,
      user_id: userId,
    },
  });

  if (!patient) {
    throw new TreatmentPlanServiceError('El paciente no existe o no pertenece al usuario autenticado', 404);
  }

  return patient;
};

export const getTreatmentPlanForUser = async (userId: number, treatmentPlanId: number) => {
  const treatmentPlan = await TreatmentPlan.findOne({
    where: {
      id: treatmentPlanId,
      user_id: userId,
    },
  });

  if (!treatmentPlan) {
    throw new TreatmentPlanServiceError('El plan de tratamiento no existe o no pertenece al usuario autenticado', 404);
  }

  return treatmentPlan;
};

export const createTreatmentPlan = async (
  userId: number,
  patientId: number,
  input: CreateTreatmentPlanInput
) => {
  ensureNonNegativeDiscount(input.discount);
  await ensurePatientBelongsToUser(userId, patientId);

  const discount = Number(input.discount ?? 0);

  return TreatmentPlan.create({
    user_id: userId,
    patient_id: patientId,
    title: input.title,
    description: input.description ?? null,
    diagnosis: input.diagnosis ?? null,
    patient_complaint: input.patient_complaint ?? null,
    clinical_observations: input.clinical_observations ?? null,
    prognosis: input.prognosis ?? null,
    status: 'DRAFT',
    estimated_start_date: input.estimated_start_date ?? null,
    estimated_end_date: input.estimated_end_date ?? null,
    accepted_at: null,
    rejected_at: null,
    acceptance_notes: input.acceptance_notes ?? null,
    subtotal: 0,
    discount,
    total: toMoney(0 - discount),
  });
};

export const getTreatmentPlansByPatient = async (userId: number, patientId: number) => {
  await ensurePatientBelongsToUser(userId, patientId);

  return TreatmentPlan.findAll({
    where: {
      user_id: userId,
      patient_id: patientId,
    },
    order: [['created_at', 'DESC']],
  });
};

export const getTreatmentPlanById = async (userId: number, treatmentPlanId: number) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);

  return TreatmentPlan.findOne({
    where: {
      id: treatmentPlan.id,
      user_id: userId,
    },
    include: [
      {
        model: TreatmentPlanItem,
        required: false,
      },
    ],
  });
};

export const updateTreatmentPlan = async (
  userId: number,
  treatmentPlanId: number,
  input: UpdateTreatmentPlanInput
) => {
  ensureNonNegativeDiscount(input.discount);

  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);

  await treatmentPlan.update(input);

  if (input.discount !== undefined) {
    return recalculateTreatmentPlanTotals(userId, treatmentPlanId);
  }

  return treatmentPlan;
};

export const deleteTreatmentPlan = async (userId: number, treatmentPlanId: number) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);

  await treatmentPlan.update({
    status: 'CANCELLED',
    rejected_at: new Date(),
  });

  return treatmentPlan;
};

export const updateTreatmentPlanStatus = async (
  userId: number,
  treatmentPlanId: number,
  input: UpdateTreatmentPlanStatusInput
) => {
  if (!TREATMENT_PLAN_STATUSES.includes(input.status)) {
    throw new TreatmentPlanServiceError('El estado del plan de tratamiento no es válido', 400);
  }

  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  const statusDates: Partial<{
    accepted_at: Date | null;
    rejected_at: Date | null;
  }> = {};

  if (input.status === 'ACCEPTED') {
    statusDates.accepted_at = new Date();
    statusDates.rejected_at = null;
  }

  if (input.status === 'CANCELLED') {
    statusDates.rejected_at = new Date();
  }

  await treatmentPlan.update({
    status: input.status,
    acceptance_notes: input.acceptance_notes ?? treatmentPlan.acceptance_notes,
    ...statusDates,
  });

  return treatmentPlan;
};

export const recalculateTreatmentPlanTotals = async (userId: number, treatmentPlanId: number) => {
  const treatmentPlan = await getTreatmentPlanForUser(userId, treatmentPlanId);
  const treatmentPlanItems = await TreatmentPlanItem.findAll({
    where: {
      treatment_plan_id: treatmentPlan.id,
    },
  });

  const subtotal = toMoney(
    treatmentPlanItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
  );
  const discount = Number(treatmentPlan.discount ?? 0);
  const total = toMoney(subtotal - discount);

  await treatmentPlan.update({
    subtotal,
    total,
  });

  return treatmentPlan;
};

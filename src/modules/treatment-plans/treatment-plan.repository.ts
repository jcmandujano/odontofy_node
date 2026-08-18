import { Op, Transaction, WhereOptions } from 'sequelize';

import db from '../../db/connection';
import Patient from '../../models/patient.model';
import TreatmentPlan from '../../models/treatment-plan.model';
import TreatmentPlanItem from '../../models/treatment-plan-item.model';
import UserConcept from '../../models/user_concept.model';
import {
  CreateTreatmentPlanInput,
  CreateTreatmentPlanItemInput,
  ListTreatmentPlansQuery,
  UpdateTreatmentPlanInput,
  UpdateTreatmentPlanItemInput,
  UpdateTreatmentPlanItemStatusInput,
  UpdateTreatmentPlanStatusInput,
} from './treatment-plan.schemas';
import {
  multiplyMoney,
  normalizeDecimal,
  subtractMoney,
  sumMoney,
} from './treatment-plan.money';
import {
  TreatmentPlanData,
  TreatmentPlanDetailData,
  TreatmentPlanError,
  TreatmentPlanItemData,
  TreatmentPlanItemMutationData,
  TreatmentPlanPage,
  TreatmentPlanSummaryData,
} from './treatment-plan.types';

const toDate = (value: string | null): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

const mapPlan = (plan: TreatmentPlan): TreatmentPlanData => ({
  id: plan.id,
  patientId: plan.patient_id,
  title: plan.title,
  description: plan.description,
  diagnosis: plan.diagnosis,
  patientComplaint: plan.patient_complaint,
  clinicalObservations: plan.clinical_observations,
  prognosis: plan.prognosis,
  status: plan.status,
  estimatedStartDate: plan.estimated_start_date,
  estimatedEndDate: plan.estimated_end_date,
  acceptedAt: plan.accepted_at,
  rejectedAt: plan.rejected_at,
  acceptanceNotes: plan.acceptance_notes,
  subtotal: normalizeDecimal(plan.subtotal),
  discount: normalizeDecimal(plan.discount),
  total: normalizeDecimal(plan.total),
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
});

const mapPlanSummary = (plan: TreatmentPlan): TreatmentPlanSummaryData => ({
  id: plan.id,
  patientId: plan.patient_id,
  title: plan.title,
  description: plan.description,
  status: plan.status,
  estimatedStartDate: plan.estimated_start_date,
  estimatedEndDate: plan.estimated_end_date,
  subtotal: normalizeDecimal(plan.subtotal),
  discount: normalizeDecimal(plan.discount),
  total: normalizeDecimal(plan.total),
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
});

const mapItem = (item: TreatmentPlanItem): TreatmentPlanItemData => ({
  id: item.id,
  treatmentPlanId: item.treatment_plan_id,
  userConceptId: item.user_concept_id,
  name: item.name,
  description: item.description,
  tooth: item.tooth,
  area: item.area,
  quantity: normalizeDecimal(item.quantity),
  unitPrice: normalizeDecimal(item.unit_price),
  subtotal: normalizeDecimal(item.subtotal),
  phase: item.phase,
  priority: item.priority,
  status: item.status,
  notes: item.notes,
  sortOrder: item.sort_order,
  completedAt: item.completed_at,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const planNotFound = () =>
  new TreatmentPlanError(
    'TREATMENT_PLAN_NOT_FOUND',
    'Plan de tratamiento no encontrado'
  );

const itemNotFound = () =>
  new TreatmentPlanError(
    'TREATMENT_PLAN_ITEM_NOT_FOUND',
    'Item de tratamiento no encontrado'
  );

const discountConflict = () =>
  new TreatmentPlanError(
    'TREATMENT_PLAN_DISCOUNT_EXCEEDS_SUBTOTAL',
    'El descuento no puede exceder el subtotal del plan'
  );

const amountLimit = () =>
  new TreatmentPlanError(
    'TREATMENT_PLAN_AMOUNT_LIMIT_EXCEEDED',
    'El importe excede el limite permitido'
  );

const assertEditable = (plan: TreatmentPlan) => {
  if (plan.status === 'CANCELLED') {
    throw new TreatmentPlanError(
      'TREATMENT_PLAN_NOT_EDITABLE',
      'El plan cancelado debe restaurarse antes de modificar sus items'
    );
  }
};

const lockPlan = async (
  userId: number,
  treatmentPlanId: number,
  transaction: Transaction
): Promise<TreatmentPlan> => {
  const plan = await TreatmentPlan.findOne({
    where: { id: treatmentPlanId, user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!plan) throw planNotFound();
  return plan;
};

const findItem = async (
  treatmentPlanId: number,
  itemId: number,
  transaction: Transaction
): Promise<TreatmentPlanItem> => {
  const item = await TreatmentPlanItem.findOne({
    where: { id: itemId, treatment_plan_id: treatmentPlanId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!item) throw itemNotFound();
  return item;
};

const ensureConcept = async (
  userId: number,
  userConceptId: number | null | undefined,
  transaction: Transaction
) => {
  if (userConceptId == null) return;
  const concept = await UserConcept.findOne({
    where: { id: userConceptId, user_id: userId },
    attributes: ['id'],
    transaction,
  });
  if (!concept) {
    throw new TreatmentPlanError(
      'USER_CONCEPT_NOT_FOUND',
      'Concepto de usuario no encontrado'
    );
  }
};

const recalculate = async (
  plan: TreatmentPlan,
  transaction: Transaction
): Promise<void> => {
  const items = await TreatmentPlanItem.findAll({
    where: {
      treatment_plan_id: plan.id,
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['subtotal'],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let subtotal: string;
  try {
    subtotal = sumMoney(items.map((item) => item.subtotal));
  } catch (error) {
    if (error instanceof RangeError) throw amountLimit();
    throw error;
  }
  const total = subtractMoney(subtotal, plan.discount);
  if (total === null) throw discountConflict();
  await plan.update({ subtotal, total }, { transaction });
};

const itemValues = (input: CreateTreatmentPlanItemInput) => {
  let subtotal: string;
  try {
    subtotal = multiplyMoney(input.quantity, input.unitPrice);
  } catch (error) {
    if (error instanceof RangeError) throw amountLimit();
    throw error;
  }
  return {
    user_concept_id: input.userConceptId,
    name: input.name,
    description: input.description,
    tooth: input.tooth,
    area: input.area,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    subtotal,
    phase: input.phase,
    priority: input.priority,
    notes: input.notes,
    sort_order: input.sortOrder,
  };
};

const changedItemValues = (
  item: TreatmentPlanItem,
  input: UpdateTreatmentPlanItemInput
) => {
  const quantity = input.quantity ?? normalizeDecimal(item.quantity);
  const unitPrice = input.unitPrice ?? normalizeDecimal(item.unit_price);
  let subtotal: string;
  try {
    subtotal = multiplyMoney(quantity, unitPrice);
  } catch (error) {
    if (error instanceof RangeError) throw amountLimit();
    throw error;
  }
  return {
    ...(input.userConceptId !== undefined && {
      user_concept_id: input.userConceptId,
    }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.tooth !== undefined && { tooth: input.tooth }),
    ...(input.area !== undefined && { area: input.area }),
    ...(input.quantity !== undefined && { quantity: input.quantity }),
    ...(input.unitPrice !== undefined && { unit_price: input.unitPrice }),
    ...(input.phase !== undefined && { phase: input.phase }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.sortOrder !== undefined && { sort_order: input.sortOrder }),
    subtotal,
  };
};

export interface TreatmentPlanRepository {
  patientExists(userId: number, patientId: number): Promise<boolean>;
  list(
    userId: number,
    patientId: number,
    query: ListTreatmentPlansQuery
  ): Promise<TreatmentPlanPage>;
  findById(userId: number, treatmentPlanId: number): Promise<TreatmentPlanDetailData | null>;
  create(userId: number, patientId: number, input: CreateTreatmentPlanInput): Promise<TreatmentPlanDetailData>;
  update(userId: number, treatmentPlanId: number, input: UpdateTreatmentPlanInput): Promise<TreatmentPlanDetailData>;
  updateStatus(userId: number, treatmentPlanId: number, input: UpdateTreatmentPlanStatusInput): Promise<TreatmentPlanDetailData>;
  cancel(userId: number, treatmentPlanId: number): Promise<TreatmentPlanDetailData>;
  createItem(userId: number, treatmentPlanId: number, input: CreateTreatmentPlanItemInput): Promise<TreatmentPlanItemMutationData>;
  updateItem(userId: number, treatmentPlanId: number, itemId: number, input: UpdateTreatmentPlanItemInput): Promise<TreatmentPlanItemMutationData>;
  updateItemStatus(userId: number, treatmentPlanId: number, itemId: number, input: UpdateTreatmentPlanItemStatusInput): Promise<TreatmentPlanItemMutationData>;
  cancelItem(userId: number, treatmentPlanId: number, itemId: number): Promise<TreatmentPlanItemMutationData>;
}

export class SequelizeTreatmentPlanRepository implements TreatmentPlanRepository {
  async patientExists(userId: number, patientId: number): Promise<boolean> {
    return (await Patient.count({ where: { id: patientId, user_id: userId } })) > 0;
  }

  async list(userId: number, patientId: number, query: ListTreatmentPlansQuery): Promise<TreatmentPlanPage> {
    const where: WhereOptions = {
      user_id: userId,
      patient_id: patientId,
      ...(query.status !== 'all' && { status: query.status }),
    };
    const { count, rows } = await TreatmentPlan.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
    });
    return { treatmentPlans: rows.map(mapPlanSummary), total: count };
  }

  async findById(userId: number, treatmentPlanId: number): Promise<TreatmentPlanDetailData | null> {
    const plan = await TreatmentPlan.findOne({
      where: { id: treatmentPlanId, user_id: userId },
    });
    if (!plan) return null;
    const items = await TreatmentPlanItem.findAll({
      where: { treatment_plan_id: plan.id },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    return { ...mapPlan(plan), items: items.map(mapItem) };
  }

  async create(userId: number, patientId: number, input: CreateTreatmentPlanInput): Promise<TreatmentPlanDetailData> {
    if (input.discount !== '0.00') throw discountConflict();
    const plan = await TreatmentPlan.create({
      user_id: userId,
      patient_id: patientId,
      title: input.title,
      description: input.description,
      diagnosis: input.diagnosis,
      patient_complaint: input.patientComplaint,
      clinical_observations: input.clinicalObservations,
      prognosis: input.prognosis,
      status: 'DRAFT',
      estimated_start_date: toDate(input.estimatedStartDate),
      estimated_end_date: toDate(input.estimatedEndDate),
      accepted_at: null,
      rejected_at: null,
      acceptance_notes: input.acceptanceNotes,
      subtotal: '0.00',
      discount: '0.00',
      total: '0.00',
    });
    return { ...mapPlan(plan), items: [] };
  }

  async update(userId: number, treatmentPlanId: number, input: UpdateTreatmentPlanInput): Promise<TreatmentPlanDetailData> {
    await db.transaction(async (transaction) => {
      const plan = await lockPlan(userId, treatmentPlanId, transaction);
      const startDate = input.estimatedStartDate === undefined
        ? plan.estimated_start_date
        : toDate(input.estimatedStartDate);
      const endDate = input.estimatedEndDate === undefined
        ? plan.estimated_end_date
        : toDate(input.estimatedEndDate);
      if (startDate && endDate && endDate < startDate) {
        throw new TreatmentPlanError(
          'TREATMENT_PLAN_DATE_RANGE_INVALID',
          'La fecha final no puede ser anterior a la fecha inicial'
        );
      }
      const discount = input.discount ?? normalizeDecimal(plan.discount);
      const total = subtractMoney(plan.subtotal, discount);
      if (total === null) throw discountConflict();
      await plan.update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.diagnosis !== undefined && { diagnosis: input.diagnosis }),
        ...(input.patientComplaint !== undefined && { patient_complaint: input.patientComplaint }),
        ...(input.clinicalObservations !== undefined && { clinical_observations: input.clinicalObservations }),
        ...(input.prognosis !== undefined && { prognosis: input.prognosis }),
        ...(input.estimatedStartDate !== undefined && { estimated_start_date: startDate }),
        ...(input.estimatedEndDate !== undefined && { estimated_end_date: endDate }),
        ...(input.acceptanceNotes !== undefined && { acceptance_notes: input.acceptanceNotes }),
        ...(input.discount !== undefined && { discount, total }),
      }, { transaction });
    });
    return this.detailOrThrow(userId, treatmentPlanId);
  }

  async updateStatus(userId: number, treatmentPlanId: number, input: UpdateTreatmentPlanStatusInput): Promise<TreatmentPlanDetailData> {
    await db.transaction(async (transaction) => {
      const plan = await lockPlan(userId, treatmentPlanId, transaction);
      const now = new Date();
      const acceptedAt = input.status === 'ACCEPTED'
        ? plan.status === 'ACCEPTED' ? plan.accepted_at : now
        : input.status === 'DRAFT' || input.status === 'PROPOSED' ? null : plan.accepted_at;
      const rejectedAt = input.status === 'CANCELLED'
        ? plan.status === 'CANCELLED' ? plan.rejected_at : now
        : null;
      await plan.update({
        status: input.status,
        accepted_at: acceptedAt,
        rejected_at: rejectedAt,
        ...(input.acceptanceNotes !== undefined && { acceptance_notes: input.acceptanceNotes }),
      }, { transaction });
    });
    return this.detailOrThrow(userId, treatmentPlanId);
  }

  async cancel(userId: number, treatmentPlanId: number): Promise<TreatmentPlanDetailData> {
    return this.updateStatus(userId, treatmentPlanId, { status: 'CANCELLED' });
  }

  async createItem(userId: number, treatmentPlanId: number, input: CreateTreatmentPlanItemInput): Promise<TreatmentPlanItemMutationData> {
    let itemId = 0;
    await db.transaction(async (transaction) => {
      const plan = await lockPlan(userId, treatmentPlanId, transaction);
      assertEditable(plan);
      await ensureConcept(userId, input.userConceptId, transaction);
      const item = await TreatmentPlanItem.create({
        treatment_plan_id: plan.id,
        ...itemValues(input),
        status: 'PENDING',
        completed_at: null,
      }, { transaction });
      itemId = item.id;
      await recalculate(plan, transaction);
    });
    return this.mutationResult(userId, treatmentPlanId, itemId);
  }

  async updateItem(userId: number, treatmentPlanId: number, itemId: number, input: UpdateTreatmentPlanItemInput): Promise<TreatmentPlanItemMutationData> {
    await db.transaction(async (transaction) => {
      const plan = await lockPlan(userId, treatmentPlanId, transaction);
      assertEditable(plan);
      const item = await findItem(plan.id, itemId, transaction);
      await ensureConcept(userId, input.userConceptId, transaction);
      await item.update(changedItemValues(item, input), { transaction });
      await recalculate(plan, transaction);
    });
    return this.mutationResult(userId, treatmentPlanId, itemId);
  }

  async updateItemStatus(userId: number, treatmentPlanId: number, itemId: number, input: UpdateTreatmentPlanItemStatusInput): Promise<TreatmentPlanItemMutationData> {
    await db.transaction(async (transaction) => {
      const plan = await lockPlan(userId, treatmentPlanId, transaction);
      assertEditable(plan);
      const item = await findItem(plan.id, itemId, transaction);
      await item.update({
        status: input.status,
        completed_at: input.status === 'COMPLETED'
          ? item.status === 'COMPLETED' ? item.completed_at : new Date()
          : null,
      }, { transaction });
      await recalculate(plan, transaction);
    });
    return this.mutationResult(userId, treatmentPlanId, itemId);
  }

  async cancelItem(userId: number, treatmentPlanId: number, itemId: number): Promise<TreatmentPlanItemMutationData> {
    return this.updateItemStatus(userId, treatmentPlanId, itemId, { status: 'CANCELLED' });
  }

  private async mutationResult(userId: number, treatmentPlanId: number, itemId: number): Promise<TreatmentPlanItemMutationData> {
    const treatmentPlan = await this.detailOrThrow(userId, treatmentPlanId);
    const item = treatmentPlan.items.find((candidate) => candidate.id === itemId);
    if (!item) throw itemNotFound();
    return { item, treatmentPlan };
  }

  private async detailOrThrow(
    userId: number,
    treatmentPlanId: number
  ): Promise<TreatmentPlanDetailData> {
    const treatmentPlan = await this.findById(userId, treatmentPlanId);
    if (!treatmentPlan) throw planNotFound();
    return treatmentPlan;
  }
}

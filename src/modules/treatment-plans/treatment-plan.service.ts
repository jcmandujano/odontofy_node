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
  SequelizeTreatmentPlanRepository,
  TreatmentPlanRepository,
} from './treatment-plan.repository';
import {
  PublicTreatmentPlan,
  PublicTreatmentPlanDetail,
  PublicTreatmentPlanItem,
  PublicTreatmentPlanSummary,
  TreatmentPlanData,
  TreatmentPlanDetailData,
  TreatmentPlanError,
  TreatmentPlanItemData,
  TreatmentPlanItemMutationData,
  TreatmentPlanSummaryData,
} from './treatment-plan.types';

const isoDate = (date: Date | null): string | null =>
  date ? date.toISOString().slice(0, 10) : null;

const isoDateTime = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

const toPublicPlan = (plan: TreatmentPlanData): PublicTreatmentPlan => ({
  ...plan,
  estimatedStartDate: isoDate(plan.estimatedStartDate),
  estimatedEndDate: isoDate(plan.estimatedEndDate),
  acceptedAt: isoDateTime(plan.acceptedAt),
  rejectedAt: isoDateTime(plan.rejectedAt),
  createdAt: plan.createdAt.toISOString(),
  updatedAt: plan.updatedAt.toISOString(),
});

const toPublicSummary = (
  plan: TreatmentPlanSummaryData
): PublicTreatmentPlanSummary => ({
  ...plan,
  estimatedStartDate: isoDate(plan.estimatedStartDate),
  estimatedEndDate: isoDate(plan.estimatedEndDate),
  createdAt: plan.createdAt.toISOString(),
  updatedAt: plan.updatedAt.toISOString(),
});

const toPublicItem = (
  item: TreatmentPlanItemData
): PublicTreatmentPlanItem => ({
  ...item,
  completedAt: isoDateTime(item.completedAt),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const toPublicDetail = (
  plan: TreatmentPlanDetailData
): PublicTreatmentPlanDetail => ({
  ...toPublicPlan(plan),
  items: plan.items.map(toPublicItem),
});

const toPublicMutation = (mutation: TreatmentPlanItemMutationData) => ({
  item: toPublicItem(mutation.item),
  treatmentPlan: toPublicDetail(mutation.treatmentPlan),
});

export interface TreatmentPlanServiceDependencies {
  repository?: TreatmentPlanRepository;
}

export class TreatmentPlanService {
  private readonly repository: TreatmentPlanRepository;

  constructor(dependencies: TreatmentPlanServiceDependencies = {}) {
    this.repository =
      dependencies.repository ?? new SequelizeTreatmentPlanRepository();
  }

  async list(
    userId: number,
    patientId: number,
    query: ListTreatmentPlansQuery
  ) {
    await this.ensurePatient(userId, patientId);
    const page = await this.repository.list(userId, patientId, query);
    return {
      treatmentPlans: page.treatmentPlans.map(toPublicSummary),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages: Math.ceil(page.total / query.pageSize),
      },
    };
  }

  async get(
    userId: number,
    treatmentPlanId: number
  ): Promise<PublicTreatmentPlanDetail> {
    const plan = await this.repository.findById(userId, treatmentPlanId);
    if (!plan) throw this.planNotFound();
    return toPublicDetail(plan);
  }

  async create(
    userId: number,
    patientId: number,
    input: CreateTreatmentPlanInput
  ): Promise<PublicTreatmentPlanDetail> {
    await this.ensurePatient(userId, patientId);
    return toPublicDetail(
      await this.repository.create(userId, patientId, input)
    );
  }

  async update(
    userId: number,
    treatmentPlanId: number,
    input: UpdateTreatmentPlanInput
  ): Promise<PublicTreatmentPlanDetail> {
    return toPublicDetail(
      await this.repository.update(userId, treatmentPlanId, input)
    );
  }

  async updateStatus(
    userId: number,
    treatmentPlanId: number,
    input: UpdateTreatmentPlanStatusInput
  ): Promise<PublicTreatmentPlanDetail> {
    return toPublicDetail(
      await this.repository.updateStatus(userId, treatmentPlanId, input)
    );
  }

  async cancel(
    userId: number,
    treatmentPlanId: number
  ): Promise<PublicTreatmentPlanDetail> {
    return toPublicDetail(
      await this.repository.cancel(userId, treatmentPlanId)
    );
  }

  async createItem(
    userId: number,
    treatmentPlanId: number,
    input: CreateTreatmentPlanItemInput
  ) {
    return toPublicMutation(
      await this.repository.createItem(userId, treatmentPlanId, input)
    );
  }

  async updateItem(
    userId: number,
    treatmentPlanId: number,
    itemId: number,
    input: UpdateTreatmentPlanItemInput
  ) {
    return toPublicMutation(
      await this.repository.updateItem(
        userId,
        treatmentPlanId,
        itemId,
        input
      )
    );
  }

  async updateItemStatus(
    userId: number,
    treatmentPlanId: number,
    itemId: number,
    input: UpdateTreatmentPlanItemStatusInput
  ) {
    return toPublicMutation(
      await this.repository.updateItemStatus(
        userId,
        treatmentPlanId,
        itemId,
        input
      )
    );
  }

  async cancelItem(
    userId: number,
    treatmentPlanId: number,
    itemId: number
  ) {
    return toPublicMutation(
      await this.repository.cancelItem(userId, treatmentPlanId, itemId)
    );
  }

  private async ensurePatient(userId: number, patientId: number) {
    if (!(await this.repository.patientExists(userId, patientId))) {
      throw new TreatmentPlanError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
    }
  }

  private planNotFound() {
    return new TreatmentPlanError(
      'TREATMENT_PLAN_NOT_FOUND',
      'Plan de tratamiento no encontrado'
    );
  }
}

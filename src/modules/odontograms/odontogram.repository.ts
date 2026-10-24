import {
  Op,
  Transaction,
  UniqueConstraintError,
  WhereOptions,
} from 'sequelize';
import { createHash } from 'node:crypto';

import db from '../../db/connection';
import OdontogramFinding from '../../models/odontogram-finding.model';
import OdontogramFindingTreatmentItem from '../../models/odontogram-finding-treatment-item.model';
import Odontogram from '../../models/odontogram.model';
import Patient from '../../models/patient.model';
import TreatmentPlan from '../../models/treatment-plan.model';
import TreatmentPlanItem from '../../models/treatment-plan-item.model';
import User from '../../models/user.model';
import UserConcept from '../../models/user_concept.model';
import { ApiError } from '../../platform/http/api-error';
import { amount, cents } from '../../platform/finance-money';
import {
  CreateOdontogramInput,
  ListOdontogramsQuery,
  OdontogramFindingInput,
  UpdateOdontogramInput,
  CreateFindingTreatmentInput,
} from './odontogram.schemas';
import {
  OdontogramData,
  OdontogramDetailData,
  OdontogramError,
  OdontogramFindingData,
  OdontogramPage,
} from './odontogram.types';

const patientNotFound = () =>
  new OdontogramError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
const odontogramNotFound = () =>
  new OdontogramError('ODONTOGRAM_NOT_FOUND', 'Odontograma no encontrado');

const mapFinding = (finding: OdontogramFinding): OdontogramFindingData => ({
  id: finding.id,
  odontogramId: finding.odontogram_id,
  toothCode: finding.tooth_code,
  condition: finding.condition,
  surface: finding.surface,
  notes: finding.notes,
  treatmentPlanItemIds: [],
  treatmentPlanItems: [],
  createdAt: finding.createdAt,
  updatedAt: finding.updatedAt,
});

const mapOdontogram = (odontogram: Odontogram): OdontogramData => ({
  id: odontogram.id,
  patientId: odontogram.patient_id,
  dentition: odontogram.dentition,
  title: odontogram.title,
  author: {
    userId: odontogram.author_user_id,
    name: odontogram.author_name,
  },
  occurredAt: odontogram.occurred_at,
  archivedAt: odontogram.archived_at,
  createdAt: odontogram.createdAt,
  updatedAt: odontogram.updatedAt,
});

const mapDetail = (odontogram: Odontogram): OdontogramDetailData => ({
  ...mapOdontogram(odontogram),
  findings: (
    (odontogram.get('findings') as OdontogramFinding[] | undefined) ?? []
  ).map(mapFinding),
});

const actor = async (
  userId: number,
  transaction: Transaction
): Promise<{ userId: number; name: string }> => {
  const user = await User.findByPk(userId, { transaction });
  if (!user) throw patientNotFound();
  const name = [user.name, user.middle_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return { userId, name };
};

const lockPatient = async (
  userId: number,
  patientId: number,
  transaction: Transaction
): Promise<Patient> => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!patient) throw patientNotFound();
  return patient;
};

const findingRows = (
  odontogramId: number,
  findings: OdontogramFindingInput[]
) =>
  findings.map((finding) => ({
    odontogram_id: odontogramId,
    tooth_code: finding.toothCode,
    condition: finding.condition,
    surface: finding.surface,
    notes: finding.notes,
  }));

export interface OdontogramRepository {
  createFindingTreatment(
    userId: number,
    odontogramId: number,
    findingId: number,
    input: CreateFindingTreatmentInput,
    key: string
  ): Promise<{ odontogram: OdontogramDetailData; treatmentId: number }>;
  list(
    userId: number,
    patientId: number,
    query: ListOdontogramsQuery
  ): Promise<OdontogramPage | null>;
  findById(
    userId: number,
    odontogramId: number
  ): Promise<OdontogramDetailData | null>;
  create(
    userId: number,
    patientId: number,
    input: CreateOdontogramInput
  ): Promise<OdontogramDetailData>;
  update(
    userId: number,
    odontogramId: number,
    input: UpdateOdontogramInput
  ): Promise<OdontogramDetailData>;
  setArchived(
    userId: number,
    odontogramId: number,
    archived: boolean
  ): Promise<OdontogramDetailData>;
  setTreatmentLink(
    userId: number,
    odontogramId: number,
    findingId: number,
    itemId: number,
    linked: boolean
  ): Promise<OdontogramDetailData>;
}

export class SequelizeOdontogramRepository implements OdontogramRepository {
  async list(
    userId: number,
    patientId: number,
    query: ListOdontogramsQuery
  ): Promise<OdontogramPage | null> {
    if (!(await this.patientExists(userId, patientId))) return null;
    const where: WhereOptions = {
      user_id: userId,
      patient_id: patientId,
      ...(query.dentition !== 'all' && { dentition: query.dentition }),
      ...(query.status === 'active' && { archived_at: null }),
      ...(query.status === 'archived' && {
        archived_at: { [Op.ne]: null },
      }),
    };
    const { count, rows } = await Odontogram.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [
        ['occurred_at', 'DESC'],
        ['id', 'DESC'],
      ],
    });
    return { odontograms: rows.map(mapOdontogram), total: count };
  }

  async findById(
    userId: number,
    odontogramId: number
  ): Promise<OdontogramDetailData | null> {
    const odontogram = await Odontogram.findOne({
      where: { id: odontogramId, user_id: userId },
      include: [
        {
          model: OdontogramFinding,
          as: 'findings',
          separate: true,
          order: [
            ['tooth_code', 'ASC'],
            ['id', 'ASC'],
          ],
        },
      ],
    });
    if (!odontogram) return null;
    const detail = mapDetail(odontogram);
    if (detail.findings.length === 0) return detail;
    const links = await OdontogramFindingTreatmentItem.findAll({
      where: { finding_id: detail.findings.map((finding) => finding.id) },
      order: [['treatment_plan_item_id', 'ASC']],
    });
    const findingById = new Map(
      detail.findings.map((finding) => [finding.id, finding])
    );
    for (const link of links) {
      findingById
        .get(link.finding_id)
        ?.treatmentPlanItemIds.push(link.treatment_plan_item_id);
    }
    if (links.length > 0) {
      const items = await TreatmentPlanItem.findAll({
        where: {
          id: [...new Set(links.map((link) => link.treatment_plan_item_id))],
        },
      });
      const itemById = new Map(items.map((item) => [item.id, item]));
      for (const link of links) {
        const item = itemById.get(link.treatment_plan_item_id);
        if (!item) continue;
        findingById.get(link.finding_id)?.treatmentPlanItems.push({
          id: item.id,
          treatmentPlanId: item.treatment_plan_id,
          userConceptId: item.user_concept_id,
          name: item.name,
          status: item.status,
        });
      }
    }
    return detail;
  }

  async create(
    userId: number,
    patientId: number,
    input: CreateOdontogramInput
  ): Promise<OdontogramDetailData> {
    let odontogramId = 0;
    await db.transaction(async (transaction) => {
      await lockPatient(userId, patientId, transaction);
      const createdBy = await actor(userId, transaction);
      const odontogram = await Odontogram.create(
        {
          user_id: userId,
          patient_id: patientId,
          dentition: input.dentition,
          title: input.title,
          author_user_id: createdBy.userId,
          author_name: createdBy.name,
          occurred_at: input.occurredAt
            ? new Date(input.occurredAt)
            : new Date(),
          archived_at: null,
        },
        { transaction }
      );
      odontogramId = odontogram.id;
      if (input.findings.length > 0) {
        await OdontogramFinding.bulkCreate(
          findingRows(odontogram.id, input.findings),
          { transaction }
        );
      }
    });
    return (await this.findById(userId, odontogramId))!;
  }

  async update(
    userId: number,
    odontogramId: number,
    input: UpdateOdontogramInput
  ): Promise<OdontogramDetailData> {
    await db.transaction(async (transaction) => {
      const odontogram = await this.lockOdontogram(
        userId,
        odontogramId,
        transaction
      );
      if (odontogram.archived_at) {
        throw new OdontogramError(
          'ODONTOGRAM_ARCHIVED',
          'El odontograma debe restaurarse antes de editarse'
        );
      }
      await odontogram.update(
        {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.occurredAt !== undefined && {
            occurred_at: new Date(input.occurredAt),
          }),
        },
        { transaction }
      );
      if (input.findings !== undefined) {
        const existing = await OdontogramFinding.findAll({
          where: { odontogram_id: odontogram.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const findingKey = (finding: {
          toothCode: string;
          condition: string;
          surface: string | null;
        }) =>
          `${finding.toothCode}:${finding.condition}:${finding.surface ?? ''}`;
        const byKey = new Map(
          existing.map((finding) => [
            findingKey({
              toothCode: finding.tooth_code,
              condition: finding.condition,
              surface: finding.surface,
            }),
            finding,
          ])
        );
        for (const finding of input.findings) {
          const key = findingKey(finding);
          const persisted = byKey.get(key);
          if (persisted) {
            byKey.delete(key);
            if (persisted.notes !== finding.notes) {
              await persisted.update({ notes: finding.notes }, { transaction });
            }
          } else {
            await OdontogramFinding.create(
              findingRows(odontogram.id, [finding])[0],
              { transaction }
            );
          }
        }
        if (byKey.size > 0) {
          if (
            await OdontogramFindingTreatmentItem.count({
              where: {
                finding_id: [...byKey.values()].map((finding) => finding.id),
              },
              transaction,
            })
          ) {
            throw new ApiError({
              code: 'ODONTOGRAM_FINDING_HAS_TREATMENTS',
              message:
                'Desvincula primero los tratamientos antes de quitar el hallazgo o cambiar su pieza, condición o superficie. Sus notas sí pueden editarse.',
              statusCode: 409,
            });
          }
          await OdontogramFinding.destroy({
            where: { id: [...byKey.values()].map((finding) => finding.id) },
            transaction,
          });
        }
      }
    });
    return (await this.findById(userId, odontogramId))!;
  }

  async setArchived(
    userId: number,
    odontogramId: number,
    archived: boolean
  ): Promise<OdontogramDetailData> {
    await db.transaction(async (transaction) => {
      const odontogram = await this.lockOdontogram(
        userId,
        odontogramId,
        transaction
      );
      if (
        (archived && odontogram.archived_at) ||
        (!archived && !odontogram.archived_at)
      ) {
        return;
      }
      await odontogram.update(
        { archived_at: archived ? new Date() : null },
        { transaction }
      );
    });
    return (await this.findById(userId, odontogramId))!;
  }

  async setTreatmentLink(
    userId: number,
    odontogramId: number,
    findingId: number,
    itemId: number,
    linked: boolean
  ): Promise<OdontogramDetailData> {
    await db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
      async (transaction) => {
        await this.lockChartPatient(userId, odontogramId, transaction);
        const odontogram = await this.lockOdontogram(
          userId,
          odontogramId,
          transaction
        );
        if (odontogram.archived_at) {
          throw new OdontogramError(
            'ODONTOGRAM_ARCHIVED',
            'El odontograma debe restaurarse antes de editarse'
          );
        }
        const finding = await OdontogramFinding.findOne({
          where: { id: findingId, odontogram_id: odontogram.id },
          transaction,
        });
        if (!finding) {
          throw new OdontogramError(
            'ODONTOGRAM_FINDING_NOT_FOUND',
            'Hallazgo no encontrado'
          );
        }
        const candidate = await TreatmentPlanItem.findByPk(itemId, {
          transaction,
        });
        const owner = candidate
          ? await Patient.findOne({
              where: { id: candidate.patient_id, user_id: userId },
              transaction,
            })
          : null;
        if (!candidate || !owner)
          throw new OdontogramError(
            'TREATMENT_PLAN_ITEM_NOT_FOUND',
            'Tratamiento no encontrado'
          );
        if (candidate.patient_id !== odontogram.patient_id)
          throw new OdontogramError(
            'TREATMENT_PATIENT_MISMATCH',
            'El tratamiento pertenece a otro paciente'
          );
        const plan = candidate.treatment_plan_id
          ? await TreatmentPlan.findOne({
              where: {
                id: candidate.treatment_plan_id,
                user_id: userId,
                patient_id: odontogram.patient_id,
              },
              transaction,
              lock: transaction.LOCK.UPDATE,
            })
          : null;
        if (candidate.treatment_plan_id !== null && !plan) {
          throw new OdontogramError(
            'TREATMENT_PLAN_ITEM_NOT_FOUND',
            'Item de tratamiento no encontrado'
          );
        }
        const item = (await TreatmentPlanItem.findByPk(itemId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }))!;
        const where = {
          finding_id: finding.id,
          treatment_plan_item_id: item.id,
        };
        if (linked) {
          const existing = await OdontogramFindingTreatmentItem.findOne({
            where,
            transaction,
          });
          if (existing) return;
          if (!item.user_concept_id)
            throw new ApiError({
              code: 'TREATMENT_CATALOG_REQUIRED',
              message:
                'Vincula el tratamiento histórico al catálogo antes de asociarlo a un hallazgo.',
              statusCode: 409,
            });
          if (item.status === 'CANCELLED' || plan?.status === 'CANCELLED')
            throw new ApiError({
              code: 'TREATMENT_CANCELLED',
              message: 'No se pueden asociar tratamientos o planes cancelados.',
              statusCode: 409,
            });
          await OdontogramFindingTreatmentItem.findOrCreate({
            where,
            defaults: where,
            transaction,
          });
        } else {
          await OdontogramFindingTreatmentItem.destroy({ where, transaction });
        }
      }
    );
    return (await this.findById(userId, odontogramId))!;
  }

  async createFindingTreatment(
    userId: number,
    odontogramId: number,
    findingId: number,
    input: CreateFindingTreatmentInput,
    key: string
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ userId, odontogramId, findingId, input }))
      .digest('hex');
    const conflict = (code: string, message: string): never => {
      throw new ApiError({ code, message, statusCode: 409 });
    };
    const treatmentId = await db
      .transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async (transaction) => {
          await this.lockChartPatient(userId, odontogramId, transaction);
          const chart = await this.lockOdontogram(
            userId,
            odontogramId,
            transaction
          );
          const existing = await TreatmentPlanItem.findOne({
            where: { odontogram_creation_key: key },
            transaction,
          });
          if (existing) {
            if (
              existing.patient_id !== chart.patient_id ||
              existing.odontogram_creation_hash !== hash
            )
              return conflict(
                'IDEMPOTENCY_KEY_REUSED',
                'La llave ya se utilizó con otros datos. No se duplicó el tratamiento.'
              );
            return existing.id;
          }
          if (chart.archived_at)
            throw new OdontogramError(
              'ODONTOGRAM_ARCHIVED',
              'Restaura el odontograma antes de asignar tratamientos'
            );
          const finding = await OdontogramFinding.findOne({
            where: { id: findingId, odontogram_id: odontogramId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!finding)
            throw new OdontogramError(
              'ODONTOGRAM_FINDING_NOT_FOUND',
              'Hallazgo no encontrado'
            );
          const catalog = await UserConcept.findOne({
            where: { id: input.userConceptId, user_id: userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!catalog)
            throw new ApiError({
              code: 'TREATMENT_CATALOG_NOT_FOUND',
              message: 'Tratamiento del catálogo no encontrado',
              statusCode: 404,
            });
          if (!catalog.active)
            return conflict(
              'TREATMENT_CATALOG_ARCHIVED',
              'El tratamiento del catálogo está archivado'
            );
          const links = await OdontogramFindingTreatmentItem.findAll({
            where: { finding_id: findingId },
            transaction,
          });
          if (
            links.length &&
            (await TreatmentPlanItem.count({
              where: {
                id: links.map((link) => link.treatment_plan_item_id),
                user_concept_id: input.userConceptId,
              },
              transaction,
            }))
          ) {
            return conflict(
              'FINDING_TREATMENT_ALREADY_EXISTS',
              'Este hallazgo ya tiene un tratamiento de ese catálogo. Revisa el existente antes de crear otro.'
            );
          }
          const subtotal =
            (cents(input.quantity) * cents(catalog.unit_price) + 50n) / 100n;
          if (subtotal > 999_999_999_999n)
            return conflict(
              'TREATMENT_PLAN_AMOUNT_LIMIT_EXCEEDED',
              'El importe excede el límite permitido'
            );
          const item = await TreatmentPlanItem.create(
            {
              patient_id: chart.patient_id,
              treatment_plan_id: null,
              user_concept_id: catalog.id,
              name: catalog.description,
              description: null,
              tooth: finding.tooth_code,
              area: finding.surface,
              quantity: input.quantity,
              unit_price: amount(cents(catalog.unit_price)),
              subtotal: amount(subtotal),
              phase: null,
              priority: null,
              notes: input.notes,
              sort_order: 0,
              status: 'PENDING',
              completed_at: null,
              odontogram_creation_key: key,
              odontogram_creation_hash: hash,
            },
            { transaction }
          );
          await OdontogramFindingTreatmentItem.create(
            { finding_id: finding.id, treatment_plan_item_id: item.id },
            { transaction }
          );
          return item.id;
        }
      )
      .catch((error) => {
        if (error instanceof UniqueConstraintError)
          return conflict(
            'IDEMPOTENCY_KEY_REUSED',
            'La llave ya se utilizó en otra operación. No se duplicó el tratamiento.'
          );
        throw error;
      });
    return {
      odontogram: (await this.findById(userId, odontogramId))!,
      treatmentId,
    };
  }

  private async lockChartPatient(
    userId: number,
    odontogramId: number,
    transaction: Transaction
  ) {
    const chart = await Odontogram.findOne({
      where: { id: odontogramId, user_id: userId },
      transaction,
    });
    if (!chart) throw odontogramNotFound();
    await lockPatient(userId, chart.patient_id, transaction);
  }

  private async patientExists(userId: number, patientId: number) {
    return (
      (await Patient.count({ where: { id: patientId, user_id: userId } })) > 0
    );
  }

  private async lockOdontogram(
    userId: number,
    odontogramId: number,
    transaction: Transaction
  ): Promise<Odontogram> {
    const odontogram = await Odontogram.findOne({
      where: { id: odontogramId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!odontogram) throw odontogramNotFound();
    return odontogram;
  }
}

import { Op, Transaction, WhereOptions } from 'sequelize';

import db from '../../db/connection';
import OdontogramFinding from '../../models/odontogram-finding.model';
import OdontogramFindingTreatmentItem from '../../models/odontogram-finding-treatment-item.model';
import Odontogram from '../../models/odontogram.model';
import Patient from '../../models/patient.model';
import TreatmentPlan from '../../models/treatment-plan.model';
import TreatmentPlanItem from '../../models/treatment-plan-item.model';
import User from '../../models/user.model';
import {
  CreateOdontogramInput,
  ListOdontogramsQuery,
  OdontogramFindingInput,
  UpdateOdontogramInput,
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
  list(
    userId: number,
    patientId: number,
    query: ListOdontogramsQuery
  ): Promise<OdontogramPage | null>;
  findById(userId: number, odontogramId: number): Promise<OdontogramDetailData | null>;
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
    const findingById = new Map(detail.findings.map((finding) => [finding.id, finding]));
    for (const link of links) {
      findingById.get(link.finding_id)?.treatmentPlanItemIds.push(
        link.treatment_plan_item_id
      );
    }
    if (links.length > 0) {
      const items = await TreatmentPlanItem.findAll({
        where: { id: [...new Set(links.map((link) => link.treatment_plan_item_id))] },
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
        }) => `${finding.toothCode}:${finding.condition}:${finding.surface ?? ''}`;
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
      if ((archived && odontogram.archived_at) || (!archived && !odontogram.archived_at)) {
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
      const item = await TreatmentPlanItem.findByPk(itemId, { transaction });
      const plan = item
        ? await TreatmentPlan.findOne({
            where: { id: item.treatment_plan_id, user_id: userId },
            transaction,
          })
        : null;
      if (!plan) {
        throw new OdontogramError(
          'TREATMENT_PLAN_ITEM_NOT_FOUND',
          'Item de tratamiento no encontrado'
        );
      }
      if (plan.patient_id !== odontogram.patient_id) {
        throw new OdontogramError(
          'TREATMENT_PATIENT_MISMATCH',
          'El tratamiento pertenece a otro paciente'
        );
      }
      const where = { finding_id: finding.id, treatment_plan_item_id: item!.id };
      if (linked) {
        await OdontogramFindingTreatmentItem.findOrCreate({
          where,
          defaults: where,
          transaction,
        });
      } else {
        await OdontogramFindingTreatmentItem.destroy({ where, transaction });
      }
    });
    return (await this.findById(userId, odontogramId))!;
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

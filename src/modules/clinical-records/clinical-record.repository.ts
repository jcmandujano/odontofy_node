import { Op, Transaction, WhereOptions } from 'sequelize'

import db from '../../db/connection'
import EvolutionNoteRevision from '../../models/evolution-note-revision.model'
import EvolutionNote from '../../models/evolution-note.model'
import MedicalHistoryRevision from '../../models/medical-history-revision.model'
import Patient from '../../models/patient.model'
import TreatmentPlan from '../../models/treatment-plan.model'
import TreatmentPlanItem from '../../models/treatment-plan-item.model'
import User from '../../models/user.model'
import {
  CreateEvolutionNoteInput,
  ListEvolutionNotesQuery,
  ListRevisionsQuery,
  NoteLifecycleInput,
  UpdateEvolutionNoteInput,
  UpdateMedicalHistoryInput,
} from './clinical-record.schemas'
import {
  ClinicalRecordError,
  EvolutionNoteData,
  EvolutionNotePage,
  EvolutionNoteRevisionData,
  MedicalAnswerData,
  MedicalHistoryData,
  MedicalHistoryRevisionData,
  RevisionPage,
} from './clinical-record.types'

const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`)

const patientNotFound = () =>
  new ClinicalRecordError('PATIENT_NOT_FOUND', 'Paciente no encontrado')
const noteNotFound = () =>
  new ClinicalRecordError(
    'EVOLUTION_NOTE_NOT_FOUND',
    'Nota de evolucion no encontrada'
  )

const mapNote = (note: EvolutionNote): EvolutionNoteData => ({
  id: note.id,
  patientId: note.patient_id,
  treatmentPlanId: note.treatment_plan_id,
  treatmentPlanItemId: note.treatment_plan_item_id,
  author: { userId: note.author_user_id, name: note.author_name },
  note: note.note,
  version: note.version,
  occurredAt: note.occurred_at,
  archivedAt: note.archived_at,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
})

const mapNoteRevision = (
  revision: EvolutionNoteRevision
): EvolutionNoteRevisionData => ({
  id: revision.id,
  evolutionNoteId: revision.evolution_note_id,
  version: revision.version,
  author: { userId: revision.author_user_id, name: revision.author_name },
  action: revision.action,
  note: revision.note,
  treatmentPlanId: revision.treatment_plan_id,
  treatmentPlanItemId: revision.treatment_plan_item_id,
  occurredAt: revision.occurred_at,
  archivedAt: revision.archived_at,
  changeReason: revision.change_reason,
  recordedAt: revision.created_at,
})

const familySummary = (
  value: Record<string, unknown> | null
): string | null => {
  const summary = value?.summary
  return typeof summary === 'string' && summary.length > 0 ? summary : null
}

const personalData = (
  value: Record<string, unknown> | null
): { answers: MedicalAnswerData[]; otherNotes: string | null } => {
  const answers = Array.isArray(value?.answers)
    ? (value.answers as MedicalAnswerData[])
    : []
  const otherNotes = value?.otherNotes
  return {
    answers,
    otherNotes:
      typeof otherNotes === 'string' && otherNotes.length > 0
        ? otherNotes
        : null,
  }
}

const mapMedicalHistory = (
  patient: Patient,
  revision: MedicalHistoryRevision | null
): MedicalHistoryData => {
  const personal = personalData(patient.personal_medical_history)
  return {
    patientId: patient.id,
    questionnaireVersion: '1.0',
    version: revision?.version ?? 0,
    familyHistory: familySummary(patient.family_medical_history),
    answers: personal.answers,
    otherNotes: personal.otherNotes,
    author: revision
      ? { userId: revision.author_user_id, name: revision.author_name }
      : null,
    changeReason: revision?.change_reason ?? null,
    recordedAt: revision?.created_at ?? null,
  }
}

const mapMedicalRevision = (
  revision: MedicalHistoryRevision
): MedicalHistoryRevisionData => {
  const personal = personalData(revision.personal_history)
  return {
    patientId: revision.patient_id,
    questionnaireVersion: '1.0',
    version: revision.version,
    familyHistory: familySummary(revision.family_history),
    answers: personal.answers,
    otherNotes: personal.otherNotes,
    author: { userId: revision.author_user_id, name: revision.author_name },
    changeReason: revision.change_reason,
    recordedAt: revision.created_at,
  }
}

const actor = async (
  userId: number,
  transaction: Transaction
): Promise<{ userId: number; name: string }> => {
  const user = await User.findByPk(userId, { transaction })
  if (!user) throw patientNotFound()
  const name = [user.name, user.middle_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return { userId, name }
}

const lockPatient = async (
  userId: number,
  patientId: number,
  transaction: Transaction
): Promise<Patient> => {
  const patient = await Patient.findOne({
    where: { id: patientId, user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!patient) throw patientNotFound()
  return patient
}

interface ClinicalReferences {
  plan: TreatmentPlan | null
  item: TreatmentPlanItem | null
}

const validateReferences = async (
  userId: number,
  patientId: number,
  treatmentPlanId: number | null,
  treatmentPlanItemId: number | null,
  transaction: Transaction
): Promise<ClinicalReferences> => {
  if (treatmentPlanItemId != null && treatmentPlanId == null) {
    throw new ClinicalRecordError(
      'TREATMENT_REFERENCE_INVALID',
      'El item debe pertenecer a un plan autorizado'
    )
  }

  let plan: TreatmentPlan | null = null
  if (treatmentPlanId != null) {
    plan = await TreatmentPlan.findOne({
      where: { id: treatmentPlanId, user_id: userId, patient_id: patientId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!plan) {
      throw new ClinicalRecordError(
        'TREATMENT_PLAN_NOT_FOUND',
        'Plan de tratamiento no encontrado'
      )
    }
  }

  let item: TreatmentPlanItem | null = null
  if (treatmentPlanItemId != null) {
    item = await TreatmentPlanItem.findOne({
      where: { id: treatmentPlanItemId, treatment_plan_id: plan!.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!item) {
      throw new ClinicalRecordError(
        'TREATMENT_PLAN_ITEM_NOT_FOUND',
        'Item de tratamiento no encontrado'
      )
    }
  }
  return { plan, item }
}

const appendNoteRevision = async (
  note: EvolutionNote,
  revisionActor: { userId: number; name: string },
  action: 'CREATED' | 'AMENDED' | 'ARCHIVED' | 'RESTORED',
  changeReason: string | null,
  transaction: Transaction
) => {
  await EvolutionNoteRevision.create(
    {
      evolution_note_id: note.id,
      version: note.version,
      author_user_id: revisionActor.userId,
      author_name: revisionActor.name,
      action,
      note: note.note,
      treatment_plan_id: note.treatment_plan_id,
      treatment_plan_item_id: note.treatment_plan_item_id,
      occurred_at: note.occurred_at,
      archived_at: note.archived_at,
      change_reason: changeReason,
    },
    { transaction }
  )
}

export interface ClinicalRecordRepository {
  getMedicalHistory(
    userId: number,
    patientId: number
  ): Promise<MedicalHistoryData | null>
  updateMedicalHistory(
    userId: number,
    patientId: number,
    input: UpdateMedicalHistoryInput
  ): Promise<MedicalHistoryData>
  listMedicalHistoryRevisions(
    userId: number,
    patientId: number,
    query: ListRevisionsQuery
  ): Promise<RevisionPage<MedicalHistoryRevisionData> | null>
  listNotes(
    userId: number,
    patientId: number,
    query: ListEvolutionNotesQuery
  ): Promise<EvolutionNotePage | null>
  findNote(
    userId: number,
    patientId: number,
    noteId: number
  ): Promise<EvolutionNoteData | null>
  createNote(
    userId: number,
    patientId: number,
    input: CreateEvolutionNoteInput
  ): Promise<EvolutionNoteData>
  updateNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: UpdateEvolutionNoteInput
  ): Promise<EvolutionNoteData>
  archiveNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ): Promise<EvolutionNoteData>
  restoreNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ): Promise<EvolutionNoteData>
  listNoteRevisions(
    userId: number,
    patientId: number,
    noteId: number,
    query: ListRevisionsQuery
  ): Promise<RevisionPage<EvolutionNoteRevisionData> | null>
}

export class SequelizeClinicalRecordRepository implements ClinicalRecordRepository {
  async getMedicalHistory(userId: number, patientId: number) {
    const patient = await Patient.findOne({
      where: { id: patientId, user_id: userId },
    })
    if (!patient) return null
    const revision = await MedicalHistoryRevision.findOne({
      where: { patient_id: patientId },
      order: [['version', 'DESC']],
    })
    return mapMedicalHistory(patient, revision)
  }

  async updateMedicalHistory(
    userId: number,
    patientId: number,
    input: UpdateMedicalHistoryInput
  ) {
    await db.transaction(async (transaction) => {
      const patient = await lockPatient(userId, patientId, transaction)
      const revisionActor = await actor(userId, transaction)
      const latest = await MedicalHistoryRevision.findOne({
        where: { patient_id: patientId },
        order: [['version', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
      const family = { schemaVersion: '1.0', summary: input.familyHistory }
      const personal = {
        schemaVersion: '1.0',
        answers: input.answers,
        otherNotes: input.otherNotes,
      }
      await patient.update(
        { family_medical_history: family, personal_medical_history: personal },
        { transaction }
      )
      await MedicalHistoryRevision.create(
        {
          patient_id: patientId,
          version: (latest?.version ?? 0) + 1,
          questionnaire_version: input.questionnaireVersion,
          family_history: family,
          personal_history: personal,
          author_user_id: revisionActor.userId,
          author_name: revisionActor.name,
          change_reason: input.changeReason,
        },
        { transaction }
      )
    })
    return (await this.getMedicalHistory(userId, patientId))!
  }

  async listMedicalHistoryRevisions(
    userId: number,
    patientId: number,
    query: ListRevisionsQuery
  ) {
    if (!(await this.patientExists(userId, patientId))) return null
    const { count, rows } = await MedicalHistoryRevision.findAndCountAll({
      where: { patient_id: patientId },
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['version', 'DESC']],
    })
    return { revisions: rows.map(mapMedicalRevision), total: count }
  }

  async listNotes(
    userId: number,
    patientId: number,
    query: ListEvolutionNotesQuery
  ) {
    if (!(await this.patientExists(userId, patientId))) return null
    const where: WhereOptions = {
      patient_id: patientId,
      ...(query.status === 'active' && { archived_at: null }),
      ...(query.status === 'archived' && { archived_at: { [Op.ne]: null } }),
      ...(query.treatmentPlanId !== undefined && {
        treatment_plan_id: query.treatmentPlanId,
      }),
      ...(query.treatmentPlanItemId !== undefined && {
        treatment_plan_item_id: query.treatmentPlanItemId,
      }),
      ...(query.search && {
        note: { [Op.like]: `%${escapeLike(query.search)}%` },
      }),
    }
    const { count, rows } = await EvolutionNote.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [
        ['occurred_at', 'DESC'],
        ['id', 'DESC'],
      ],
    })
    return { notes: rows.map(mapNote), total: count }
  }

  async findNote(userId: number, patientId: number, noteId: number) {
    if (!(await this.patientExists(userId, patientId))) return null
    const note = await EvolutionNote.findOne({
      where: { id: noteId, patient_id: patientId },
    })
    return note ? mapNote(note) : null
  }

  async createNote(
    userId: number,
    patientId: number,
    input: CreateEvolutionNoteInput
  ) {
    let noteId = 0
    await db.transaction(async (transaction) => {
      await lockPatient(userId, patientId, transaction)
      const revisionActor = await actor(userId, transaction)
      const refs = await validateReferences(
        userId,
        patientId,
        input.treatmentPlanId,
        input.treatmentPlanItemId,
        transaction
      )
      if (
        input.completeTreatmentItem &&
        (refs.plan?.status === 'CANCELLED' || refs.item?.status === 'CANCELLED')
      ) {
        throw new ClinicalRecordError(
          'TREATMENT_NOT_COMPLETABLE',
          'Un plan o item cancelado no puede completarse desde una nota'
        )
      }
      const note = await EvolutionNote.create(
        {
          patient_id: patientId,
          treatment_plan_id: input.treatmentPlanId,
          treatment_plan_item_id: input.treatmentPlanItemId,
          author_user_id: revisionActor.userId,
          author_name: revisionActor.name,
          note: input.note,
          occurred_at: input.occurredAt
            ? new Date(input.occurredAt)
            : new Date(),
          archived_at: null,
        },
        { transaction }
      )
      noteId = note.id
      await appendNoteRevision(
        note,
        revisionActor,
        'CREATED',
        null,
        transaction
      )
      if (input.completeTreatmentItem && refs.item) {
        await refs.item.update(
          {
            status: 'COMPLETED',
            completed_at:
              refs.item.status === 'COMPLETED'
                ? refs.item.completed_at
                : new Date(),
          },
          { transaction }
        )
      }
    })
    return (await this.findNote(userId, patientId, noteId))!
  }

  async updateNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: UpdateEvolutionNoteInput
  ) {
    await db.transaction(async (transaction) => {
      await lockPatient(userId, patientId, transaction)
      const note = await this.lockNote(patientId, noteId, transaction)
      if (note.archived_at) {
        throw new ClinicalRecordError(
          'EVOLUTION_NOTE_ARCHIVED',
          'La nota archivada debe restaurarse antes de corregirse'
        )
      }
      const planId =
        input.treatmentPlanId === undefined
          ? note.treatment_plan_id
          : input.treatmentPlanId
      const itemId =
        input.treatmentPlanItemId === undefined
          ? note.treatment_plan_item_id
          : input.treatmentPlanItemId
      await validateReferences(userId, patientId, planId, itemId, transaction)
      const revisionActor = await actor(userId, transaction)
      await note.update(
        {
          ...(input.note !== undefined && { note: input.note }),
          ...(input.treatmentPlanId !== undefined && {
            treatment_plan_id: input.treatmentPlanId,
          }),
          ...(input.treatmentPlanItemId !== undefined && {
            treatment_plan_item_id: input.treatmentPlanItemId,
          }),
          ...(input.occurredAt !== undefined && {
            occurred_at: new Date(input.occurredAt),
          }),
          version: note.version + 1,
        },
        { transaction }
      )
      await appendNoteRevision(
        note,
        revisionActor,
        'AMENDED',
        input.changeReason,
        transaction
      )
    })
    return (await this.findNote(userId, patientId, noteId))!
  }

  async archiveNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ) {
    await this.changeArchiveState(userId, patientId, noteId, input, true)
    return (await this.findNote(userId, patientId, noteId))!
  }

  async restoreNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ) {
    await this.changeArchiveState(userId, patientId, noteId, input, false)
    return (await this.findNote(userId, patientId, noteId))!
  }

  async listNoteRevisions(
    userId: number,
    patientId: number,
    noteId: number,
    query: ListRevisionsQuery
  ) {
    if (!(await this.findNote(userId, patientId, noteId))) return null
    const { count, rows } = await EvolutionNoteRevision.findAndCountAll({
      where: { evolution_note_id: noteId },
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['version', 'DESC']],
    })
    return { revisions: rows.map(mapNoteRevision), total: count }
  }

  private async patientExists(userId: number, patientId: number) {
    return (
      (await Patient.count({ where: { id: patientId, user_id: userId } })) > 0
    )
  }

  private async lockNote(
    patientId: number,
    noteId: number,
    transaction: Transaction
  ) {
    const note = await EvolutionNote.findOne({
      where: { id: noteId, patient_id: patientId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!note) throw noteNotFound()
    return note
  }

  private async changeArchiveState(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput,
    archive: boolean
  ) {
    await db.transaction(async (transaction) => {
      await lockPatient(userId, patientId, transaction)
      const note = await this.lockNote(patientId, noteId, transaction)
      if ((archive && note.archived_at) || (!archive && !note.archived_at))
        return
      const revisionActor = await actor(userId, transaction)
      await note.update(
        { archived_at: archive ? new Date() : null, version: note.version + 1 },
        { transaction }
      )
      await appendNoteRevision(
        note,
        revisionActor,
        archive ? 'ARCHIVED' : 'RESTORED',
        input.changeReason,
        transaction
      )
    })
  }
}

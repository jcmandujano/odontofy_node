import {
  CreateEvolutionNoteInput,
  ListEvolutionNotesQuery,
  ListRevisionsQuery,
  NoteLifecycleInput,
  UpdateEvolutionNoteInput,
  UpdateMedicalHistoryInput,
} from './clinical-record.schemas'
import {
  ClinicalRecordRepository,
  SequelizeClinicalRecordRepository,
} from './clinical-record.repository'
import {
  ClinicalRecordError,
  EvolutionNoteData,
  EvolutionNoteRevisionData,
  MedicalHistoryData,
  MedicalHistoryRevisionData,
} from './clinical-record.types'

const iso = (date: Date | null): string | null => date?.toISOString() ?? null

const publicMedicalHistory = (history: MedicalHistoryData) => ({
  ...history,
  recordedAt: iso(history.recordedAt),
})

const publicNote = (note: EvolutionNoteData) => ({
  ...note,
  occurredAt: note.occurredAt.toISOString(),
  archivedAt: iso(note.archivedAt),
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})

const publicMedicalRevision = (revision: MedicalHistoryRevisionData) => ({
  ...revision,
  recordedAt: revision.recordedAt.toISOString(),
})

const publicNoteRevision = (revision: EvolutionNoteRevisionData) => ({
  ...revision,
  occurredAt: revision.occurredAt.toISOString(),
  archivedAt: iso(revision.archivedAt),
  recordedAt: revision.recordedAt.toISOString(),
})

const pagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
})

export interface ClinicalRecordServiceDependencies {
  repository?: ClinicalRecordRepository
}

export class ClinicalRecordService {
  private readonly repository: ClinicalRecordRepository

  constructor(dependencies: ClinicalRecordServiceDependencies = {}) {
    this.repository =
      dependencies.repository ?? new SequelizeClinicalRecordRepository()
  }

  async getMedicalHistory(userId: number, patientId: number) {
    const history = await this.repository.getMedicalHistory(userId, patientId)
    if (!history) throw this.patientNotFound()
    return publicMedicalHistory(history)
  }

  async updateMedicalHistory(
    userId: number,
    patientId: number,
    input: UpdateMedicalHistoryInput
  ) {
    return publicMedicalHistory(
      await this.repository.updateMedicalHistory(userId, patientId, input)
    )
  }

  async listMedicalHistoryRevisions(
    userId: number,
    patientId: number,
    query: ListRevisionsQuery
  ) {
    const result = await this.repository.listMedicalHistoryRevisions(
      userId,
      patientId,
      query
    )
    if (!result) throw this.patientNotFound()
    return {
      revisions: result.revisions.map(publicMedicalRevision),
      pagination: pagination(query.page, query.pageSize, result.total),
    }
  }

  async listNotes(
    userId: number,
    patientId: number,
    query: ListEvolutionNotesQuery
  ) {
    const result = await this.repository.listNotes(userId, patientId, query)
    if (!result) throw this.patientNotFound()
    return {
      notes: result.notes.map(publicNote),
      pagination: pagination(query.page, query.pageSize, result.total),
    }
  }

  async getNote(userId: number, patientId: number, noteId: number) {
    const note = await this.repository.findNote(userId, patientId, noteId)
    if (!note) throw this.noteNotFound()
    return publicNote(note)
  }

  async createNote(
    userId: number,
    patientId: number,
    input: CreateEvolutionNoteInput
  ) {
    return publicNote(
      await this.repository.createNote(userId, patientId, input)
    )
  }

  async updateNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: UpdateEvolutionNoteInput
  ) {
    return publicNote(
      await this.repository.updateNote(userId, patientId, noteId, input)
    )
  }

  async archiveNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ) {
    return publicNote(
      await this.repository.archiveNote(userId, patientId, noteId, input)
    )
  }

  async restoreNote(
    userId: number,
    patientId: number,
    noteId: number,
    input: NoteLifecycleInput
  ) {
    return publicNote(
      await this.repository.restoreNote(userId, patientId, noteId, input)
    )
  }

  async listNoteRevisions(
    userId: number,
    patientId: number,
    noteId: number,
    query: ListRevisionsQuery
  ) {
    const result = await this.repository.listNoteRevisions(
      userId,
      patientId,
      noteId,
      query
    )
    if (!result) throw this.noteNotFound()
    return {
      revisions: result.revisions.map(publicNoteRevision),
      pagination: pagination(query.page, query.pageSize, result.total),
    }
  }

  private patientNotFound() {
    return new ClinicalRecordError(
      'PATIENT_NOT_FOUND',
      'Paciente no encontrado'
    )
  }

  private noteNotFound() {
    return new ClinicalRecordError(
      'EVOLUTION_NOTE_NOT_FOUND',
      'Nota de evolucion no encontrada'
    )
  }
}

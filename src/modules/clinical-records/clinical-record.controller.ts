import { Request, RequestHandler } from 'express'

import { sendSuccess } from '../../platform/http/response'
import { authenticatedUserId } from '../identity/identity.middleware'
import {
  CreateEvolutionNoteInput,
  EvolutionNoteParams,
  ListEvolutionNotesQuery,
  ListRevisionsQuery,
  NoteLifecycleInput,
  PatientClinicalRecordParams,
  UpdateEvolutionNoteInput,
  UpdateMedicalHistoryInput,
} from './clinical-record.schemas'
import { ClinicalRecordService } from './clinical-record.service'

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T =>
  req.validated?.[target] as T

export const createClinicalRecordController = (
  service: ClinicalRecordService
) => {
  const patientId = (req: Request) =>
    validated<PatientClinicalRecordParams>(req, 'params').patientId

  const getMedicalHistory: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.getMedicalHistory(authenticatedUserId(req), patientId(req)),
      { message: 'Historial medico obtenido' }
    )

  const updateMedicalHistory: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.updateMedicalHistory(
        authenticatedUserId(req),
        patientId(req),
        validated<UpdateMedicalHistoryInput>(req, 'body')
      ),
      { message: 'Historial medico actualizado' }
    )

  const listMedicalHistoryRevisions: RequestHandler = async (req, res) => {
    const result = await service.listMedicalHistoryRevisions(
      authenticatedUserId(req),
      patientId(req),
      validated<ListRevisionsQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.revisions, {
      message: 'Revisiones del historial medico obtenidas',
      meta: { pagination: result.pagination },
    })
  }

  const listNotes: RequestHandler = async (req, res) => {
    const result = await service.listNotes(
      authenticatedUserId(req),
      patientId(req),
      validated<ListEvolutionNotesQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.notes, {
      message: 'Notas de evolucion obtenidas',
      meta: { pagination: result.pagination },
    })
  }

  const getNote: RequestHandler = async (req, res) => {
    const params = validated<EvolutionNoteParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.getNote(
        authenticatedUserId(req),
        params.patientId,
        params.noteId
      ),
      { message: 'Nota de evolucion obtenida' }
    )
  }

  const createNote: RequestHandler = async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.createNote(
        authenticatedUserId(req),
        patientId(req),
        validated<CreateEvolutionNoteInput>(req, 'body')
      ),
      { message: 'Nota de evolucion creada', statusCode: 201 }
    )

  const updateNote: RequestHandler = async (req, res) => {
    const params = validated<EvolutionNoteParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.updateNote(
        authenticatedUserId(req),
        params.patientId,
        params.noteId,
        validated<UpdateEvolutionNoteInput>(req, 'body')
      ),
      { message: 'Nota de evolucion corregida' }
    )
  }

  const archiveNote: RequestHandler = async (req, res) => {
    const params = validated<EvolutionNoteParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.archiveNote(
        authenticatedUserId(req),
        params.patientId,
        params.noteId,
        validated<NoteLifecycleInput>(req, 'body')
      ),
      { message: 'Nota de evolucion archivada' }
    )
  }

  const restoreNote: RequestHandler = async (req, res) => {
    const params = validated<EvolutionNoteParams>(req, 'params')
    return sendSuccess(
      req,
      res,
      await service.restoreNote(
        authenticatedUserId(req),
        params.patientId,
        params.noteId,
        validated<NoteLifecycleInput>(req, 'body')
      ),
      { message: 'Nota de evolucion restaurada' }
    )
  }

  const listNoteRevisions: RequestHandler = async (req, res) => {
    const params = validated<EvolutionNoteParams>(req, 'params')
    const result = await service.listNoteRevisions(
      authenticatedUserId(req),
      params.patientId,
      params.noteId,
      validated<ListRevisionsQuery>(req, 'query')
    )
    return sendSuccess(req, res, result.revisions, {
      message: 'Revisiones de la nota obtenidas',
      meta: { pagination: result.pagination },
    })
  }

  return {
    archiveNote,
    createNote,
    getMedicalHistory,
    getNote,
    listMedicalHistoryRevisions,
    listNoteRevisions,
    listNotes,
    restoreNote,
    updateMedicalHistory,
    updateNote,
  }
}

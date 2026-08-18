import { Router } from 'express'

import { noStore } from '../../platform/http/cache.middleware'
import { validateRequest } from '../../platform/http/validate.middleware'
import { authenticate } from '../identity/identity.middleware'
import { IdentityService } from '../identity/identity.service'
import { createClinicalRecordController } from './clinical-record.controller'
import { clinicalRecordErrorHandler } from './clinical-record.middleware'
import {
  createEvolutionNoteSchema,
  evolutionNoteParamsSchema,
  listEvolutionNotesQuerySchema,
  listRevisionsQuerySchema,
  noteLifecycleSchema,
  patientClinicalRecordParamsSchema,
  updateEvolutionNoteSchema,
  updateMedicalHistorySchema,
} from './clinical-record.schemas'
import {
  ClinicalRecordService,
  ClinicalRecordServiceDependencies,
} from './clinical-record.service'

export const createClinicalRecordRouter = (
  identityService: IdentityService,
  dependencies: ClinicalRecordServiceDependencies = {}
): Router => {
  const router = Router()
  const controller = createClinicalRecordController(
    new ClinicalRecordService(dependencies)
  )

  router.use('/patients/:patientId', noStore, authenticate(identityService))

  router.get(
    '/patients/:patientId/medical-history',
    validateRequest({ params: patientClinicalRecordParamsSchema }),
    controller.getMedicalHistory
  )
  router.put(
    '/patients/:patientId/medical-history',
    validateRequest({
      params: patientClinicalRecordParamsSchema,
      body: updateMedicalHistorySchema,
    }),
    controller.updateMedicalHistory
  )
  router.get(
    '/patients/:patientId/medical-history/revisions',
    validateRequest({
      params: patientClinicalRecordParamsSchema,
      query: listRevisionsQuerySchema,
    }),
    controller.listMedicalHistoryRevisions
  )
  router.get(
    '/patients/:patientId/evolution-notes',
    validateRequest({
      params: patientClinicalRecordParamsSchema,
      query: listEvolutionNotesQuerySchema,
    }),
    controller.listNotes
  )
  router.post(
    '/patients/:patientId/evolution-notes',
    validateRequest({
      params: patientClinicalRecordParamsSchema,
      body: createEvolutionNoteSchema,
    }),
    controller.createNote
  )
  router.get(
    '/patients/:patientId/evolution-notes/:noteId',
    validateRequest({ params: evolutionNoteParamsSchema }),
    controller.getNote
  )
  router.patch(
    '/patients/:patientId/evolution-notes/:noteId',
    validateRequest({
      params: evolutionNoteParamsSchema,
      body: updateEvolutionNoteSchema,
    }),
    controller.updateNote
  )
  router.delete(
    '/patients/:patientId/evolution-notes/:noteId',
    validateRequest({
      params: evolutionNoteParamsSchema,
      body: noteLifecycleSchema,
    }),
    controller.archiveNote
  )
  router.post(
    '/patients/:patientId/evolution-notes/:noteId/restore',
    validateRequest({
      params: evolutionNoteParamsSchema,
      body: noteLifecycleSchema,
    }),
    controller.restoreNote
  )
  router.get(
    '/patients/:patientId/evolution-notes/:noteId/revisions',
    validateRequest({
      params: evolutionNoteParamsSchema,
      query: listRevisionsQuerySchema,
    }),
    controller.listNoteRevisions
  )

  router.use(clinicalRecordErrorHandler)
  return router
}

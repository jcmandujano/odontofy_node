import { describe, expect, it } from 'vitest'

import {
  createEvolutionNoteSchema,
  listEvolutionNotesQuerySchema,
  updateEvolutionNoteSchema,
  updateMedicalHistorySchema,
} from '../src/modules/clinical-records/clinical-record.schemas'

describe('clinical records v1 schemas', () => {
  it('normalizes a versioned medical questionnaire and rejects duplicate answers', () => {
    const history = updateMedicalHistorySchema.parse({
      questionnaireVersion: '1.0',
      familyHistory: '',
      answers: [{ questionId: 'DIABETES', answer: 'YES', notes: 'Controlada' }],
      changeReason: 'Registro inicial',
    })
    expect(history).toMatchObject({
      familyHistory: null,
      otherNotes: null,
      answers: [{ questionId: 'DIABETES', answer: 'YES' }],
    })
    expect(
      updateMedicalHistorySchema.safeParse({
        questionnaireVersion: '1.0',
        answers: [
          { questionId: 'ASTHMA', answer: 'NO' },
          { questionId: 'ASTHMA', answer: 'YES' },
        ],
        changeReason: 'Duplicado',
      }).success
    ).toBe(false)
  })

  it('requires consistent clinical references and blocks mass assignment', () => {
    expect(
      createEvolutionNoteSchema.safeParse({
        note: 'Evolucion favorable',
        treatmentPlanItemId: 9,
      }).success
    ).toBe(false)
    expect(
      createEvolutionNoteSchema.safeParse({
        note: 'Evolucion favorable',
        authorUserId: 99,
      }).success
    ).toBe(false)
    expect(
      createEvolutionNoteSchema.safeParse({
        note: 'Evolucion favorable',
        completeTreatmentItem: true,
      }).success
    ).toBe(false)
  })

  it('requires a reason and a real clinical change for amendments', () => {
    expect(
      updateEvolutionNoteSchema.safeParse({ changeReason: 'Correccion' })
        .success
    ).toBe(false)
    expect(
      updateEvolutionNoteSchema.safeParse({
        note: 'Texto corregido',
        changeReason: 'Aclarar hallazgo',
      }).success
    ).toBe(true)
  })

  it('bounds note lists and defaults to active records', () => {
    expect(listEvolutionNotesQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      search: '',
      status: 'active',
    })
    expect(
      listEvolutionNotesQuerySchema.safeParse({ pageSize: 101 }).success
    ).toBe(false)
  })
})

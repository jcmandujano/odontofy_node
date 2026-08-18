const { idColumn, referenceColumn, tableOptions } = require('../support/schema')

const questionMap = {
  bajoTratamientoMedico: 'MEDICAL_TREATMENT',
  intervencionQuirurgica: 'PRIOR_SURGERY',
  consumeDrogas: 'SUBSTANCE_USE',
  problemasPresion: 'HYPERTENSION',
  hepatitis: 'HEPATITIS',
  vih: 'HIV',
  ets: 'STI',
  problemaCorazon: 'HEART_DISEASE',
  fiebreReumatica: 'RHEUMATIC_FEVER',
  asma: 'ASTHMA',
  diabetes: 'DIABETES',
  ulceraGastrica: 'PEPTIC_ULCER',
  tiroides: 'THYROID_DISEASE',
  alergias: 'ALLERGIES',
  epilepsia: 'EPILEPSY',
  gastritis: 'GASTRITIS',
  embarazo: 'PREGNANCY',
}

const asJson = (value) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const text = (value, max) => {
  if (value == null || value === '') return null
  const result = typeof value === 'string' ? value : JSON.stringify(value)
  return result.slice(0, max)
}

const answerValue = (value) => {
  if (value === true) return 'YES'
  if (value === false) return 'NO'
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (['si', 'sí', 'yes', 'true', '1'].includes(normalized)) return 'YES'
  if (['no', 'false', '0'].includes(normalized)) return 'NO'
  return 'UNKNOWN'
}

const normalizeFamily = (raw) => {
  const value = asJson(raw)
  if (value && typeof value === 'object' && value.schemaVersion === '1.0') {
    return { schemaVersion: '1.0', summary: text(value.summary, 10000) }
  }
  return { schemaVersion: '1.0', summary: text(value, 10000) }
}

const normalizePersonal = (raw) => {
  const value = asJson(raw)
  if (value && typeof value === 'object' && value.schemaVersion === '1.0') {
    return {
      schemaVersion: '1.0',
      answers: Array.isArray(value.answers) ? value.answers : [],
      otherNotes: text(value.otherNotes, 10000),
    }
  }

  const answers = []
  const unknown = {}
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'otros') continue
      const questionId = questionMap[key]
      if (!questionId) {
        unknown[key] = entry
        continue
      }
      const objectEntry = entry && typeof entry === 'object' ? entry : {}
      answers.push({
        questionId,
        answer: answerValue(objectEntry.respuesta ?? entry),
        notes: text(objectEntry.comentarios, 2000),
      })
    }
  }

  const other = value && typeof value === 'object' ? value.otros : null
  const otherNotes = text(
    Object.keys(unknown).length > 0
      ? { otros: other, camposLegacy: unknown }
      : other,
    10000
  )
  return { schemaVersion: '1.0', answers, otherNotes }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('evolution_notes', 'author_user_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
    await queryInterface.addColumn('evolution_notes', 'author_name', {
      type: Sequelize.STRING(350),
      allowNull: true,
    })
    await queryInterface.addColumn('evolution_notes', 'version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    })
    await queryInterface.addColumn('evolution_notes', 'occurred_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addColumn('evolution_notes', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })

    await queryInterface.sequelize.query(
      `UPDATE evolution_notes notes
       INNER JOIN patients ON patients.id = notes.patient_id
       INNER JOIN users ON users.id = patients.user_id
       SET notes.author_user_id = users.id,
           notes.author_name = TRIM(CONCAT_WS(' ', users.name, NULLIF(users.middle_name, ''), users.last_name)),
           notes.occurred_at = notes.created_at`
    )
    await queryInterface.changeColumn('evolution_notes', 'author_user_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
    await queryInterface.changeColumn('evolution_notes', 'author_name', {
      type: Sequelize.STRING(350),
      allowNull: false,
    })
    await queryInterface.changeColumn('evolution_notes', 'occurred_at', {
      type: Sequelize.DATE,
      allowNull: false,
    })
    await queryInterface.addIndex(
      'evolution_notes',
      ['patient_id', 'archived_at', 'occurred_at'],
      { name: 'idx_evolution_notes_patient_archive_occurred' }
    )

    await queryInterface.createTable(
      'medical_history_revisions',
      {
        id: idColumn(Sequelize),
        patient_id: referenceColumn(Sequelize, 'patients', 'RESTRICT'),
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        questionnaire_version: { type: Sequelize.STRING(20), allowNull: false },
        family_history: { type: Sequelize.JSON, allowNull: false },
        personal_history: { type: Sequelize.JSON, allowNull: false },
        author_user_id: referenceColumn(Sequelize, 'users', 'RESTRICT'),
        author_name: { type: Sequelize.STRING(350), allowNull: false },
        change_reason: { type: Sequelize.STRING(500), allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      tableOptions
    )
    await queryInterface.addIndex(
      'medical_history_revisions',
      ['patient_id', 'version'],
      { name: 'uq_medical_history_patient_version', unique: true }
    )

    const [patients] = await queryInterface.sequelize.query(
      `SELECT patients.id, patients.user_id, patients.family_medical_history,
              patients.personal_medical_history, patients.created_at,
              TRIM(CONCAT_WS(' ', users.name, NULLIF(users.middle_name, ''), users.last_name)) AS author_name
       FROM patients
       INNER JOIN users ON users.id = patients.user_id`
    )
    for (const patient of patients) {
      const family = normalizeFamily(patient.family_medical_history)
      const personal = normalizePersonal(patient.personal_medical_history)
      await queryInterface.bulkUpdate(
        'patients',
        {
          family_medical_history: JSON.stringify(family),
          personal_medical_history: JSON.stringify(personal),
        },
        { id: patient.id }
      )
      await queryInterface.bulkInsert('medical_history_revisions', [
        {
          patient_id: patient.id,
          version: 1,
          questionnaire_version: '1.0',
          family_history: JSON.stringify(family),
          personal_history: JSON.stringify(personal),
          author_user_id: patient.user_id,
          author_name: patient.author_name,
          change_reason: 'Migracion inicial del historial legacy',
          created_at: patient.created_at,
        },
      ])
    }

    await queryInterface.createTable(
      'evolution_note_revisions',
      {
        id: idColumn(Sequelize),
        evolution_note_id: referenceColumn(
          Sequelize,
          'evolution_notes',
          'RESTRICT'
        ),
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        author_user_id: referenceColumn(Sequelize, 'users', 'RESTRICT'),
        author_name: { type: Sequelize.STRING(350), allowNull: false },
        action: {
          type: Sequelize.ENUM('CREATED', 'AMENDED', 'ARCHIVED', 'RESTORED'),
          allowNull: false,
        },
        note: { type: Sequelize.TEXT, allowNull: false },
        treatment_plan_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        treatment_plan_item_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        occurred_at: { type: Sequelize.DATE, allowNull: false },
        archived_at: { type: Sequelize.DATE, allowNull: true },
        change_reason: { type: Sequelize.STRING(500), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      tableOptions
    )
    await queryInterface.addIndex(
      'evolution_note_revisions',
      ['evolution_note_id', 'version'],
      { name: 'uq_evolution_note_revision_version', unique: true }
    )
    await queryInterface.addIndex(
      'evolution_note_revisions',
      ['author_user_id', 'created_at'],
      { name: 'idx_evolution_note_revision_author' }
    )
    await queryInterface.sequelize.query(
      `INSERT INTO evolution_note_revisions
       (evolution_note_id, version, author_user_id, author_name, action, note,
        treatment_plan_id, treatment_plan_item_id, occurred_at, archived_at,
        change_reason, created_at)
       SELECT id, 1, author_user_id, author_name, 'CREATED', note,
              treatment_plan_id, treatment_plan_item_id, occurred_at, NULL,
              'Migracion inicial de la nota legacy', created_at
       FROM evolution_notes`
    )
  },

  async down(queryInterface) {
    await queryInterface.dropTable('evolution_note_revisions')
    await queryInterface.dropTable('medical_history_revisions')
    await queryInterface.removeIndex(
      'evolution_notes',
      'idx_evolution_notes_patient_archive_occurred'
    )
    await queryInterface.removeColumn('evolution_notes', 'archived_at')
    await queryInterface.removeColumn('evolution_notes', 'occurred_at')
    await queryInterface.removeColumn('evolution_notes', 'version')
    await queryInterface.removeColumn('evolution_notes', 'author_name')
    await queryInterface.removeColumn('evolution_notes', 'author_user_id')
  },
}

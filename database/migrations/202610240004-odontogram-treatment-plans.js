const { nullableReferenceColumn } = require('../support/schema')

module.exports = {
  async up(q, S) {
    await q.addColumn(
      'treatment_plans',
      'source_odontogram_id',
      nullableReferenceColumn(S, 'odontograms')
    )
    await q.addColumn('treatment_plans', 'odontogram_creation_key', {
      type: S.STRING(36),
      allowNull: true,
    })
    await q.addColumn('treatment_plans', 'odontogram_creation_hash', {
      type: S.STRING(64),
      allowNull: true,
    })
    await q.addIndex('treatment_plans', ['odontogram_creation_key'], {
      unique: true,
      name: 'uq_odontogram_plan_creation',
    })
  },
  async down(q) {
    const [rows] = await q.sequelize.query(
      'SELECT COUNT(*) AS total FROM treatment_plans WHERE odontogram_creation_key IS NOT NULL OR source_odontogram_id IS NOT NULL'
    )
    if (Number(rows[0].total))
      throw new Error(
        'Cannot rollback while odontogram-generated plans exist; origin and idempotency history were not deleted.'
      )
    await q.removeIndex('treatment_plans', 'uq_odontogram_plan_creation')
    await q.removeColumn('treatment_plans', 'odontogram_creation_hash')
    await q.removeColumn('treatment_plans', 'odontogram_creation_key')
    await q.removeColumn('treatment_plans', 'source_odontogram_id')
  },
}

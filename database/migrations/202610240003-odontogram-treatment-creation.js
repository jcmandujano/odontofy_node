module.exports = {
  async up(q, S) {
    await q.addColumn('treatment_plan_items', 'odontogram_creation_key', {
      type: S.STRING(36),
      allowNull: true,
    })
    await q.addColumn('treatment_plan_items', 'odontogram_creation_hash', {
      type: S.STRING(64),
      allowNull: true,
    })
    await q.addIndex('treatment_plan_items', ['odontogram_creation_key'], {
      unique: true,
      name: 'uq_odontogram_treatment_creation',
    })
  },
  async down(q) {
    const [rows] = await q.sequelize.query(
      'SELECT COUNT(*) AS total FROM treatment_plan_items WHERE odontogram_creation_key IS NOT NULL'
    )
    if (Number(rows[0].total))
      throw new Error(
        'Cannot rollback while odontogram-created treatments exist; idempotency history was not deleted.'
      )
    await q.removeIndex(
      'treatment_plan_items',
      'uq_odontogram_treatment_creation'
    )
    await q.removeColumn('treatment_plan_items', 'odontogram_creation_hash')
    await q.removeColumn('treatment_plan_items', 'odontogram_creation_key')
  },
}

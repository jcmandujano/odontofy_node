const {
  idColumn,
  referenceColumn,
  nullableReferenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema')

module.exports = {
  async up(q, S) {
    await q.addColumn(
      'payments',
      'advance_treatment_id',
      nullableReferenceColumn(S, 'treatment_plan_items', 'RESTRICT')
    )
    await q.addColumn('payments', 'advance_treatment_name', {
      type: S.STRING(255),
      allowNull: true,
    })
    await q.createTable(
      'credit_applications',
      {
        id: idColumn(S),
        payment_id: referenceColumn(S, 'payments'),
        user_id: referenceColumn(S, 'users'),
        idempotency_key: { type: S.STRING(36), allowNull: false },
        request_hash: { type: S.STRING(64), allowNull: false },
        occurred_on: { type: S.DATEONLY, allowNull: false },
        snapshot: { type: S.JSON, allowNull: false },
        ...timestampColumns(S),
      },
      tableOptions
    )
    await q.addIndex('credit_applications', ['user_id', 'idempotency_key'], {
      unique: true,
      name: 'uq_credit_application_key',
    })
  },
  async down(q) {
    const [payments] = await q.sequelize.query(
      'SELECT COUNT(*) AS total FROM payments WHERE advance_treatment_id IS NOT NULL'
    )
    const [applications] = await q.sequelize.query(
      'SELECT COUNT(*) AS total FROM credit_applications'
    )
    if (Number(payments[0].total) || Number(applications[0].total))
      throw new Error(
        'Cannot rollback while advances or credit applications exist; financial history was not deleted.'
      )
    await q.dropTable('credit_applications')
    await q.removeColumn('payments', 'advance_treatment_name')
    await q.removeColumn('payments', 'advance_treatment_id')
  },
}

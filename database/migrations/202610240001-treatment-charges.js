const {
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
  addCheck,
} = require('../support/schema')

module.exports = {
  async up(q, S) {
    await q.addColumn('treatment_plan_items', 'charge_discount_amount', {
      type: S.DECIMAL(12, 2),
      allowNull: true,
    })
    await q.addColumn('payments', 'record_kind', {
      type: S.ENUM('LEGACY', 'TREATMENT_PAYMENT'),
      allowNull: false,
      defaultValue: 'LEGACY',
    })
    await q.createTable(
      'treatment_charges',
      {
        id: idColumn(S),
        patient_id: referenceColumn(S, 'patients'),
        treatment_id: referenceColumn(S, 'treatment_plan_items'),
        confirmed_by_user_id: referenceColumn(S, 'users'),
        occurred_on: { type: S.DATEONLY, allowNull: false },
        description: { type: S.STRING(255), allowNull: false },
        subtotal_amount: { type: S.DECIMAL(12, 2), allowNull: false },
        discount_amount: { type: S.DECIMAL(12, 2), allowNull: false },
        total_amount: { type: S.DECIMAL(12, 2), allowNull: false },
        ...timestampColumns(S),
      },
      tableOptions
    )
    await q.addIndex('treatment_charges', ['treatment_id'], {
      unique: true,
      name: 'uq_treatment_charge',
    })
    await q.addIndex('treatment_charges', ['patient_id', 'occurred_on'], {
      name: 'idx_charges_patient_date',
    })
    await addCheck(
      q,
      'treatment_charges',
      'chk_charge_total',
      '`subtotal_amount` >= 0 AND `discount_amount` >= 0 AND `discount_amount` <= `subtotal_amount` AND `total_amount` = `subtotal_amount` - `discount_amount`'
    )
    await q.createTable(
      'payment_allocations',
      {
        id: idColumn(S),
        payment_id: referenceColumn(S, 'payments'),
        charge_id: referenceColumn(S, 'treatment_charges'),
        amount: { type: S.DECIMAL(12, 2), allowNull: false },
        ...timestampColumns(S),
      },
      tableOptions
    )
    await q.addIndex('payment_allocations', ['payment_id', 'charge_id'], {
      unique: true,
      name: 'uq_payment_charge_allocation',
    })
    await addCheck(
      q,
      'payment_allocations',
      'chk_allocation_positive',
      '`amount` > 0'
    )
  },
  async down(q) {
    const [rows] = await q.sequelize.query(
      'SELECT COUNT(*) AS total FROM treatment_charges'
    )
    const [payments] = await q.sequelize.query(
      "SELECT COUNT(*) AS total FROM payments WHERE record_kind = 'TREATMENT_PAYMENT'"
    )
    if (Number(rows[0].total) || Number(payments[0].total))
      throw new Error(
        'Cannot rollback while treatment charges or payments exist; financial records were not deleted.'
      )
    await q.dropTable('payment_allocations')
    await q.dropTable('treatment_charges')
    await q.removeColumn('payments', 'record_kind')
    await q.removeColumn('treatment_plan_items', 'charge_discount_amount')
  },
}

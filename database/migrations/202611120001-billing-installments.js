const { nullableReferenceColumn } = require('../support/schema')

module.exports = {
  async up(q, S) {
    await q.addColumn('payments', 'source_billing_record_id', nullableReferenceColumn(S, 'payments', 'RESTRICT'))
    await q.addIndex('payments', ['source_billing_record_id', 'status'], { name: 'idx_payment_source_status' })
  },
  async down(q) {
    const [rows] = await q.sequelize.query('SELECT COUNT(*) AS total FROM payments WHERE source_billing_record_id IS NOT NULL')
    if (Number(rows[0].total)) throw new Error('Cannot rollback while billing installments exist; financial references must be preserved.')
    await q.removeColumn('payments', 'source_billing_record_id')
    const indexes = await q.showIndex('payments')
    if (indexes.some((index) => index.name === 'idx_payment_source_status')) {
      await q.removeIndex('payments', 'idx_payment_source_status')
    }
  },
}

import { createRequire } from 'node:module'
import Sequelize from 'sequelize'
import { describe, expect, it } from 'vitest'
import db from '../../src/db/connection'

const migration = createRequire(import.meta.url)('../../database/migrations/202611120001-billing-installments.js')

describe('billing installments migration', () => {
  it('reverts the foreign key and its index, then applies the migration again', async () => {
    const q = db.getQueryInterface()
    await migration.down(q)
    const withoutColumn = await q.describeTable('payments')
    expect(withoutColumn.source_billing_record_id).toBeUndefined()
    expect((await q.showIndex('payments')).some(index => index.name === 'idx_payment_source_status')).toBe(false)
    await migration.up(q, Sequelize)
    const restored = await q.describeTable('payments')
    expect(restored.source_billing_record_id).toBeDefined()
    expect((await q.showIndex('payments')).some(index => index.name === 'idx_payment_source_status')).toBe(true)
  })
})

import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Sequelize, { QueryTypes } from 'sequelize'
import { describe, it, expect } from 'vitest'
import db from '../../src/db/connection'

const migration = createRequire(import.meta.url)('../../database/migrations/202610240001-treatment-charges.js')
describe('charge migration compatibility', () => {
  it('preserves legacy payments and balances and rejects loss of confirmed charges', async () => {
    const email = `charge-migration-${randomUUID()}@example.test`
    await db.query("INSERT INTO users (name, last_name, email, password_hash, status, created_at, updated_at) VALUES ('Synthetic', 'Charge migration', :email, 'unused', 1, NOW(), NOW())", { replacements: { email } })
    const [owner] = await db.query<{ id: number }>('SELECT id FROM users WHERE email=:email', { type: QueryTypes.SELECT, replacements: { email } })
    const q = db.getQueryInterface()
    try {
      await db.query("INSERT INTO patients (user_id, name, last_name, status, current_balance, created_at, updated_at) VALUES (:owner, 'Synthetic', 'Migration', 1, 30, NOW(), NOW())", { replacements: { owner: owner.id } })
      const [patient] = await db.query<{ id: number }>('SELECT id FROM patients WHERE user_id=:owner', { type: QueryTypes.SELECT, replacements: { owner: owner.id } })
      const values = { owner: owner.id, patient: patient.id }
      await db.query("INSERT INTO payments (user_id, patient_id, author_user_id, author_name, payment_date, subtotal_amount, discount_amount, total_amount, amount_received, balance_after, payment_method, created_at, updated_at) VALUES (:owner, :patient, :owner, 'Synthetic', '2026-10-24', 50, 0, 50, 20, 30, 'CASH', NOW(), NOW())", { replacements: values })
      await migration.down(q)
      await migration.up(q, Sequelize)
      const [payment] = await db.query<{ record_kind: string; total_amount: string; amount_received: string; balance_after: string }>('SELECT record_kind, total_amount, amount_received, balance_after FROM payments WHERE patient_id=:patient', { type: QueryTypes.SELECT, replacements: values })
      expect(payment).toEqual({ record_kind: 'LEGACY', total_amount: '50.00', amount_received: '20.00', balance_after: '30.00' })
      const [balance] = await db.query<{ current_balance: string }>('SELECT current_balance FROM patients WHERE id=:patient', { type: QueryTypes.SELECT, replacements: values })
      expect(balance.current_balance).toBe('30.00')
      await db.query("INSERT INTO treatment_plan_items (patient_id, name, quantity, unit_price_amount, subtotal_amount, status, created_at, updated_at) VALUES (:patient, 'Synthetic', 1, 10, 10, 'PENDING', NOW(), NOW())", { replacements: values })
      const [item] = await db.query<{ id: number }>('SELECT id FROM treatment_plan_items WHERE patient_id=:patient', { type: QueryTypes.SELECT, replacements: values })
      await db.query("INSERT INTO treatment_charges (patient_id, treatment_id, confirmed_by_user_id, occurred_on, description, subtotal_amount, discount_amount, total_amount, created_at, updated_at) VALUES (:patient, :item, :owner, '2026-10-24', 'Synthetic', 10, 0, 10, NOW(), NOW())", { replacements: { ...values, item: item.id } })
      await expect(migration.down(q)).rejects.toThrow('Cannot rollback')
    } finally {
      await db.query('DELETE FROM users WHERE id=:owner', { replacements: { owner: owner.id } })
    }
  })
})

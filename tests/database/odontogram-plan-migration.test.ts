import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Sequelize, { QueryTypes } from 'sequelize'
import { describe, it, expect } from 'vitest'
import db from '../../src/db/connection'
const migration = createRequire(import.meta.url)(
  '../../database/migrations/202610240004-odontogram-treatment-plans.js'
)
describe('odontogram plan migration', () => {
  it('preserves old quotations and refuses to remove new plan origin/idempotency', async () => {
    const email = `odontogram-plan-migration-${randomUUID()}@example.test`
    await db.query(
      "INSERT INTO users (name, last_name, email, password_hash, status, created_at, updated_at) VALUES ('Synthetic', 'Plan migration', :email, 'unused', 1, NOW(), NOW())",
      { replacements: { email } }
    )
    const [owner] = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE email=:email',
      { type: QueryTypes.SELECT, replacements: { email } }
    )
    try {
      await db.query(
        "INSERT INTO patients (user_id, name, last_name, status, current_balance, created_at, updated_at) VALUES (:owner, 'Synthetic', 'Migration', 1, 0, NOW(), NOW())",
        { replacements: { owner: owner.id } }
      )
      const [patient] = await db.query<{ id: number }>(
        'SELECT id FROM patients WHERE user_id=:owner',
        { type: QueryTypes.SELECT, replacements: { owner: owner.id } }
      )
      await db.query(
        "INSERT INTO treatment_plans (user_id, patient_id, title, status, subtotal_amount, discount_amount, total_amount, created_at, updated_at) VALUES (:owner, :patient, 'Historical quotation', 'DRAFT', 100, 10, 90, NOW(), NOW())",
        { replacements: { owner: owner.id, patient: patient.id } }
      )
      const q = db.getQueryInterface()
      await migration.down(q)
      await migration.up(q, Sequelize)
      const [plan] = await db.query<{
        id: number
        source_odontogram_id: number | null
        total_amount: string
        discount_amount: string
      }>(
        'SELECT id, source_odontogram_id, total_amount, discount_amount FROM treatment_plans WHERE patient_id=:patient',
        { type: QueryTypes.SELECT, replacements: { patient: patient.id } }
      )
      expect(plan).toMatchObject({
        source_odontogram_id: null,
        total_amount: '90.00',
        discount_amount: '10.00',
      })
      await db.query(
        'UPDATE treatment_plans SET odontogram_creation_key=:key, odontogram_creation_hash=:hash WHERE id=:id',
        {
          replacements: {
            id: plan.id,
            key: randomUUID(),
            hash: 'a'.repeat(64),
          },
        }
      )
      await expect(migration.down(q)).rejects.toThrow('Cannot rollback')
    } finally {
      await db.query('DELETE FROM users WHERE id=:owner', {
        replacements: { owner: owner.id },
      })
    }
  })
})

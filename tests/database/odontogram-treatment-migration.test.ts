import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Sequelize, { QueryTypes } from 'sequelize'
import { describe, it, expect } from 'vitest'
import db from '../../src/db/connection'

const migration = createRequire(import.meta.url)(
  '../../database/migrations/202610240003-odontogram-treatment-creation.js'
)
describe('odontogram treatment creation migration', () => {
  it('preserves historical treatments and refuses to erase creation idempotency', async () => {
    const email = `odontogram-migration-${randomUUID()}@example.test`
    await db.query(
      "INSERT INTO users (name, last_name, email, password_hash, status, created_at, updated_at) VALUES ('Synthetic', 'Migration', :email, 'unused', 1, NOW(), NOW())",
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
        "INSERT INTO treatment_plan_items (patient_id, name, quantity, unit_price_amount, subtotal_amount, status, created_at, updated_at) VALUES (:patient, 'Historical', 1, 25.50, 25.50, 'PENDING', NOW(), NOW())",
        { replacements: { patient: patient.id } }
      )
      const q = db.getQueryInterface()
      await migration.down(q)
      await migration.up(q, Sequelize)
      const [item] = await db.query<{
        id: number
        name: string
        subtotal_amount: string
        odontogram_creation_key: string | null
      }>(
        'SELECT id, name, subtotal_amount, odontogram_creation_key FROM treatment_plan_items WHERE patient_id=:patient',
        { type: QueryTypes.SELECT, replacements: { patient: patient.id } }
      )
      expect(item).toMatchObject({
        name: 'Historical',
        subtotal_amount: '25.50',
        odontogram_creation_key: null,
      })
      await db.query(
        'UPDATE treatment_plan_items SET odontogram_creation_key=:key, odontogram_creation_hash=:hash WHERE id=:id',
        {
          replacements: {
            id: item.id,
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

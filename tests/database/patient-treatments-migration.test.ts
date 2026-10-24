import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import Sequelize from 'sequelize';
import { describe, expect, it } from 'vitest';
import db from '../../src/db/connection';

const migration = createRequire(import.meta.url)('../../database/migrations/202610130001-patient-treatments.js');

describe('patient treatment migration compatibility', () => {
  it('backfills legacy items without changing snapshots and refuses lossy rollback', async () => {
    const queryInterface = db.getQueryInterface();
    const email = `migration-${randomUUID()}@example.test`;
    await db.query("INSERT INTO users (name, last_name, email, password_hash, status, created_at, updated_at) VALUES ('Synthetic', 'Migration', :email, 'unused', 1, NOW(), NOW())", { replacements: { email } });
    const [owner] = await db.query<{ id: number }>('SELECT id FROM users WHERE email = :email', { type: QueryTypes.SELECT, replacements: { email } });
    try {
      await db.query("INSERT INTO patients (user_id, name, last_name, status, current_balance, created_at, updated_at) VALUES (:owner, 'Synthetic', 'Migration', 1, 0, NOW(), NOW())", { replacements: { owner: owner.id } });
      const [patient] = await db.query<{ id: number }>('SELECT id FROM patients WHERE user_id = :owner', { type: QueryTypes.SELECT, replacements: { owner: owner.id } });
      await db.query("INSERT INTO treatment_plans (user_id, patient_id, title, status, created_at, updated_at) VALUES (:owner, :patient, 'Legacy', 'DRAFT', NOW(), NOW())", { replacements: { owner: owner.id, patient: patient.id } });
      const [plan] = await db.query<{ id: number }>('SELECT id FROM treatment_plans WHERE patient_id = :patient', { type: QueryTypes.SELECT, replacements: { patient: patient.id } });
      await db.query("INSERT INTO treatment_plan_items (patient_id, treatment_plan_id, name, quantity, unit_price_amount, subtotal_amount, status, created_at, updated_at) VALUES (:patient, :plan, 'Legacy manual', 2, 123.45, 246.90, 'PENDING', NOW(), NOW())", { replacements: { patient: patient.id, plan: plan.id } });
      await migration.down(queryInterface);
      await migration.up(queryInterface, Sequelize);
      const [item] = await db.query<{ patient_id: number; name: string; unit_price_amount: string; user_concept_id: number | null }>('SELECT patient_id, name, unit_price_amount, user_concept_id FROM treatment_plan_items WHERE treatment_plan_id = :plan', { type: QueryTypes.SELECT, replacements: { plan: plan.id } });
      expect(item).toMatchObject({ patient_id: patient.id, name: 'Legacy manual', unit_price_amount: '123.45', user_concept_id: null });
      await db.query("INSERT INTO treatment_plan_items (patient_id, treatment_plan_id, name, quantity, unit_price_amount, subtotal_amount, status, created_at, updated_at) VALUES (:patient, NULL, 'Independent', 1, 0, 0, 'PENDING', NOW(), NOW())", { replacements: { patient: patient.id } });
      await expect(migration.down(queryInterface)).rejects.toThrow('Cannot rollback');
    } finally {
      await db.query('DELETE FROM users WHERE id = :owner', { replacements: { owner: owner.id } });
    }
  });
});

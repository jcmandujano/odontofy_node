import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import db from '../../src/db/connection';
import Appointment from '../../src/models/appointment.model';
import AuthSession from '../../src/models/auth-session.model';
import Concept from '../../src/models/concept.model';
import EvolutionNote from '../../src/models/evolution-note.model';
import InformedConsent from '../../src/models/informed-consent.model';
import OAuthState from '../../src/models/oauth-state.model';
import PasswordReset from '../../src/models/password-reset.model';
import Patient from '../../src/models/patient.model';
import PaymentUser from '../../src/models/payment-user.model';
import Payment from '../../src/models/payment.model';
import SignedConsent from '../../src/models/signed-consent.model';
import Token from '../../src/models/token.model';
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model';
import TreatmentPlan from '../../src/models/treatment-plan.model';
import UserInformedConsent from '../../src/models/user-informed-consent.model';
import UserConcept from '../../src/models/user_concept.model';
import User from '../../src/models/user.model';
import { createTreatmentPlan } from '../../src/services/treatment-plan.service';

const expectedTables = [
  'account_verification_tokens',
  'appointments',
  'auth_sessions',
  'concepts',
  'evolution_notes',
  'informed_consents',
  'oauth_states',
  'password_resets',
  'patients',
  'payment_items',
  'payments',
  'signed_consents',
  'treatment_plan_items',
  'treatment_plans',
  'user_concepts',
  'user_informed_consents',
  'users',
];

let owner: User;
let patient: Patient;

const patientAttributes = (userId: number) => ({
  user_id: userId,
  name: 'Paciente',
  middle_name: 'Sintetico',
  last_name: 'F2',
  gender: 'No especificado',
  date_of_birth: new Date('1990-01-01T00:00:00.000Z'),
  phone: '0000000000',
  marital_status: 'No especificado',
  occupation: 'Pruebas',
  address: 'Direccion sintetica',
  emergency_contact_name: 'Contacto sintetico',
  emergency_contact_phone: '0000000000',
  emergency_contact_relationship: 'Pruebas',
  reason_for_consultation: 'Validacion de migraciones',
  rfc: 'XAXX010101000',
  family_medical_history: {},
  personal_medical_history: {},
  email: `patient-${randomUUID()}@example.test`,
  status: true,
  debt: 0,
});

beforeAll(async () => {
  await db.authenticate();
  owner = await User.create({
    name: 'Doctora',
    middle_name: 'Sintetica',
    last_name: 'F2',
    date_of_birth: new Date('1985-01-01T00:00:00.000Z'),
    phone: '0000000000',
    avatar: '',
    email: `doctor-${randomUUID()}@example.test`,
    password: 'not-a-real-password-hash',
    status: true,
  });
  patient = await Patient.create(patientAttributes(owner.id));
});

afterAll(async () => {
  if (owner) await owner.destroy();
  await db.close();
});

describe('reproducible database schema', () => {
  it('contains every application table created by migrations', async () => {
    const tables = (await db.getQueryInterface().showAllTables()).map(String);

    expect(tables).toEqual(expect.arrayContaining(expectedTables));
  });

  it('contains only synthetic reference catalogs', async () => {
    expect(await Concept.count()).toBe(3);
    expect(await InformedConsent.count()).toBe(2);
  });

  it('maps legacy attributes to normalized physical columns', async () => {
    const userColumns = await db.getQueryInterface().describeTable('users');
    const paymentColumns = await db.getQueryInterface().describeTable('payments');

    expect(userColumns).toHaveProperty('password_hash');
    expect(userColumns).not.toHaveProperty('password');
    expect(User.getAttributes().createdAt.field).toBe('created_at');
    expect(owner.toJSON()).toHaveProperty('createdAt');
    expect(owner.toJSON()).not.toHaveProperty('created_at');
    expect(paymentColumns).toHaveProperty('patient_id');
    expect(paymentColumns).toHaveProperty('amount_received');
    expect(paymentColumns).not.toHaveProperty('patientId');

    const payment = await Payment.create({
      user_id: owner.id,
      patientId: patient.id,
      payment_date: '2026-08-14',
      income: 400,
      debt: 100,
      total: 500,
      discount: 50,
    });
    const [storedPayment] = await db.query<{
      patient_id: number;
      amount_received: string;
    }>(
      'SELECT patient_id, amount_received FROM payments WHERE id = :id',
      {
        replacements: { id: payment.id },
        type: QueryTypes.SELECT,
      }
    );

    expect(storedPayment.patient_id).toBe(patient.id);
    expect(Number(storedPayment.amount_received)).toBe(400);
  });

  it('maps every legacy model to its normalized table', () => {
    const mappings = [
      [Appointment.getTableName(), 'appointments'],
      [AuthSession.getTableName(), 'auth_sessions'],
      [Concept.getTableName(), 'concepts'],
      [EvolutionNote.getTableName(), 'evolution_notes'],
      [InformedConsent.getTableName(), 'informed_consents'],
      [OAuthState.getTableName(), 'oauth_states'],
      [PasswordReset.getTableName(), 'password_resets'],
      [Patient.getTableName(), 'patients'],
      [Payment.getTableName(), 'payments'],
      [PaymentUser.getTableName(), 'payment_items'],
      [SignedConsent.getTableName(), 'signed_consents'],
      [Token.getTableName(), 'account_verification_tokens'],
      [TreatmentPlan.getTableName(), 'treatment_plans'],
      [TreatmentPlanItem.getTableName(), 'treatment_plan_items'],
      [User.getTableName(), 'users'],
      [UserConcept.getTableName(), 'user_concepts'],
      [UserInformedConsent.getTableName(), 'user_informed_consents'],
    ];

    for (const [actual, expected] of mappings) {
      expect(actual).toBe(expected);
    }
  });

  it('executes representative legacy associations against renamed columns', async () => {
    await Appointment.create({
      user_id: owner.id,
      patient_id: patient.id,
      appointment_datetime: new Date('2026-08-15T15:00:00.000Z'),
      appointment_end_datetime: new Date('2026-08-15T16:00:00.000Z'),
      status: 'pendiente',
      reason: 'Prueba de mapping',
      note: null,
      google_event_id: null,
      source: 'local',
    });

    const patients = await Patient.findAll({
      where: { id: patient.id },
      include: [{ model: Appointment, required: true }],
    });

    expect(patients).toHaveLength(1);
  });

  it('rejects orphan rows through foreign keys', async () => {
    await expect(
      db.query(
        "INSERT INTO patients (user_id, name, last_name, status, current_balance, created_at, updated_at) VALUES (4294967294, 'Orphan', 'Patient', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
    ).rejects.toThrow();
  });

  it("rejects another user's patient through the legacy ownership guard", async () => {
    const otherOwner = await User.create({
      name: 'Otro',
      middle_name: '',
      last_name: 'Usuario',
      date_of_birth: new Date('1985-01-01T00:00:00.000Z'),
      phone: '',
      avatar: '',
      email: `other-${randomUUID()}@example.test`,
      password: 'not-a-real-password-hash',
      status: true,
    });

    await expect(
      createTreatmentPlan(otherOwner.id, patient.id, { title: 'Acceso cruzado' })
    ).rejects.toMatchObject({ statusCode: 404 });

    await otherOwner.destroy();
  });

  it('rejects invalid financial values through named checks', async () => {
    await expect(
      Payment.create({
        user_id: owner.id,
        patientId: patient.id,
        payment_date: '2026-08-14',
        income: -1,
        debt: 0,
        total: 0,
        discount: 0,
      })
    ).rejects.toThrow();
  });

  it('cascades owned records when a user is removed', async () => {
    const temporaryOwner = await User.create({
      name: 'Temporal',
      middle_name: '',
      last_name: 'F2',
      date_of_birth: new Date('1985-01-01T00:00:00.000Z'),
      phone: '',
      avatar: '',
      email: `temporary-${randomUUID()}@example.test`,
      password: 'not-a-real-password-hash',
      status: true,
    });
    const temporaryPatient = await Patient.create(patientAttributes(temporaryOwner.id));

    await temporaryOwner.destroy();

    expect(await Patient.count({ where: { id: temporaryPatient.id } })).toBe(0);
  });
});

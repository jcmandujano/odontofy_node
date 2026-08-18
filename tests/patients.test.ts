import { describe, expect, it } from 'vitest';

import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from '../src/modules/patients/patient.schemas';

describe('patient v1 schemas', () => {
  it('normalizes optional fields and rejects internal properties', () => {
    const patient = createPatientSchema.parse({
      name: '  Ada ',
      lastName: ' Lovelace ',
      middleName: '',
      email: ' ADA@EXAMPLE.TEST ',
      rfc: 'goca800101aa1',
    });

    expect(patient).toMatchObject({
      name: 'Ada',
      lastName: 'Lovelace',
      middleName: null,
      email: 'ada@example.test',
      rfc: 'GOCA800101AA1',
    });
    expect(
      createPatientSchema.safeParse({
        name: 'Ada',
        lastName: 'Lovelace',
        userId: 99,
      }).success
    ).toBe(false);
  });

  it('rejects empty patches, mass assignment, and future dates', () => {
    expect(updatePatientSchema.safeParse({}).success).toBe(false);
    expect(updatePatientSchema.safeParse({ currentBalance: '0.00' }).success).toBe(
      false
    );
    expect(updatePatientSchema.safeParse({ userId: 1 }).success).toBe(false);
    expect(
      updatePatientSchema.safeParse({ dateOfBirth: '2999-01-01' }).success
    ).toBe(false);
  });

  it('bounds pagination, search, and medical history size', () => {
    expect(listPatientsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      search: '',
      status: 'active',
    });
    expect(
      listPatientsQuerySchema.safeParse({ pageSize: '101' }).success
    ).toBe(false);
    expect(
      listPatientsQuerySchema.safeParse({ search: 'a'.repeat(101) }).success
    ).toBe(false);
    expect(
      createPatientSchema.safeParse({
        name: 'Ada',
        lastName: 'Lovelace',
        familyMedicalHistory: { note: 'a'.repeat(65 * 1024) },
      }).success
    ).toBe(false);
  });
});

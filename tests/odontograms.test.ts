import { describe, expect, it } from 'vitest';

import {
  createOdontogramSchema,
  listOdontogramsQuerySchema,
  updateOdontogramSchema,
} from '../src/modules/odontograms/odontogram.schemas';
import { OdontogramService } from '../src/modules/odontograms/odontogram.service';
import type { OdontogramRepository } from '../src/modules/odontograms/odontogram.repository';
import type { OdontogramDetailData } from '../src/modules/odontograms/odontogram.types';

const now = new Date('2026-09-25T12:00:00.000Z');
const adult: OdontogramDetailData = {
  id: 7,
  patientId: 4,
  dentition: 'ADULT',
  title: 'Revision inicial',
  author: { userId: 1, name: 'Doctora Ejemplo' },
  occurredAt: now,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  findings: [],
};

const repository: OdontogramRepository = {
  list: async () => ({ odontograms: [adult, { ...adult, id: 8 }], total: 2 }),
  findById: async () => adult,
  create: async () => adult,
  update: async () => adult,
  setArchived: async () => adult,
};

describe('odontogram v1 schemas', () => {
  it('accepts adult and pediatric FDI teeth with structured findings', () => {
    const adultChart = createOdontogramSchema.parse({
      dentition: 'ADULT',
      title: ' Revision inicial ',
      findings: [
        {
          toothCode: '16',
          condition: 'CARIES',
          surface: 'OCCLUSAL_INCISAL',
          notes: '',
        },
      ],
    });
    const pediatricChart = createOdontogramSchema.parse({
      dentition: 'PEDIATRIC',
      findings: [{ toothCode: '55', condition: 'NOT_ERUPTED' }],
    });

    expect(adultChart).toMatchObject({
      title: 'Revision inicial',
      findings: [{ toothCode: '16', notes: null }],
    });
    expect(pediatricChart.findings[0].toothCode).toBe('55');
  });

  it('rejects teeth from another dentition, duplicates, and mass assignment', () => {
    expect(
      createOdontogramSchema.safeParse({
        dentition: 'ADULT',
        findings: [{ toothCode: '55', condition: 'CARIES' }],
      }).success
    ).toBe(false);
    expect(
      createOdontogramSchema.safeParse({
        dentition: 'ADULT',
        findings: [
          { toothCode: '16', condition: 'CARIES', surface: 'MESIAL' },
          { toothCode: '16', condition: 'CARIES', surface: 'MESIAL' },
        ],
      }).success
    ).toBe(false);
    expect(
      createOdontogramSchema.safeParse({
        dentition: 'ADULT',
        userId: 99,
      }).success
    ).toBe(false);
    expect(
      createOdontogramSchema.safeParse({
        dentition: 'ADULT',
        findings: [
          { toothCode: '16', condition: 'HEALTHY' },
          { toothCode: '16', condition: 'CARIES' },
        ],
      }).success
    ).toBe(false);
    expect(
      createOdontogramSchema.safeParse({
        dentition: 'ADULT',
        findings: [
          { toothCode: '16', condition: 'MISSING', surface: 'MESIAL' },
        ],
      }).success
    ).toBe(false);
  });

  it('bounds lists and requires a real update', () => {
    expect(listOdontogramsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      dentition: 'all',
      status: 'active',
    });
    expect(
      listOdontogramsQuerySchema.safeParse({ pageSize: 101 }).success
    ).toBe(false);
    expect(updateOdontogramSchema.safeParse({}).success).toBe(false);
  });
});

describe('odontogram v1 service', () => {
  it('returns multiple odontograms with pagination', async () => {
    const result = await new OdontogramService({ repository }).list(1, 4, {
      page: 1,
      pageSize: 20,
      dentition: 'all',
      status: 'active',
    });

    expect(result.odontograms).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('rejects a pediatric tooth when replacing an adult chart', async () => {
    await expect(
      new OdontogramService({ repository }).update(1, adult.id, {
        findings: [
          {
            toothCode: '55',
            condition: 'CARIES',
            surface: null,
            notes: null,
          },
        ],
      })
    ).rejects.toMatchObject({ code: 'INVALID_TOOTH_CODE' });
  });
});

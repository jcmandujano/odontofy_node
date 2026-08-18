import { describe, expect, it } from 'vitest';

import {
  decimalToUnits,
  multiplyMoney,
  subtractMoney,
  sumMoney,
} from '../src/modules/treatment-plans/treatment-plan.money';
import {
  createTreatmentPlanItemSchema,
  createTreatmentPlanSchema,
  listTreatmentPlansQuerySchema,
  updateTreatmentPlanItemSchema,
  updateTreatmentPlanSchema,
} from '../src/modules/treatment-plans/treatment-plan.schemas';

describe('treatment plan v1 decimals', () => {
  it('normalizes exact decimals and rounds item subtotals once', () => {
    expect(decimalToUnits('9999999999.99')).toBe(999_999_999_999n);
    expect(multiplyMoney('3.33', '19.99')).toBe('66.57');
    expect(sumMoney(['0.10', '0.20', '66.57'])).toBe('66.87');
    expect(subtractMoney('66.87', '6.87')).toBe('60.00');
  });

  it('detects a discount greater than the subtotal', () => {
    expect(subtractMoney('10.00', '10.01')).toBeNull();
  });
});

describe('treatment plan v1 schemas', () => {
  it('normalizes plan fields and rejects internal properties', () => {
    const plan = createTreatmentPlanSchema.parse({
      title: '  Plan inicial ',
      description: '',
      discount: '0',
    });

    expect(plan).toMatchObject({
      title: 'Plan inicial',
      description: null,
      discount: '0.00',
    });
    expect(
      createTreatmentPlanSchema.safeParse({
        title: 'Plan interno',
        userId: 9,
        subtotal: '900.00',
      }).success
    ).toBe(false);
  });

  it('rejects invalid date ranges, empty patches, and numeric money', () => {
    expect(
      createTreatmentPlanSchema.safeParse({
        title: 'Fechas invalidas',
        estimatedStartDate: '2026-08-20',
        estimatedEndDate: '2026-08-19',
      }).success
    ).toBe(false);
    expect(updateTreatmentPlanSchema.safeParse({}).success).toBe(false);
    expect(updateTreatmentPlanSchema.safeParse({ discount: 10 }).success).toBe(
      false
    );
  });

  it('bounds collection queries and item values', () => {
    expect(listTreatmentPlansQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      status: 'all',
    });
    expect(
      listTreatmentPlansQuerySchema.safeParse({ pageSize: '101' }).success
    ).toBe(false);
    expect(
      createTreatmentPlanItemSchema.parse({
        name: 'Limpieza',
        quantity: '2.5',
        unitPrice: '500',
      })
    ).toMatchObject({ quantity: '2.50', unitPrice: '500.00' });
    expect(
      createTreatmentPlanItemSchema.safeParse({
        name: 'Limpieza',
        quantity: '0',
        unitPrice: '500.00',
      }).success
    ).toBe(false);
    expect(updateTreatmentPlanItemSchema.safeParse({ subtotal: '1.00' }).success)
      .toBe(false);
  });
});

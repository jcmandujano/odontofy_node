import { describe, it, expect } from 'vitest'
import { createOdontogramPlanSchema } from '../src/modules/odontograms/odontogram-plan.schemas'

describe('odontogram plan review validation', () => {
  const base = {
    title: ' Plan ',
    expectedSubtotal: '250',
    treatments: [{ treatmentId: 1, revision: 'a'.repeat(64) }],
  }
  it('requires a reviewed nonempty selection and exact expected amount', () => {
    expect(createOdontogramPlanSchema.parse(base)).toMatchObject({
      title: 'Plan',
      expectedSubtotal: '250.00',
    })
    expect(
      createOdontogramPlanSchema.safeParse({ ...base, treatments: [] }).success
    ).toBe(false)
    expect(
      createOdontogramPlanSchema.safeParse({
        ...base,
        treatments: [base.treatments[0], base.treatments[0]],
      }).success
    ).toBe(false)
    expect(
      createOdontogramPlanSchema.safeParse({
        ...base,
        treatments: [{ treatmentId: 1 }],
      }).success
    ).toBe(false)
    expect(
      createOdontogramPlanSchema.safeParse({
        ...base,
        treatments: Array.from({ length: 101 }, (_, index) => ({
          treatmentId: index + 1,
          revision: 'a'.repeat(64),
        })),
      }).success
    ).toBe(false)
  })
  it('rejects free prices, automatic charges, discounts and existing plan selection', () => {
    for (const extra of [
      { discount: '1.00' },
      { unitPrice: '1.00' },
      { status: 'ACCEPTED' },
      { treatmentPlanId: 3 },
      { confirmCharges: true },
    ])
      expect(
        createOdontogramPlanSchema.safeParse({ ...base, ...extra }).success
      ).toBe(false)
  })
})

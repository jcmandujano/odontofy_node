import { describe, expect, it } from 'vitest'
import {
  amount,
  cents,
  distributeDiscount,
} from '../src/platform/finance-money'
import {
  confirmChargeSchema,
  treatmentPaymentSchema,
} from '../src/modules/billing/treatment-charge.schemas'

describe('charge arithmetic and validation', () => {
  it('distributes discounts exactly and independently of input order', () => {
    const items = [
      { id: 3, subtotal: '0.01' },
      { id: 1, subtotal: '0.03' },
      { id: 2, subtotal: '0.02' },
    ]
    const shares = distributeDiscount(items, '0.01')
    expect(
      [...shares.values()].reduce((sum, value) => sum + cents(value), 0n)
    ).toBe(1n)
    expect([...shares]).toEqual([
      ...distributeDiscount(items.reverse(), '0.01'),
    ])
    expect(amount(cents('1000.00') - cents('400.00') - cents('600.00'))).toBe(
      '0.00'
    )
    expect(() => distributeDiscount(items, '0.07')).toThrow()
  })
  it('requires a reviewed amount and prevents malformed allocations', () => {
    const occurredOn = new Date().toISOString().slice(0, 10)
    expect(confirmChargeSchema.safeParse({ occurredOn }).success).toBe(false)
    expect(
      confirmChargeSchema.parse({ occurredOn, expectedTotal: '1000' })
        .expectedTotal
    ).toBe('1000.00')
    const base = { occurredOn, paymentMethod: 'CASH' }
    expect(
      treatmentPaymentSchema.safeParse({ ...base, allocations: [] }).success
    ).toBe(false)
    expect(
      treatmentPaymentSchema.safeParse({
        ...base,
        allocations: [{ chargeId: 1, amount: '0' }],
      }).success
    ).toBe(false)
    expect(
      treatmentPaymentSchema.safeParse({
        ...base,
        allocations: [
          { chargeId: 1, amount: '1' },
          { chargeId: 1, amount: '2' },
        ],
      }).success
    ).toBe(false)
    expect(
      treatmentPaymentSchema.safeParse({
        ...base,
        total: '1',
        allocations: [{ chargeId: 1, amount: '1' }],
      }).success
    ).toBe(false)
  })
})

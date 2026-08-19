import { describe, expect, it } from 'vitest'

import {
  addBillingMoney,
  multiplyBillingMoney,
  signedDecimalToUnits,
  subtractBillingMoney,
  sumBillingMoney,
} from '../src/modules/billing/billing.money'
import {
  billingSummaryQuerySchema,
  createBillingRecordSchema,
  listBillingRecordsQuerySchema,
} from '../src/modules/billing/billing.schemas'

describe('billing v1 exact money', () => {
  it('uses the complete DECIMAL(12,2) range without floating point math', () => {
    expect(signedDecimalToUnits('9999999999.99')).toBe(999_999_999_999n)
    expect(multiplyBillingMoney(3, '19.99')).toBe('59.97')
    expect(addBillingMoney('0.10', '0.20', '59.97')).toBe('60.27')
    expect(subtractBillingMoney('60.27', '10.27')).toBe('50.00')
    expect(sumBillingMoney('9999999999.99', '9999999999.99')).toBe(
      '19999999999.98'
    )
  })
})

describe('billing v1 schemas', () => {
  it('normalizes decimals and rejects duplicate concepts or internal totals', () => {
    expect(
      createBillingRecordSchema.parse({
        occurredOn: '2026-08-18',
        amountReceived: '10',
        paymentMethod: 'CASH',
        items: [{ conceptId: 1, quantity: 2 }],
      })
    ).toMatchObject({ discount: '0.00', amountReceived: '10.00' })
    expect(
      createBillingRecordSchema.safeParse({
        occurredOn: '2026-08-18',
        items: [
          { conceptId: 1, quantity: 1 },
          { conceptId: 1, quantity: 2 },
        ],
      }).success
    ).toBe(false)
    expect(
      createBillingRecordSchema.safeParse({
        occurredOn: '2026-08-18',
        total: '100.00',
        items: [{ conceptId: 1, quantity: 1 }],
      }).success
    ).toBe(false)
  })

  it('enforces payment-method, date, and collection invariants', () => {
    expect(
      createBillingRecordSchema.safeParse({
        occurredOn: '2999-01-01',
        amountReceived: '1.00',
        paymentMethod: null,
        items: [{ conceptId: 1, quantity: 1 }],
      }).success
    ).toBe(false)
    expect(
      listBillingRecordsQuerySchema.safeParse({
        dateFrom: '2026-08-10',
        dateTo: '2026-08-01',
      }).success
    ).toBe(false)
    expect(
      billingSummaryQuerySchema.safeParse({ dateFrom: 'invalid' }).success
    ).toBe(false)
    expect(listBillingRecordsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      status: 'POSTED',
    })
  })
})

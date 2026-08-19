export const BILLING_MAX_UNITS = 999_999_999_999n

export const signedDecimalToUnits = (value: string | number): bigint => {
  const normalized = String(value)
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) throw new Error(`Invalid decimal value: ${normalized}`)
  const units =
    BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] ? -units : units
}

export const signedUnitsToDecimal = (units: bigint): string => {
  const sign = units < 0n ? '-' : ''
  const absolute = units < 0n ? -units : units
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export const normalizeBillingDecimal = (value: string | number): string =>
  signedUnitsToDecimal(signedDecimalToUnits(value))

export const addBillingMoney = (...values: Array<string | number>): string => {
  const result = values.reduce(
    (sum, value) => sum + signedDecimalToUnits(value),
    0n
  )
  if (result > BILLING_MAX_UNITS || result < -BILLING_MAX_UNITS) {
    throw new RangeError('Money limit exceeded')
  }
  return signedUnitsToDecimal(result)
}

export const sumBillingMoney = (...values: Array<string | number>): string =>
  signedUnitsToDecimal(
    values.reduce((sum, value) => sum + signedDecimalToUnits(value), 0n)
  )

export const subtractBillingMoney = (
  left: string | number,
  right: string | number
): string =>
  addBillingMoney(left, signedUnitsToDecimal(-signedDecimalToUnits(right)))

export const multiplyBillingMoney = (
  quantity: number,
  unitPrice: string
): string => {
  const result = BigInt(quantity) * signedDecimalToUnits(unitPrice)
  if (result > BILLING_MAX_UNITS) throw new RangeError('Money limit exceeded')
  return signedUnitsToDecimal(result)
}

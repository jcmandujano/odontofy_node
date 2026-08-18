const POWERS_OF_TEN = [1n, 10n, 100n] as const;

export const MONEY_MAX_UNITS = 999_999_999_999n;

export const decimalToUnits = (value: string | number, scale = 2): bigint => {
  const normalized = String(value);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match || scale < 0 || scale > 2) {
    throw new Error(`Invalid decimal value: ${normalized}`);
  }

  const fraction = (match[2] ?? '').padEnd(scale, '0').slice(0, scale);
  return BigInt(match[1]) * POWERS_OF_TEN[scale] + BigInt(fraction || '0');
};

export const unitsToDecimal = (units: bigint, scale = 2): string => {
  const divisor = POWERS_OF_TEN[scale];
  const whole = units / divisor;
  const fraction = String(units % divisor).padStart(scale, '0');
  return scale === 0 ? String(whole) : `${whole}.${fraction}`;
};

export const normalizeDecimal = (value: string | number): string =>
  unitsToDecimal(decimalToUnits(value));

export const multiplyMoney = (
  quantity: string,
  unitPrice: string
): string => {
  const product = decimalToUnits(quantity) * decimalToUnits(unitPrice);
  const rounded = (product + 50n) / 100n;
  if (rounded > MONEY_MAX_UNITS) throw new RangeError('Money limit exceeded');
  return unitsToDecimal(rounded);
};

export const sumMoney = (values: Array<string | number>): string => {
  const total = values.reduce(
    (sum, value) => sum + decimalToUnits(value),
    0n
  );
  if (total > MONEY_MAX_UNITS) throw new RangeError('Money limit exceeded');
  return unitsToDecimal(total);
};

export const subtractMoney = (
  subtotal: string | number,
  discount: string | number
): string | null => {
  const total = decimalToUnits(subtotal) - decimalToUnits(discount);
  return total < 0n ? null : unitsToDecimal(total);
};

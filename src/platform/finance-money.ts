// Exact cents, including deterministic discount distribution (stable treatment-id order).
export const cents = (value: string | number): bigint => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value))
  if (!match) throw new Error('Invalid monetary amount')
  return (
    (match[1] ? -1n : 1n) *
    (BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0')))
  )
}
export const amount = (value: bigint): string =>
  `${value < 0n ? '-' : ''}${(value < 0n ? -value : value) / 100n}.${String((value < 0n ? -value : value) % 100n).padStart(2, '0')}`
export const distributeDiscount = (
  items: Array<{ id: number; subtotal: string | number }>,
  discount: string | number
) => {
  const sorted = [...items].sort((a, b) => a.id - b.id)
  const total = sorted.reduce((sum, item) => sum + cents(item.subtotal), 0n)
  const units = cents(discount)
  if (units < 0n || units > total) throw new Error('Discount exceeds subtotal')
  let used = 0n
  let running = 0n
  return new Map(
    sorted.map((item) => {
      running += cents(item.subtotal)
      const cumulative = total === 0n ? 0n : (units * running) / total
      const share = cumulative - used
      used = cumulative
      return [item.id, amount(share)]
    })
  )
}

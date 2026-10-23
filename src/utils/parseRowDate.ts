const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD`: a day, with no time of day and no zone. */
export function isDateOnly(value: unknown): boolean {
  return typeof value === "string" && DATE_ONLY.test(value)
}

/**
 * Reads a record's date. A date without a time (`2026-10-23`) is that day in
 * the local zone, not midnight UTC — which would land on the evening before in
 * the Americas.
 */
export function parseRowDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value)
    if (match) {
      const [, year, month, day] = match
      const local = new Date(Number(year), Number(month) - 1, Number(day))
      // `new Date(y, m, d)` carries an overflowing day (02-30) into the next month.
      return local.getMonth() === Number(month) - 1 ? local : undefined
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

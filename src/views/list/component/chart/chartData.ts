import { startOfDay, startOfMonth, startOfWeek } from "date-fns"
import type { ValueOptionInterface } from "react-data-form"
import type { ApiDialectInterface } from "@/api/apiDialectInterface"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

export type ChartAggregate = "count" | "sum" | "average"
export type ChartInterval = "day" | "week" | "month"

export interface ChartBucket {
  key: string
  label: string
  /** How many records fall in it. */
  count: number
  /** The measure drawn: `count`, or the sum or average of `valueField`. */
  value: number
  /** The first day of the period, for a chart over time. */
  date?: Date
}

export interface ChartSummary {
  /** Records on the page. */
  count: number
  /** The sum of `valueField` over them; `undefined` without one. */
  total?: number
  /** Its mean over the records that carry a value. */
  average?: number
  buckets: ChartBucket[]
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

/** What a category field holds, as the key its bar is filed under. */
function categoryOf(
  value: unknown,
  resource?: ChartDataOptions["resource"]
): { key: string; label: string } | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "boolean") return { key: String(value), label: String(value) }
  if (typeof value === "string" || typeof value === "number") {
    return { key: String(value), label: String(value) }
  }
  if (typeof value === "object") {
    const record = value as RecordOfAny
    const key = getIdFromObject(record, false, resource)
    if (!key) return undefined
    const label = record.name ?? record.label ?? record.title ?? key
    return { key, label: String(label) }
  }
  return undefined
}

export interface ChartDataOptions {
  /** Whose dialect reads the identity of a related record. */
  resource?: { dialect?: ApiDialectInterface } | null
  groupBy?: string
  groups?: ValueOptionInterface[]
  dateField?: string
  interval?: ChartInterval
  valueField?: string
  aggregate?: ChartAggregate
  /** The label of the records with no value for `groupBy`. */
  emptyLabel?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  formatPeriod?: (date: Date, interval: ChartInterval) => string
}

/**
 * The figures a chart draws, from the records of the page: one bucket per value
 * of `groupBy` — in the order `groups` declares, then by size —, or one per
 * period of `dateField`, in time order with the empty periods in between kept,
 * so a gap reads as a gap and not as two neighbouring bars.
 */
export function chartData(
  rows: RecordOfAny[],
  options: ChartDataOptions
): ChartSummary {
  const {
    groupBy,
    groups,
    dateField,
    interval = "month",
    valueField,
    emptyLabel = "None",
    weekStartsOn = 1,
    formatPeriod = (date) => date.toISOString().slice(0, 10),
  } = options
  const aggregate = options.aggregate ?? (valueField ? "sum" : "count")

  const measured = valueField
    ? rows.map((row) => toNumber(row?.[valueField])).filter((n) => n !== undefined)
    : []
  const total = valueField ? measured.reduce((sum, n) => sum + n, 0) : undefined
  const average =
    valueField && measured.length ? (total as number) / measured.length : undefined

  const acc = new Map<
    string,
    { label: string; count: number; sum: number; measured: number; date?: Date }
  >()
  const add = (key: string, label: string, row: RecordOfAny, date?: Date) => {
    const bucket = acc.get(key) ?? { label, count: 0, sum: 0, measured: 0, date }
    bucket.count++
    const value = valueField ? toNumber(row?.[valueField]) : undefined
    if (value !== undefined) {
      bucket.sum += value
      bucket.measured++
    }
    acc.set(key, bucket)
  }

  const periodStart = (date: Date) =>
    interval === "day"
      ? startOfDay(date)
      : interval === "week"
        ? startOfWeek(date, { weekStartsOn })
        : startOfMonth(date)

  if (dateField) {
    for (const row of rows) {
      const date = toDate(row?.[dateField])
      if (!date) continue
      const start = periodStart(date)
      add(String(start.getTime()), formatPeriod(start, interval), row, start)
    }
  } else if (groupBy) {
    const labels = new Map(groups?.map((g) => [String(g.value), String(g.label)]))
    for (const row of rows) {
      const category = categoryOf(row?.[groupBy], options.resource)
      if (!category) add("", emptyLabel, row)
      else add(category.key, labels.get(category.key) ?? category.label, row)
    }
    // A declared group with no record is a bar of zero, not a missing one.
    for (const group of groups ?? []) {
      const key = String(group.value)
      if (!acc.has(key))
        acc.set(key, { label: String(group.label), count: 0, sum: 0, measured: 0 })
    }
  }

  const valueOf = (b: { count: number; sum: number; measured: number }) =>
    aggregate === "count"
      ? b.count
      : aggregate === "sum"
        ? b.sum
        : b.measured
          ? b.sum / b.measured
          : 0

  let buckets: ChartBucket[] = [...acc.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    count: b.count,
    value: valueOf(b),
    date: b.date,
  }))

  if (dateField) {
    buckets.sort((a, b) => a.date!.getTime() - b.date!.getTime())
    buckets = fillPeriods(buckets, interval, formatPeriod)
  } else {
    const order = new Map(groups?.map((g, index) => [String(g.value), index]))
    buckets.sort((a, b) => {
      const ia = order.get(a.key)
      const ib = order.get(b.key)
      if (ia !== undefined || ib !== undefined) {
        return (ia ?? Number.MAX_SAFE_INTEGER) - (ib ?? Number.MAX_SAFE_INTEGER)
      }
      // The records with no value come last, whatever their number.
      if (a.key === "" || b.key === "") return a.key === "" ? 1 : -1
      return b.value - a.value
    })
  }

  return { count: rows.length, total, average, buckets }
}

function nextPeriod(date: Date, interval: ChartInterval): Date {
  const next = new Date(date)
  if (interval === "day") next.setDate(next.getDate() + 1)
  else if (interval === "week") next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)
  return next
}

/** The empty periods between the first and the last, as buckets of zero. */
function fillPeriods(
  buckets: ChartBucket[],
  interval: ChartInterval,
  formatPeriod: (date: Date, interval: ChartInterval) => string
): ChartBucket[] {
  if (buckets.length < 2) return buckets
  const byTime = new Map(buckets.map((b) => [b.date!.getTime(), b]))
  const filled: ChartBucket[] = []
  const last = buckets[buckets.length - 1].date!.getTime()
  // A generous cap: a chart by day over ten years is a mistake, not a chart.
  for (
    let date = buckets[0].date!;
    date.getTime() <= last && filled.length < 1000;
    date = nextPeriod(date, interval)
  ) {
    filled.push(
      byTime.get(date.getTime()) ?? {
        key: String(date.getTime()),
        label: formatPeriod(date, interval),
        count: 0,
        value: 0,
        date,
      }
    )
  }
  return filled
}

import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns"
import type { Locale } from "date-fns"

/** One record of the feed, once its date is read. */
export interface FeedEntry<Row> {
  row: Row
  /** The record's date; `undefined` when it has none, or an unreadable one. */
  date?: Date
}

/** The events of one day, or the ones without a date. */
export interface FeedDay<Row> {
  /** `yyyy-MM-dd` in the reader's time zone; `"undated"` for the last group. */
  key: string
  /** The day itself; `undefined` for the records without a date. */
  day?: Date
  entries: FeedEntry<Row>[]
}

/** A date as the API sends it — ISO string, timestamp, `Date` — or nothing. */
export function readDate(value: unknown): Date | undefined {
  let date: Date | undefined
  if (value instanceof Date) date = value
  else if (typeof value === "number") date = new Date(value)
  else if (typeof value === "string" && value.trim()) date = parseISO(value.trim())
  return date && isValid(date) ? date : undefined
}

/**
 * The records sorted by date and gathered by day. The most recent comes first
 * unless `order` is `"asc"`; records without a date close the feed, in the
 * order they came.
 */
export function groupByDay<Row>(
  rows: Row[],
  dateOf: (row: Row) => Date | undefined,
  order: "asc" | "desc" = "desc"
): FeedDay<Row>[] {
  const entries = rows.map((row, index) => ({ row, date: dateOf(row), index }))
  const dated = entries
    .filter((entry) => entry.date)
    .sort(
      (a, b) =>
        (order === "asc" ? 1 : -1) * (a.date!.getTime() - b.date!.getTime()) ||
        a.index - b.index
    )
  const undated = entries.filter((entry) => !entry.date)

  const days: FeedDay<Row>[] = []
  for (const entry of dated) {
    const key = format(entry.date!, "yyyy-MM-dd")
    const last = days[days.length - 1]
    if (last?.key === key) last.entries.push(entry)
    else days.push({ key, day: entry.date, entries: [entry] })
  }
  if (undated.length) days.push({ key: "undated", entries: undated })

  return days
}

/** `"today"`, `"yesterday"`, or the date written out. */
export function dayKind(day: Date, now: Date): "today" | "yesterday" | "date" {
  const gap = differenceInCalendarDays(now, day)
  if (gap === 0) return "today"
  if (gap === 1) return "yesterday"
  return "date"
}

export function fullDayLabel(day: Date, locale: Locale): string {
  return format(day, "PPPP", { locale })
}

export function fullDateLabel(date: Date, locale: Locale): string {
  return format(date, "PPPp", { locale })
}

/** "5 minutes ago", "in 2 hours", in the configured language. */
export function relativeLabel(date: Date, locale: Locale): string {
  return formatDistanceToNowStrict(date, { locale, addSuffix: true })
}

/** What an actor is called, whether the record holds a name or an object. */
export function actorName(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["name", "title", "label", "username", "email"]) {
      const named = record[key]
      if (typeof named === "string" && named.trim()) return named.trim()
    }
  }
  return undefined
}

export function initialsOf(name: string): string {
  const words = name.split(/[\s@._-]+/).filter(Boolean)
  return (
    words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "?"
  )
}

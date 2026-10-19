import { readCollectionPage } from "@/api/collection"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { ApiDialectInterface, ReservedFilterKeys } from "@/api/apiDialectInterface"
import type { Repository } from "@/ResourceDefinition"

export type ExportFormat = "csv" | "json"

/** One column of the export: the field it reads, and the heading it carries. */
export interface ExportColumn {
  field: string
  label: string
}

export interface ExportProgress {
  /** Rows read so far. */
  loaded: number
  /** Rows the filter matches, when the API says. */
  total?: number
}

export interface FetchAllRowsOptions {
  onProgress?: (progress: ExportProgress) => void
  /** Stops reading between two pages; the export is then abandoned. */
  signal?: AbortSignal
}

/**
 * A safety net, not a limit: a backend that ignores `page` answers the same
 * rows forever, and without it the export would never end.
 */
const MAX_PAGES = 10_000

/**
 * Reads every page of the collection the list is showing.
 *
 * The filter is the list's own — its search, its sort — with the page taken
 * out, so the export holds what the filters match and not the page on screen.
 * Paging goes through the resource's repository, which means the dialect turns
 * `page` into whatever the backend calls it, a Hydra `?page=2` as much as a
 * Strapi `pagination[page]`. It stops on the total when the API gives one, and
 * otherwise on the first page that is empty, short, or only repeats rows.
 */
export async function fetchAllRows(
  resource: Pick<Repository, "getCollection"> & { dialect?: ApiDialectInterface },
  filter: RecordOfAny,
  { onProgress, signal }: FetchAllRowsOptions = {}
): Promise<RecordOfAny[]> {
  const { page: _page, ...rest } = filter
  const rows: RecordOfAny[] = []
  const seen = new Set<string>()
  let pageSize: number | undefined

  for (let page = 1; page <= MAX_PAGES; page++) {
    signal?.throwIfAborted()

    const response = await resource.getCollection({
      ...rest,
      [ReservedFilterKeys.page]: page,
    })
    const { items, totalItems } = readCollectionPage(response?.data, resource)

    // A page made only of rows already read means the backend ignored `page`.
    const keys = items.map((item) => JSON.stringify(item))
    const repeated = keys.every((key) => seen.has(key))
    keys.forEach((key) => seen.add(key))
    if (!repeated) rows.push(...items)
    onProgress?.({ loaded: rows.length, total: totalItems })

    pageSize ??= items.length
    const done =
      repeated ||
      items.length < pageSize ||
      (totalItems !== undefined && rows.length >= totalItems)
    if (done) break
  }

  return rows
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(formatCell).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** Quotes a cell when it holds a comma, a quote or a line break (RFC 4180). */
function escapeCsv(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
}

/**
 * The rows as CSV, one line per row, the columns in the order given.
 *
 * Lines end in CRLF as the RFC wants, and the text starts with a byte order
 * mark: without it Excel reads an accented UTF-8 file as Latin-1.
 */
export function toCsv(rows: RecordOfAny[], columns: ExportColumn[]): string {
  const lines = [
    columns.map((column) => escapeCsv(column.label)).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv(formatCell(row[column.field]))).join(",")
    ),
  ]
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

/** The rows as a JSON array, each reduced to the columns given. */
export function toJson(rows: RecordOfAny[], columns: ExportColumn[]): string {
  return JSON.stringify(
    rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column.field, row[column.field]]))
    ),
    null,
    2
  )
}

/** Hands the text to the browser as a download. */
export function downloadText(content: string, fileName: string, mime: string): void {
  const objectUrl = window.URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(objectUrl)
}

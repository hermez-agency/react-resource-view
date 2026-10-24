import { localStorageRepository, AsyncRepositoryInterface } from "jsonld-repository"
import { IdAbleInterface, createJsonLd, createJsonLdCollection } from "jsonld-item"
import { ReservedFilterKeys } from "@/api/apiDialectInterface"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

const {
  page: PAGE_KEY,
  itemsPerPage: SIZE_KEY,
  order: ORDER_KEY,
} = ReservedFilterKeys

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  // Rows without a value go last, whatever the direction asks for the others.
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** Sorts by each field in turn: the first one decides, the next break its ties. */
function sortRows(rows: RecordOfAny[], order: RecordOfAny): RecordOfAny[] {
  const sorts = Object.entries(order).map(
    ([field, direction]) =>
      [field, String(direction).toLowerCase() === "desc"] as const
  )
  if (sorts.length === 0) return rows

  return [...rows].sort((left, right) => {
    for (const [field, descending] of sorts) {
      const a = left[field]
      const b = right[field]
      const missing = a === undefined || a === null || b === undefined || b === null
      const result = compareValues(a, b)
      if (result !== 0) return descending && !missing ? -result : result
    }
    return 0
  })
}

/**
 * Writes the starting records under the storage key — and only when nothing
 * lives there yet, so a reload, or a user who emptied the list, never gets
 * them back. Out of the browser there is no storage to tell, so nothing is
 * written.
 */
function seedStorage(path: string, seed: unknown[] | (() => unknown[])): void {
  if (typeof localStorage === "undefined" || localStorage.getItem(path) !== null)
    return

  const rows = typeof seed === "function" ? seed() : seed
  const member = rows.map((object) =>
    createJsonLd({ type: path, object: object as object })
  )
  localStorage.setItem(
    path,
    JSON.stringify(createJsonLdCollection({ type: path, member }))
  )
}

/**
 * `storage: "local"`, with the list's reserved keys understood.
 *
 * The base repository matches every filter key against the fields of a record,
 * so `page`, `itemsPerPage` and `order` — which no record has — emptied the
 * list. They are taken out of the filter here, and the sort and the page are
 * applied client-side to the rows that match. `totalItems` stays the count
 * before paging, which is what the pagination counts by.
 */
export function localRepository<T extends IdAbleInterface = IdAbleInterface>({
  path,
  seed,
}: {
  path: string
  /** The records a still-empty storage starts with. */
  seed?: unknown[] | (() => unknown[])
}): AsyncRepositoryInterface<T> {
  if (seed) seedStorage(path, seed)
  const base = localStorageRepository({
    path,
  }) as unknown as AsyncRepositoryInterface<T>

  return {
    ...base,
    getCollection: async (params, ...rest) => {
      const {
        [PAGE_KEY]: page,
        [SIZE_KEY]: itemsPerPage,
        [ORDER_KEY]: order,
        ...fields
      } = (params ?? {}) as RecordOfAny

      const response = await (base.getCollection as any)(fields, ...rest)
      const collection = (response as any)?.data as RecordOfAny | undefined
      if (!collection) return response

      const key = Array.isArray(collection.collection) ? "collection" : "member"
      let rows = (collection[key] ?? []) as RecordOfAny[]
      if (order && typeof order === "object")
        rows = sortRows(rows, order as RecordOfAny)
      const totalItems = rows.length

      const size = Number(itemsPerPage)
      if (size > 0) {
        const start = (Math.max(Number(page) || 1, 1) - 1) * size
        rows = rows.slice(start, start + size)
      }

      return { ...response, data: { ...collection, [key]: rows, totalItems } }
    },
  } as AsyncRepositoryInterface<T>
}

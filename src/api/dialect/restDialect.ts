import {
  ApiDialectInterface,
  ApiErrorPayloadInterface,
  ApiOperationInterface,
  ApiRequestInterface,
  ApiResponseMetaInterface,
  CollectionPageInterface,
  ReservedFilterKeys,
} from "@/api/apiDialectInterface"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import {
  isAbsoluteUrl,
  isEmptyFilterValue,
  joinPath,
  toQuerySuffix,
  withoutEmptyValues,
} from "@/api/queryString"

export interface RestDialectOptionsInterface {
  /** The field a record is addressed by in `/posts/{id}`. Defaults to `id`. */
  primaryKey?: string
  /**
   * The query parameter the page number travels in. `false` leaves paging to
   * the API's own links: no number is sent, and the list follows the `next`
   * URL the API gave (see `linkHeader`). Defaults to `page`.
   */
  pageParam?: string | false
  /** The query parameter the page size travels in. Defaults to `limit`. */
  sizeParam?: string
  /** The query parameter a sort travels in. Defaults to `sort`. */
  sortParam?: string
  /**
   * Where the directions of a sort go, when the API keeps them apart from the
   * fields — json-server's `_sort=title,id&_order=asc,desc`. Without it the
   * direction is a `-` in front of the field: `sort=-title,id`.
   */
  directionParam?: string
  /**
   * The response header holding how many rows match across every page, such
   * as `X-Total-Count`. The pagination hides itself without a total.
   */
  totalHeader?: string
  /**
   * Reads the `Link: <…>; rel="next"` header for the next page. With
   * `cursorParam` the cursor is that URL's `cursorParam`; with `pageParam:
   * false` it is the whole URL.
   */
  linkHeader?: boolean
  /**
   * The query parameter a cursor travels in. Paging is then by cursor rather
   * than by number: the list asks for the page the previous one pointed to.
   */
  cursorParam?: string
  /** The key holding the rows when the body is an object. A bare array otherwise. */
  itemsKey?: string
  /** The key of the body holding the total, when it is not in a header. */
  totalKey?: string
  /** The key of the body holding the URL of the next page, such as DRF's `next`. */
  nextKey?: string
  /** Rows per page when a list asks for none. */
  defaultItemsPerPage?: number
  /** Whether routes end with a slash — `/posts/` and `/posts/1/`. Defaults to `false`. */
  trailingSlash?: boolean
}

/** The `rel="next"` target of a `Link` header, if there is one. */
function readNextLink(headers?: Headers): string | undefined {
  const link = headers?.get("link")
  if (!link) return undefined
  for (const match of link.matchAll(/<([^>]*)>([^<]*)/g)) {
    const rel = /rel\s*=\s*"?([^";,]+)"?/i.exec(match[2])
    if (rel && rel[1].split(/\s+/).includes("next")) return match[1]
  }
  return undefined
}

function readNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * The dialect of a plain REST API, configured rather than written.
 *
 * It covers what most JSON APIs have in common: a record at `/posts/{id}`, a
 * filter as a plain query parameter, a sort and a page size in parameters of
 * the names you give, and a page counted by a header (`X-Total-Count`), a
 * `Link` header, or a cursor. See {@link jsonServerDialect} and
 * {@link drfCursorDialect} for two ready-made configurations.
 */
export function restDialect({
  primaryKey = "id",
  pageParam = "page",
  sizeParam = "limit",
  sortParam = "sort",
  directionParam,
  totalHeader,
  linkHeader = false,
  cursorParam,
  itemsKey,
  totalKey,
  nextKey,
  defaultItemsPerPage = 30,
  trailingSlash = false,
}: RestDialectOptionsInterface = {}): ApiDialectInterface {
  // A cursor is a parameter's value; without a parameter it is a whole URL.
  const followsUrls = !cursorParam && pageParam === false

  const collectionUrl = (path: string): string => {
    const url = isAbsoluteUrl(path) ? path : `/${path.replace(/^\/+/, "")}`
    const bare = url.replace(/\/+$/, "")
    return trailingSlash ? `${bare}/` : bare
  }

  const itemUrl = (path: string, id: string | undefined): string => {
    const url = collectionUrl(path)
    if (!id) return url
    const item = joinPath(url.replace(/\/+$/, ""), encodeURIComponent(id))
    return trailingSlash ? `${item}/` : item
  }

  const appendFilter = (
    params: URLSearchParams,
    field: string,
    value: unknown
  ): void => {
    if (isEmptyFilterValue(value)) return

    // `?tag=a&tag=b`, the way most servers read a list.
    if (Array.isArray(value)) {
      value.forEach((entry) => appendFilter(params, field, entry))
      return
    }

    params.append(field, value instanceof Date ? value.toISOString() : String(value))
  }

  const buildQuery = (filter: RecordOfAny = {}): URLSearchParams => {
    const params = new URLSearchParams()

    const clean = withoutEmptyValues(filter)
    const itemsPerPage =
      Number(clean[ReservedFilterKeys.itemsPerPage] ?? defaultItemsPerPage) ||
      defaultItemsPerPage
    const page = Number(clean[ReservedFilterKeys.page] ?? 1) || 1

    Object.entries(clean).forEach(([key, value]) => {
      if (
        key === ReservedFilterKeys.page ||
        key === ReservedFilterKeys.itemsPerPage ||
        key === ReservedFilterKeys.cursor
      ) {
        return
      }
      if (key === ReservedFilterKeys.order) {
        const sorts = Object.entries((value ?? {}) as RecordOfAny).map(
          ([field, direction]) => [field, String(direction).toLowerCase()] as const
        )
        if (sorts.length === 0) return
        if (directionParam) {
          params.set(sortParam, sorts.map(([field]) => field).join(","))
          params.set(
            directionParam,
            sorts.map(([, direction]) => direction).join(",")
          )
        } else {
          params.set(
            sortParam,
            sorts
              .map(([field, direction]) =>
                direction === "desc" ? `-${field}` : field
              )
              .join(",")
          )
        }
        return
      }
      appendFilter(params, key, value)
    })

    params.set(sizeParam, String(itemsPerPage))
    if (cursorParam) {
      const cursor = clean[ReservedFilterKeys.cursor]
      if (!isEmptyFilterValue(cursor)) params.set(cursorParam, String(cursor))
    } else if (pageParam) {
      params.set(pageParam, String(page))
    }

    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    // The key travels in the URL; a server rarely accepts it back.
    delete body[primaryKey]
    delete body["@id"]
    return body
  }

  const readIdentity = (item: RecordOfAny | null | undefined) => {
    if (!item) return undefined
    const value = item[primaryKey]
    return value === undefined || value === null ? undefined : String(value)
  }

  const readNextCursor = (
    body: RecordOfAny | undefined,
    headers?: Headers
  ): string | null | undefined => {
    if (!cursorParam && !followsUrls) return undefined

    const link = linkHeader ? readNextLink(headers) : undefined
    const fromBody = nextKey ? body?.[nextKey] : undefined
    const next = link ?? (typeof fromBody === "string" ? fromBody : undefined)

    if (next === undefined) {
      // No `next` and something to read it from: this is the last page.
      const readable = (linkHeader && headers) || (nextKey && body)
      return readable ? null : undefined
    }
    if (followsUrls) return next
    return new URL(next, "http://localhost").searchParams.get(cursorParam!) ?? null
  }

  return {
    name: "rest",

    buildRequest({
      name,
      path,
      id,
      filter,
      item,
    }: ApiOperationInterface): ApiRequestInterface {
      switch (name) {
        case "getCollection": {
          const cursor = filter?.[ReservedFilterKeys.cursor]
          // The API handed over the URL of the page: it already holds the filters.
          if (followsUrls && typeof cursor === "string" && cursor) {
            return { url: cursor, method: "GET" }
          }
          return {
            url: `${collectionUrl(path)}${toQuerySuffix(buildQuery(filter))}`,
            method: "GET",
          }
        }
        case "getItem":
          return { url: itemUrl(path, id), method: "GET" }
        case "createItem":
          return { url: collectionUrl(path), method: "POST", body: writeBody(item) }
        case "updateItem":
          return { url: itemUrl(path, id), method: "PATCH", body: writeBody(item) }
        case "replaceItem":
          return { url: itemUrl(path, id), method: "PUT", body: writeBody(item) }
        case "removeItem":
          return { url: itemUrl(path, id), method: "DELETE" }
      }
    },

    readCollection(
      payload: unknown,
      meta?: ApiResponseMetaInterface
    ): CollectionPageInterface {
      const body =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as RecordOfAny)
          : undefined
      const rows = itemsKey ? body?.[itemsKey] : payload
      const items = Array.isArray(rows) ? (rows as RecordOfAny[]) : []

      const totalItems =
        readNumber(totalHeader ? meta?.headers?.get(totalHeader) : undefined) ??
        readNumber(totalKey ? body?.[totalKey] : undefined)

      const page: CollectionPageInterface = { items, totalItems }
      const nextCursor = readNextCursor(body, meta?.headers)
      if (nextCursor !== undefined) page.nextCursor = nextCursor
      return page
    },

    readItem(payload: unknown): RecordOfAny | undefined {
      return (payload ?? undefined) as RecordOfAny | undefined
    },

    getId: readIdentity,
    getIdentifier: readIdentity,

    normalizeError(payload, status): ApiErrorPayloadInterface | undefined {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return status ? { status } : undefined
      }
      const body = payload as RecordOfAny
      const detail = [body.detail, body.message, body.error].find(
        (part): part is string => typeof part === "string" && part !== ""
      )
      if (detail) return { status, detail }
      return status ? { status } : undefined
    },

    referencesAreIris: false,
  }
}

/**
 * json-server: `_page`, `_limit`, `_sort` with `_order` beside it, the total
 * in `X-Total-Count`.
 */
export function jsonServerDialect(
  options: RestDialectOptionsInterface = {}
): ApiDialectInterface {
  return restDialect({
    pageParam: "_page",
    sizeParam: "_limit",
    sortParam: "_sort",
    directionParam: "_order",
    totalHeader: "X-Total-Count",
    ...options,
  })
}

/**
 * Django REST Framework's `CursorPagination`: `?cursor=…&page_size=…`, the
 * rows in `results`, the next page's URL in `next`, and no total.
 */
export function drfCursorDialect(
  options: RestDialectOptionsInterface = {}
): ApiDialectInterface {
  return restDialect({
    cursorParam: "cursor",
    sizeParam: "page_size",
    sortParam: "ordering",
    itemsKey: "results",
    nextKey: "next",
    trailingSlash: true,
    ...options,
  })
}

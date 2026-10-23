import {
  ApiDialectInterface,
  ApiErrorPayloadInterface,
  ApiOperationInterface,
  ApiRequestInterface,
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

export interface FastapiDialectOptionsInterface {
  /** The field a record is addressed by in `/items/{id}`. Defaults to `id`. */
  primaryKey?: string
  /**
   * How a page is asked for. `skip-limit` — the default — is the official
   * tutorial's `?skip=20&limit=10`; `page-size` is the `?page=3&size=10` of
   * `fastapi-pagination`.
   */
  pagination?: "skip-limit" | "page-size"
  /** Rows per page when a list asks for none. */
  defaultItemsPerPage?: number
  /**
   * The query parameter a sort travels in, as `-created_at,title`: one field
   * per column, a `-` in front of a descending one. Defaults to `order_by`.
   */
  orderParam?: string
  /**
   * Whether the collection route ends with a slash — `/items/` rather than
   * `/items`, the way the FastAPI tutorial declares it. FastAPI answers the
   * other spelling with a 307 redirect, which a browser follows without the
   * `Authorization` header. Defaults to `false`.
   */
  trailingSlash?: boolean
}

/** The segments FastAPI prefixes a validation error's `loc` with. */
const requestPartSegments = ["body", "query", "path"]

/**
 * `["body", "address", "city"]` — the field path, without the request part.
 * A `loc` of `["body"]` alone blames the whole payload: the empty path the
 * form shows above its inputs.
 */
function readFieldPath(loc: unknown): string | undefined {
  if (!Array.isArray(loc) || loc.length === 0) return undefined
  const segments = requestPartSegments.includes(String(loc[0])) ? loc.slice(1) : loc
  return segments.map(String).join(".")
}

/**
 * The dialect of a FastAPI application.
 *
 * A collection is either the bare array of the tutorial — no total, so the
 * pagination hides itself — or the `{ items, total }` page of
 * `fastapi-pagination`. A page is `skip` and `limit`, or `page` and `size`, a
 * filter is a plain query parameter, a sort is `order_by=-field`, and a record
 * lives at `/items/{id}`. Validation errors arrive as a 422 whose `detail`
 * lists one entry per field, located by `loc`.
 */
export function fastapiDialect({
  primaryKey = "id",
  pagination = "skip-limit",
  defaultItemsPerPage = 30,
  orderParam = "order_by",
  trailingSlash = false,
}: FastapiDialectOptionsInterface = {}): ApiDialectInterface {
  const collectionUrl = (path: string): string => {
    const url = isAbsoluteUrl(path) ? path : `/${path.replace(/^\/+/, "")}`
    const bare = url.replace(/\/+$/, "")
    return trailingSlash ? `${bare}/` : bare
  }

  const itemUrl = (path: string, id: string | undefined): string => {
    const url = collectionUrl(path)
    return id ? joinPath(url, encodeURIComponent(id)) : url
  }

  const appendFilter = (
    params: URLSearchParams,
    field: string,
    value: unknown
  ): void => {
    if (isEmptyFilterValue(value)) return

    // `?tag=a&tag=b` — how FastAPI reads a `list[str]` query parameter.
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
        key === ReservedFilterKeys.itemsPerPage
      ) {
        return
      }
      if (key === ReservedFilterKeys.order) {
        const order = Object.entries((value ?? {}) as RecordOfAny)
          .map(([field, direction]) =>
            String(direction).toLowerCase() === "desc" ? `-${field}` : field
          )
          .join(",")
        if (order) params.set(orderParam, order)
        return
      }
      appendFilter(params, key, value)
    })

    if (pagination === "page-size") {
      params.set("page", String(page))
      params.set("size", String(itemsPerPage))
    } else {
      params.set("skip", String((page - 1) * itemsPerPage))
      params.set("limit", String(itemsPerPage))
    }

    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    // The key travels in the URL; a Pydantic model rarely accepts it back.
    delete body[primaryKey]
    delete body["@id"]
    return body
  }

  const readIdentity = (item: RecordOfAny | null | undefined) => {
    if (!item) return undefined
    const value = item[primaryKey]
    return value === undefined || value === null ? undefined : String(value)
  }

  return {
    name: "fastapi",

    buildRequest({
      name,
      path,
      id,
      filter,
      item,
    }: ApiOperationInterface): ApiRequestInterface {
      switch (name) {
        case "getCollection":
          return {
            url: `${collectionUrl(path)}${toQuerySuffix(buildQuery(filter))}`,
            method: "GET",
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

    readCollection(payload: unknown): CollectionPageInterface {
      // `fastapi-pagination` answers `{ items, total }`.
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const { items, total } = payload as RecordOfAny
        if (Array.isArray(items)) {
          return {
            items: items as RecordOfAny[],
            totalItems: typeof total === "number" ? total : undefined,
          }
        }
      }

      const items = Array.isArray(payload) ? (payload as RecordOfAny[]) : []
      return { items }
    },

    readItem(payload: unknown): RecordOfAny | undefined {
      return (payload ?? undefined) as RecordOfAny | undefined
    },

    getId: readIdentity,
    getIdentifier: readIdentity,

    normalizeError(payload, status): ApiErrorPayloadInterface | undefined {
      if (!payload || typeof payload !== "object") {
        return status ? { status } : undefined
      }
      const detail = (payload as RecordOfAny).detail

      if (Array.isArray(detail)) {
        return {
          status,
          violations: detail.map((entry: RecordOfAny) => ({
            propertyPath: readFieldPath(entry?.loc),
            message: entry?.msg as string | undefined,
          })),
        }
      }

      if (typeof detail === "string") return { status, detail }

      return status ? { status } : undefined
    },

    referencesAreIris: false,
  }
}

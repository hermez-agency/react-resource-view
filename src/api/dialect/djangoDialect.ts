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

export interface DjangoDialectOptionsInterface {
  /** The field a record is addressed by in `/articles/{id}/`. Defaults to `id`. */
  primaryKey?: string
  /**
   * How a page is asked for. `page-number` — the default — is DRF's
   * `PageNumberPagination`, `?page=3&page_size=10`; `limit-offset` is its
   * `LimitOffsetPagination`, `?limit=10&offset=20`.
   */
  pagination?: "page-number" | "limit-offset"
  /** Rows per page when a list asks for none. */
  defaultItemsPerPage?: number
  /**
   * The query parameter the page size travels in with `page-number`. DRF only
   * reads one when the paginator sets `page_size_query_param`. Defaults to
   * `page_size`.
   */
  pageSizeParam?: string
  /**
   * The query parameter a sort travels in, as `-created_at,title`: one field
   * per column, a `-` in front of a descending one. Defaults to `ordering`,
   * the one of DRF's `OrderingFilter`.
   */
  orderParam?: string
  /**
   * Whether routes end with a slash — `/articles/` and `/articles/1/`, the way
   * DRF's routers declare them. Django answers the other spelling with a
   * redirect that loses the body of a POST. Defaults to `true`.
   */
  trailingSlash?: boolean
}

/** What DRF calls an error that belongs to no field in particular. */
const nonFieldKey = "non_field_errors"

/**
 * Turns DRF's error tree into one violation per message: `{ address: { city:
 * ["Required."] } }` blames `address.city`, a list of nested serializers
 * `lines.0.qty`, and `non_field_errors` the whole form.
 */
function readViolations(
  node: unknown,
  path: string[],
  violations: { propertyPath?: string; message?: string }[]
): void {
  if (typeof node === "string") {
    violations.push({ propertyPath: path.join("."), message: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((entry, index) =>
      typeof entry === "string"
        ? readViolations(entry, path, violations)
        : // A `{}` among the entries is a nested row that has no error.
          readViolations(entry, [...path, String(index)], violations)
    )
    return
  }
  if (node && typeof node === "object") {
    Object.entries(node as RecordOfAny).forEach(([key, value]) => {
      // DRF always wraps a field's messages in a list; a bare string under a
      // key is some other API's `{ "error": "boom" }`.
      if (typeof value === "string") return
      readViolations(value, key === nonFieldKey ? path : [...path, key], violations)
    })
  }
}

/**
 * The dialect of a Django REST Framework API.
 *
 * A collection is the `{ count, next, previous, results }` page of DRF's
 * paginators — or a bare array when the view has none, in which case the
 * pagination hides itself. A page is `page` and `page_size`, or `limit` and
 * `offset`, a filter is a plain query parameter (django-filter), a sort is
 * `ordering=-field`, and a record lives at `/articles/{id}/`. Validation
 * errors arrive as a 400 whose body maps each field to its messages; other
 * errors carry a `detail`.
 */
export function djangoDialect({
  primaryKey = "id",
  pagination = "page-number",
  defaultItemsPerPage = 30,
  pageSizeParam = "page_size",
  orderParam = "ordering",
  trailingSlash = true,
}: DjangoDialectOptionsInterface = {}): ApiDialectInterface {
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

    // `?tag=a&tag=b` — how django-filter reads a `MultipleChoiceFilter`.
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

    if (pagination === "limit-offset") {
      params.set("limit", String(itemsPerPage))
      params.set("offset", String((page - 1) * itemsPerPage))
    } else {
      params.set("page", String(page))
      params.set(pageSizeParam, String(itemsPerPage))
    }

    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    // The key travels in the URL; a serializer rarely accepts it back.
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
    name: "django",

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
      if (Array.isArray(payload)) return { items: payload as RecordOfAny[] }

      if (payload && typeof payload === "object") {
        const { results, count } = payload as RecordOfAny
        if (Array.isArray(results)) {
          // `CursorPagination` has no `count`: the page count stays unknown.
          return {
            items: results as RecordOfAny[],
            totalItems: typeof count === "number" ? count : undefined,
          }
        }
      }

      return { items: [] }
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

      if (typeof body.detail === "string") return { status, detail: body.detail }

      const violations: { propertyPath?: string; message?: string }[] = []
      readViolations(body, [], violations)
      if (violations.length > 0) return { status, violations }

      return status ? { status } : undefined
    },

    referencesAreIris: false,
  }
}

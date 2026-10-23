import {
  ApiDialectInterface,
  ApiErrorPayloadInterface,
  ApiOperationInterface,
  ApiRequestInterface,
  ApiViolationInterface,
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

export interface SpringDialectOptionsInterface {
  /** The field a record is addressed by in `/articles/{id}`. Defaults to `id`. */
  primaryKey?: string
  /** Rows per page when a list asks for none. Spring's own default is 20. */
  defaultItemsPerPage?: number
  /**
   * The verb an edit goes out with. `PUT` — the default — is what a
   * `@PutMapping` controller answers; Spring Data REST takes both.
   */
  updateMethod?: "PUT" | "PATCH"
}

/** A number, when the value is one — a total the API may leave out. */
function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/**
 * The rows of a `_embedded` object, whatever relation name Spring Data REST
 * gave them — `articles`, `blogPosts`… — which the dialect cannot guess from
 * the path.
 */
function readEmbedded(embedded: unknown): RecordOfAny[] | undefined {
  if (!embedded || typeof embedded !== "object") return undefined
  const list = Object.values(embedded as RecordOfAny).find(Array.isArray)
  return list as RecordOfAny[] | undefined
}

/** The last segment of a HAL `self` link — the id Spring Data REST hides. */
function readSelfIdentifier(item: RecordOfAny): string | undefined {
  const href = (item as any)?._links?.self?.href
  if (typeof href !== "string") return undefined
  // A templated link — `/articles/7{?projection}` — keeps its id before the brace.
  const segment = href
    .replace(/\{[^}]*\}/g, "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .split("/")
    .pop()
  return segment ? decodeURIComponent(segment) : undefined
}

/**
 * One field error, as Bean Validation reports it through Spring — `field` and
 * `defaultMessage` on a `@Valid` body, `property` and `message` on
 * Spring Data REST.
 */
function readViolation(entry: RecordOfAny): ApiViolationInterface {
  return {
    propertyPath: (entry?.field ?? entry?.property ?? entry?.propertyPath) as
      string | undefined,
    message: (entry?.defaultMessage ?? entry?.message) as string | undefined,
  }
}

/**
 * The dialect of a Spring Boot API.
 *
 * A collection is a bare array, a `Page` serialized as
 * `{ content, totalElements }`, the `{ content, page: { totalElements } }` of
 * `PagedModel`, or the HAL `{ _embedded, page }` of Spring Data REST. A page is
 * asked for as `?page=0&size=20` — 0-based, unlike the views — a sort as
 * `sort=title,desc`, and a filter is a plain query parameter. A record lives
 * at `/articles/{id}`; when Spring Data REST keeps the id out of the body, it
 * is read from the record's `self` link. A validation error is a
 * `ProblemDetail`, Spring Boot's default error body, or Spring Data REST's
 * `errors` list.
 */
export function springDialect({
  primaryKey = "id",
  defaultItemsPerPage = 20,
  updateMethod = "PUT",
}: SpringDialectOptionsInterface = {}): ApiDialectInterface {
  const collectionUrl = (path: string): string => {
    const url = isAbsoluteUrl(path) ? path : `/${path.replace(/^\/+/, "")}`
    return url.replace(/\/+$/, "")
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

    // `?status=a&status=b` — how Spring binds a `List<String>` parameter.
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
        Object.entries((value ?? {}) as RecordOfAny).forEach(([field, direction]) =>
          params.append(
            "sort",
            `${field},${String(direction).toLowerCase() === "desc" ? "desc" : "asc"}`
          )
        )
        return
      }
      appendFilter(params, key, value)
    })

    // Spring counts its pages from 0; the views count from 1.
    params.set("page", String(page - 1))
    params.set("size", String(itemsPerPage))

    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    // The key travels in the URL; the links are the server's, not the record's.
    delete body[primaryKey]
    delete body["@id"]
    delete body._links
    return body
  }

  const readIdentity = (item: RecordOfAny | null | undefined) => {
    if (!item) return undefined
    const value = item[primaryKey]
    if (value !== undefined && value !== null) return String(value)
    return readSelfIdentifier(item)
  }

  return {
    name: "spring",

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
          return {
            url: itemUrl(path, id),
            method: updateMethod,
            body: writeBody(item),
          }
        case "replaceItem":
          return { url: itemUrl(path, id), method: "PUT", body: writeBody(item) }
        case "removeItem":
          return { url: itemUrl(path, id), method: "DELETE" }
      }
    },

    readCollection(payload: unknown): CollectionPageInterface {
      if (Array.isArray(payload)) return { items: payload as RecordOfAny[] }
      if (!payload || typeof payload !== "object") return { items: [] }

      const body = payload as RecordOfAny
      const page = (body.page ?? {}) as RecordOfAny
      const totalItems = asNumber(body.totalElements) ?? asNumber(page.totalElements)

      if (Array.isArray(body.content)) {
        return { items: body.content as RecordOfAny[], totalItems }
      }

      // Spring Data REST leaves `_embedded` out altogether on an empty page.
      return { items: readEmbedded(body._embedded) ?? [], totalItems }
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
      const body = payload as RecordOfAny
      const errors = Array.isArray(body.errors)
        ? body.errors
        : Array.isArray(body.fieldErrors)
          ? body.fieldErrors
          : undefined

      const result: ApiErrorPayloadInterface = {
        status: asNumber(body.status) ?? status,
        // A ProblemDetail has a title; Spring Boot's default body an `error`.
        title: (body.title ?? body.error) as string | undefined,
        detail: (body.detail ?? body.message) as string | undefined,
      }
      if (errors) result.violations = errors.map(readViolation)

      return result
    },

    referencesAreIris: false,
  }
}

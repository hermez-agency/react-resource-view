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
  appendBracketParam,
  isAbsoluteUrl,
  joinPath,
  toQuerySuffix,
  withoutEmptyValues,
} from "@/api/queryString"

export interface StrapiDialectOptionsInterface {
  /**
   * Prefix of the REST routes. Defaults to `/api`, the Strapi default. A
   * resource whose `path` already carries it is left alone, so
   * `path: "/api/articles"` and `path: "articles"` both work.
   */
  apiPath?: string
  /**
   * Sent as `populate`. `"*"` — the default — brings the first level of
   * relations back, without which a list shows empty relation columns. Pass
   * `false` to leave the parameter out, or a field list to be precise.
   */
  populate?: string | string[] | false
  /**
   * The field Strapi addresses an entry by: `documentId` on v5, `id` on v4.
   * Defaults to v5, falling back to `id` on a record that has no `documentId`.
   */
  identifier?: "documentId" | "id"
  /**
   * The operator a plain filter value becomes. `$eq` is exact; `$containsi`
   * turns every text filter into a case-insensitive search, which is usually
   * what a filter bar means.
   */
  defaultOperator?: string
}

/**
 * Flattens one Strapi record.
 *
 * v4 wraps every entry in `{ id, attributes }` and every relation in
 * `{ data }`; v5 returns them flat. Both come out flat here, so the views —
 * and the forms — see `article.title` and `article.author.name` either way.
 */
export function flattenStrapiRecord(value: unknown): any {
  if (Array.isArray(value)) return value.map(flattenStrapiRecord)
  if (!value || typeof value !== "object") return value
  if (value instanceof Date) return value

  const record = value as RecordOfAny

  // A relation envelope: `{ data: … }`, `{ data: null }`, `{ data: [], meta }`.
  // Recognised only when `data` and `meta` are all there is — a record with a
  // `data` column of its own keeps it.
  const keys = Object.keys(record)
  if (
    keys.includes("data") &&
    keys.every((key) => key === "data" || key === "meta")
  ) {
    return flattenStrapiRecord(record.data)
  }

  const { attributes, ...rest } = record
  const flat: RecordOfAny =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? { ...rest, ...(attributes as RecordOfAny) }
      : { ...rest }

  Object.entries(flat).forEach(([key, entry]) => {
    if (entry && typeof entry === "object") flat[key] = flattenStrapiRecord(entry)
  })

  return flat
}

/**
 * The dialect of a Strapi REST API, v4 and v5 alike.
 *
 * Collections come back as `{ data, meta.pagination }`, pages are
 * `pagination[page]` and `pagination[pageSize]`, filters are
 * `filters[field][$operator]`, sorts are `sort[0]=field:asc`, and a write
 * carries its payload under `data`. Validation errors arrive in
 * `error.details.errors`, one entry per field.
 */
export function strapiDialect({
  apiPath = "/api",
  populate = "*",
  identifier = "documentId",
  defaultOperator = "$eq",
}: StrapiDialectOptionsInterface = {}): ApiDialectInterface {
  const collectionUrl = (path: string): string => {
    if (isAbsoluteUrl(path)) return path
    const normalized = `/${path.replace(/^\/+/, "")}`
    if (!apiPath || normalized.startsWith(`${apiPath}/`)) return normalized
    return joinPath(apiPath, normalized)
  }

  const itemUrl = (path: string, id: string | undefined): string =>
    id ? joinPath(collectionUrl(path), encodeURIComponent(id)) : collectionUrl(path)

  const appendFilter = (
    params: URLSearchParams,
    field: string,
    value: unknown
  ): void => {
    if (Array.isArray(value)) {
      appendBracketParam(params, `filters[${field}][$in]`, value)
      return
    }
    // `{ title: { $containsi: "hello" } }` — the caller spelled the operator
    // out, so it goes through untouched.
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const entries = Object.entries(value as RecordOfAny)
      const operatorGiven = entries.every(([key]) => key.startsWith("$"))
      if (operatorGiven) {
        entries.forEach(([operator, operand]) =>
          appendBracketParam(params, `filters[${field}][${operator}]`, operand)
        )
        return
      }
    }
    appendBracketParam(params, `filters[${field}][${defaultOperator}]`, value)
  }

  const buildQuery = (filter: RecordOfAny = {}): URLSearchParams => {
    const params = new URLSearchParams()
    const clean = withoutEmptyValues(filter)

    Object.entries(clean).forEach(([key, value]) => {
      if (key === ReservedFilterKeys.page) {
        params.set("pagination[page]", String(value))
        return
      }
      if (key === ReservedFilterKeys.itemsPerPage) {
        params.set("pagination[pageSize]", String(value))
        return
      }
      if (key === ReservedFilterKeys.order) {
        Object.entries((value ?? {}) as RecordOfAny).forEach(
          ([field, direction], index) =>
            params.set(`sort[${index}]`, `${field}:${String(direction)}`)
        )
        return
      }
      appendFilter(params, key, value)
    })

    if (populate !== false && !params.has("populate")) {
      appendBracketParam(params, "populate", populate)
    }

    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    delete body.id
    delete body.documentId
    delete body["@id"]
    return { data: body }
  }

  const readIdentity = (item: RecordOfAny | null | undefined) => {
    if (!item) return undefined
    const preferred = item[identifier]
    if (preferred !== undefined && preferred !== null) return String(preferred)
    const fallback = item.documentId ?? item.id
    return fallback === undefined || fallback === null ? undefined : String(fallback)
  }

  return {
    name: "strapi",

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
        case "getItem": {
          const params = new URLSearchParams()
          if (populate !== false) appendBracketParam(params, "populate", populate)
          return {
            url: `${itemUrl(path, id)}${toQuerySuffix(params)}`,
            method: "GET",
          }
        }
        case "createItem":
          return { url: collectionUrl(path), method: "POST", body: writeBody(item) }
        // Strapi updates with PUT and a partial payload; there is no PATCH
        // route, so a replace is the same request.
        case "updateItem":
        case "replaceItem":
          return { url: itemUrl(path, id), method: "PUT", body: writeBody(item) }
        case "removeItem":
          return { url: itemUrl(path, id), method: "DELETE" }
      }
    },

    readCollection(payload: unknown): CollectionPageInterface {
      if (Array.isArray(payload)) {
        return { items: payload.map(flattenStrapiRecord) }
      }

      const envelope = (payload ?? {}) as RecordOfAny
      const data = Array.isArray(envelope.data) ? envelope.data : []
      const pagination = (envelope.meta as RecordOfAny | undefined)?.pagination as
        RecordOfAny | undefined

      return {
        items: data.map(flattenStrapiRecord),
        totalItems: pagination?.total as number | undefined,
      }
    },

    readItem(payload: unknown): RecordOfAny | undefined {
      if (payload === null || payload === undefined) return undefined
      const envelope = payload as RecordOfAny
      const record = "data" in envelope ? envelope.data : envelope
      if (record === null || record === undefined) return undefined
      return flattenStrapiRecord(record) as RecordOfAny
    },

    getId: readIdentity,
    getIdentifier: readIdentity,

    normalizeError(payload, status): ApiErrorPayloadInterface | undefined {
      if (!payload || typeof payload !== "object") {
        return status ? { status } : undefined
      }
      const error = ((payload as RecordOfAny).error ?? payload) as RecordOfAny
      const details = error.details as RecordOfAny | undefined
      const errors = Array.isArray(details?.errors) ? details.errors : []

      return {
        status: (error.status as number | undefined) ?? status,
        title: error.name as string | undefined,
        detail: error.message as string | undefined,
        violations: errors.map((entry: RecordOfAny) => ({
          propertyPath: Array.isArray(entry.path)
            ? entry.path.join(".")
            : (entry.path as string | undefined),
          message: entry.message as string | undefined,
        })),
      }
    },

    referencesAreIris: false,
  }
}

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

export interface SupabaseDialectOptionsInterface {
  /**
   * The project's anon or service key. Supabase requires it on every request,
   * alongside the user's token when someone is signed in. A function is
   * accepted, for a key that only exists once the environment is read.
   */
  apiKey?: string | (() => string | undefined)
  /**
   * The table's primary key — how a row is addressed, PostgREST having no
   * `/table/{id}` route of its own. Defaults to `id`.
   */
  primaryKey?: string
  /** Prefix of the REST routes. Defaults to `/rest/v1`. */
  restPath?: string
  /**
   * The `select` sent with every read. `*` returns the row's own columns;
   * `*,author(*)` embeds a relation, the way Supabase joins.
   */
  select?: string
  /** Postgres schema, when the table is not in `public`. */
  schema?: string
  /**
   * The operator a plain string filter becomes. `eq` is exact; `ilike` makes
   * every text filter a case-insensitive search — pass it to turn the filter
   * bar into a search bar.
   */
  defaultTextOperator?: "eq" | "ilike" | "like"
  /** Rows per page when a list asks for none. */
  defaultItemsPerPage?: number
}

/** `0-24/573` — what PostgREST answers when asked to count. */
function readContentRangeTotal(headers?: Headers): number | undefined {
  const range = headers?.get("content-range")
  if (!range) return undefined
  const total = range.split("/")[1]
  if (!total || total === "*") return undefined
  const parsed = Number(total)
  return Number.isNaN(parsed) ? undefined : parsed
}

/** PostgREST reserves `,` `.` `(` `)` inside a filter value. */
function quoteOperand(value: unknown): string {
  const raw = String(value)
  return /[,.()"\s]/.test(raw) ? `"${raw.replace(/"/g, '\\"')}"` : raw
}

/**
 * The dialect of a Supabase table, served by PostgREST.
 *
 * A collection is a bare JSON array, the total arrives in `Content-Range` and
 * only when asked for, a page is `limit` and `offset`, a filter is
 * `field=operator.value`, and a row is addressed by a filter on its primary
 * key rather than by a path segment. Writes ask for the row back, so a create
 * returns what the database actually stored — defaults, triggers and all.
 */
export function supabaseDialect({
  apiKey,
  primaryKey = "id",
  restPath = "/rest/v1",
  select = "*",
  schema,
  defaultTextOperator = "eq",
  defaultItemsPerPage = 30,
}: SupabaseDialectOptionsInterface = {}): ApiDialectInterface {
  const readApiKey = (): string | undefined =>
    typeof apiKey === "function" ? apiKey() : apiKey

  const tableUrl = (path: string): string => {
    if (isAbsoluteUrl(path)) return path
    const normalized = `/${path.replace(/^\/+/, "")}`
    if (!restPath || normalized.startsWith(`${restPath}/`)) return normalized
    return joinPath(restPath, normalized)
  }

  const keyHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    const key = readApiKey()
    if (key) headers["apikey"] = key
    return headers
  }

  const readHeaders = (): Record<string, string> => {
    const headers = keyHeaders()
    if (schema) headers["Accept-Profile"] = schema
    return headers
  }

  const writeHeaders = (): Record<string, string> => {
    const headers = keyHeaders()
    if (schema) headers["Content-Profile"] = schema
    // Ask for the stored row back, and for one object rather than an array.
    headers["Prefer"] = "return=representation"
    headers["Accept"] = "application/vnd.pgrst.object+json"
    return headers
  }

  const appendFilter = (
    params: URLSearchParams,
    field: string,
    value: unknown
  ): void => {
    if (isEmptyFilterValue(value)) return

    if (Array.isArray(value)) {
      params.append(field, `in.(${value.map(quoteOperand).join(",")})`)
      return
    }

    // `{ createdAt: { gte: "2024-01-01" } }` — the caller chose the operator.
    if (value && typeof value === "object" && !(value instanceof Date)) {
      Object.entries(value as RecordOfAny).forEach(([operator, operand]) => {
        if (isEmptyFilterValue(operand)) return
        params.append(field, `${operator}.${quoteOperand(operand)}`)
      })
      return
    }

    if (typeof value === "string" && defaultTextOperator !== "eq") {
      params.append(field, `${defaultTextOperator}.*${value}*`)
      return
    }

    const operand = value instanceof Date ? value.toISOString() : value
    params.append(field, `eq.${quoteOperand(operand)}`)
  }

  const buildQuery = (filter: RecordOfAny = {}): URLSearchParams => {
    const params = new URLSearchParams()
    params.set("select", select)

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
          .map(([field, direction]) => `${field}.${String(direction)}`)
          .join(",")
        if (order) params.set("order", order)
        return
      }
      appendFilter(params, key, value)
    })

    params.set("limit", String(itemsPerPage))
    params.set("offset", String((page - 1) * itemsPerPage))

    return params
  }

  const identityQuery = (id: string | undefined): URLSearchParams => {
    const params = new URLSearchParams()
    params.set("select", select)
    if (id !== undefined) params.set(primaryKey, `eq.${quoteOperand(id)}`)
    return params
  }

  const writeBody = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    // The primary key travels in the URL; sending it again would rewrite it.
    delete body[primaryKey]
    delete body["@id"]
    return body
  }

  const readIdentity = (item: RecordOfAny | null | undefined) => {
    if (!item) return undefined
    const value = item[primaryKey] ?? item.id
    return value === undefined || value === null ? undefined : String(value)
  }

  return {
    name: "supabase",

    buildRequest({
      name,
      path,
      id,
      filter,
      item,
    }: ApiOperationInterface): ApiRequestInterface {
      const url = tableUrl(path)

      switch (name) {
        case "getCollection":
          return {
            url: `${url}${toQuerySuffix(buildQuery(filter))}`,
            method: "GET",
            // Without this PostgREST counts nothing and the list cannot page.
            headers: { ...readHeaders(), Prefer: "count=exact" },
          }
        case "getItem":
          return {
            url: `${url}${toQuerySuffix(identityQuery(id))}`,
            method: "GET",
            headers: {
              ...readHeaders(),
              Accept: "application/vnd.pgrst.object+json",
            },
          }
        case "createItem":
          return {
            url,
            method: "POST",
            body: writeBody(item),
            headers: writeHeaders(),
          }
        case "updateItem":
          return {
            url: `${url}${toQuerySuffix(identityQuery(id))}`,
            method: "PATCH",
            body: writeBody(item),
            headers: writeHeaders(),
          }
        case "replaceItem":
          return {
            url: `${url}${toQuerySuffix(identityQuery(id))}`,
            method: "PUT",
            body: { ...writeBody(item), [primaryKey]: id },
            headers: writeHeaders(),
          }
        case "removeItem":
          return {
            url: `${url}${toQuerySuffix(identityQuery(id))}`,
            method: "DELETE",
            headers: { ...writeHeaders(), Accept: "application/json" },
          }
      }
    },

    readCollection(
      payload: unknown,
      meta?: ApiResponseMetaInterface
    ): CollectionPageInterface {
      const items = Array.isArray(payload) ? (payload as RecordOfAny[]) : []
      return { items, totalItems: readContentRangeTotal(meta?.headers) }
    },

    readItem(payload: unknown): RecordOfAny | undefined {
      if (Array.isArray(payload)) return payload[0] as RecordOfAny | undefined
      return (payload ?? undefined) as RecordOfAny | undefined
    },

    getId: readIdentity,
    getIdentifier: readIdentity,

    normalizeError(payload, status): ApiErrorPayloadInterface | undefined {
      if (!payload || typeof payload !== "object") {
        return status ? { status } : undefined
      }
      const error = payload as RecordOfAny
      const detail = [error.message, error.details, error.hint]
        .filter((part): part is string => typeof part === "string" && part !== "")
        .join(" — ")

      return {
        status,
        title: error.code as string | undefined,
        detail: detail || undefined,
        // PostgREST reports a constraint, not a field: there is nothing to
        // pin on one input of the form.
        violations: [],
      }
    },

    referencesAreIris: false,

    exportRequest(path, filter) {
      const params = buildQuery(filter)
      // The export covers every filtered row, not just the page on screen.
      params.delete("limit")
      params.delete("offset")
      return {
        url: `${tableUrl(path)}${toQuerySuffix(params)}`,
        method: "GET",
        headers: { ...readHeaders(), Accept: "text/csv" },
      }
    },
  }
}

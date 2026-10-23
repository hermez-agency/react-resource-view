import { RecordOfAny } from "@/internal/type/RecordOfAny"
import type { RealtimeSubscribe } from "@/api/realtime"

/**
 * How this package talks to one family of API.
 *
 * The views know a resource has a path, rows, pages and filters; they know
 * nothing of the shape a given backend gives those. A dialect holds that
 * knowledge — the URL an item lives at, the query string a filter becomes, the
 * envelope a collection comes back in, where the validation errors hide — so
 * the same declared resource renders against API Platform, Strapi, Supabase or
 * FastAPI.
 *
 * Several ship with the package: {@link jsonLdDialect}, {@link strapiDialect},
 * {@link supabaseDialect}, {@link fastapiDialect} and the configurable
 * {@link restDialect}. Anything else is one object away.
 */

/** The operations a repository performs, named as the resource names them. */
export type ApiOperationName =
  | "getCollection"
  | "getItem"
  | "createItem"
  | "updateItem"
  | "replaceItem"
  | "removeItem"

export interface ApiOperationInterface {
  name: ApiOperationName
  /** The resource's `path`, as declared on the resource. */
  path: string
  /** Identity of the item, for the operations addressing one. */
  id?: string
  /**
   * The list's filters, in the package's own vocabulary: field names, plus the
   * reserved keys of {@link ReservedFilterKeys}. Translating them is the
   * dialect's job.
   */
  filter?: RecordOfAny
  /** The record being written, for create, update and replace. */
  item?: RecordOfAny
}

/** One HTTP request, described rather than sent. */
export interface ApiRequestInterface {
  /** Path or absolute URL, query string included. */
  url: string
  method: string
  body?: unknown
  headers?: Record<string, string>
}

/** One field-level validation error, whatever the API called it. */
export interface ApiViolationInterface {
  propertyPath?: string
  message?: string
}

/** A failed request, read into the one shape the forms understand. */
export interface ApiErrorPayloadInterface {
  status?: number
  title?: string
  detail?: string
  violations?: ApiViolationInterface[]
}

/** One page of a collection, whatever envelope it arrived in. */
export interface CollectionPageInterface<T = RecordOfAny> {
  items: T[]
  /**
   * How many rows match the query across every page, when the API says. The
   * pagination hides itself when it does not.
   */
  totalItems?: number
  /**
   * What to ask for to get the page after this one: a cursor, or the URL of
   * the next page. `null` says this is the last page; `undefined`, that the
   * API gives no such thing and the list pages by number.
   */
  nextCursor?: string | null
}

/** What a dialect may read off the response beyond its body. */
export interface ApiResponseMetaInterface {
  headers?: Headers
  status?: number
}

/**
 * Filter keys the package reserves for itself. Everything else in a filter is
 * a field of the resource.
 */
export const ReservedFilterKeys = {
  /** 1-based page number. */
  page: "page",
  /** Rows per page. */
  itemsPerPage: "itemsPerPage",
  /** `{ createdAt: "desc" }` — the sort, field by field. */
  order: "order",
  /** Where the next page starts, for an API that pages by cursor. */
  cursor: "cursor",
} as const

export interface ApiDialectInterface {
  /** Identifier, shown in errors and used to tell the dialects apart. */
  name: string

  /** Describes the request one operation needs. */
  buildRequest: (operation: ApiOperationInterface) => ApiRequestInterface

  /** Reads a list response — the rows, and the total when the API reports one. */
  readCollection: (
    payload: unknown,
    meta?: ApiResponseMetaInterface
  ) => CollectionPageInterface

  /** Reads a single-item response out of its envelope. */
  readItem: (payload: unknown) => RecordOfAny | undefined

  /** The item's identity, as the rest of the application refers to it. */
  getId: (item: RecordOfAny | null | undefined) => string | undefined

  /**
   * The identity in the short form a URL segment takes — the numeric id behind
   * an IRI, Strapi's `documentId`, Supabase's primary key.
   */
  getIdentifier: (item: RecordOfAny | null | undefined) => string | undefined

  /** Reads a failed response into {@link ApiErrorPayloadInterface}. */
  normalizeError: (
    payload: unknown,
    status?: number
  ) => ApiErrorPayloadInterface | undefined

  /**
   * Whether a string field holding a relation is an API IRI worth resolving —
   * true of JSON-LD, false of an API that inlines or numbers its relations.
   */
  referencesAreIris: boolean

  /** The CSV export request, when the backend can produce one. */
  exportRequest?: (
    path: string,
    filter: RecordOfAny
  ) => ApiRequestInterface | undefined

  /**
   * The realtime topic a resource publishes on — a Mercure topic for
   * API Platform, nothing for a backend the package cannot subscribe to.
   */
  realtimeTopic?: (path: string | undefined) => string | undefined

  /**
   * Replaces the Mercure channel for a backend with its own push — the
   * resource's `realtime.subscribe` still comes first.
   */
  realtimeSubscribe?: (path: string | undefined) => RealtimeSubscribe | undefined
}

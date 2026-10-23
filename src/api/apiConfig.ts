import { ApiDialectInterface } from "@/api/apiDialectInterface"
import { jsonLdDialect } from "@/api/dialect/jsonLdDialect"
import { configureClient, getClientConfig } from "jsonld-api-client"

/**
 * What the repositories need from the application hosting them.
 *
 * The package renders CRUD views over an API; which API, and how that API
 * spells a page, a filter or a validation error, comes from here — set once at
 * startup through {@link configureApi}.
 *
 * ```ts
 * import { configureApi, strapiDialect } from "react-resource-view"
 *
 * configureApi({
 *   baseUrl: "https://cms.example.com",
 *   getAuthToken: () => getUserToken(),
 *   dialect: strapiDialect(),
 * })
 * ```
 *
 * Left alone, the dialect is JSON-LD and the connection settings fall back to
 * those of `jsonld-api-client`, so an application already talking to
 * API Platform needs none of this.
 */
export interface ApiConfigInterface {
  /** Root URL of the API. Relative request paths resolve against it. */
  baseUrl: string
  /** Bearer token attached to every request, or `undefined` when nobody is signed in. */
  getAuthToken: () => string | undefined
  /** Extra headers on every request — a Supabase `apikey`, a tenant header. */
  getHeaders: () => Record<string, string>
  /** How the API spells its URLs, its pages, its filters and its errors. */
  dialect: ApiDialectInterface
  /** The fetch implementation. Injected in tests; the global one otherwise. */
  fetch: typeof fetch
}

let overrides: Partial<ApiConfigInterface> = {}

const defaultDialect = jsonLdDialect()

const noToken = () => undefined
const noHeaders = () => ({})

/**
 * Settings of `jsonld-api-client`, when the application configured that one.
 *
 * Read defensively: an application on Strapi or Supabase never calls
 * `configureClient`, and must not trip over its absence.
 */
function legacyClientConfig(): {
  baseUrl?: string
  getAuthToken?: () => string | undefined
} {
  try {
    return getClientConfig() ?? {}
  } catch {
    return {}
  }
}

function defaultBaseUrl(): string {
  const legacy = legacyClientConfig().baseUrl
  if (legacy) return legacy
  return typeof window !== "undefined" ? window.location.origin : ""
}

/** The settings in force, defaults and fallbacks resolved. */
export function getApiConfig(): ApiConfigInterface {
  return {
    baseUrl: overrides.baseUrl ?? defaultBaseUrl(),
    getAuthToken:
      overrides.getAuthToken ?? legacyClientConfig().getAuthToken ?? noToken,
    getHeaders: overrides.getHeaders ?? noHeaders,
    dialect: overrides.dialect ?? defaultDialect,
    fetch: overrides.fetch ?? ((...args) => globalThis.fetch(...args)),
  }
}

/**
 * Wires the API into the resources. Call it once at startup; resources read the
 * dialect at each request, so it does not matter whether they are declared
 * before or after.
 */
export function configureApi(config: Partial<ApiConfigInterface>): void {
  overrides = { ...overrides, ...config }
  bridgeToClient(config)
}

/** Restores the defaults. Meant for tests. */
export function resetApiConfig(): void {
  overrides = {}
  if (clientBeforeBridge) configureClient(clientBeforeBridge)
  clientBeforeBridge = undefined
}

let clientBeforeBridge:
  { baseUrl: string; getAuthToken: () => string | undefined } | undefined

/**
 * Mercure and its topics are built by `jsonld-api-client` from its own
 * settings: the base URL and the token of `configureApi` have to reach it too,
 * or the hub is looked for on another host than the API.
 */
function bridgeToClient({
  baseUrl,
  getAuthToken,
}: Partial<ApiConfigInterface>): void {
  if (baseUrl === undefined && getAuthToken === undefined) return
  if (!clientBeforeBridge) {
    const { baseUrl: before, getAuthToken: tokenBefore } = getClientConfig()
    clientBeforeBridge = { baseUrl: before, getAuthToken: tokenBefore }
  }
  configureClient({
    ...(baseUrl !== undefined && { baseUrl }),
    ...(getAuthToken !== undefined && { getAuthToken }),
  })
}

/**
 * Whether `configureApi` set a connection setting the OpenAPI client of
 * `jsonld-api-client` has no way to take: it is created once, with the global
 * `fetch` and the base URL of its own configuration, and only reads the token
 * and the scope afterwards.
 */
export function hasClientIncompatibleSettings(): boolean {
  return (
    overrides.baseUrl !== undefined ||
    overrides.fetch !== undefined ||
    overrides.getHeaders !== undefined
  )
}

/** The dialect in force, unless a resource carries one of its own. */
export function getApiDialect(): ApiDialectInterface {
  return getApiConfig().dialect
}

/**
 * The dialect a resource speaks: its own when it declares one — an application
 * reading two backends at once — the configured one otherwise.
 */
export function resolveDialect(
  resource?: {
    dialect?: ApiDialectInterface
  } | null
): ApiDialectInterface {
  return resource?.dialect ?? getApiDialect()
}

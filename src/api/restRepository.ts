import {
  ApiDialectInterface,
  ApiOperationInterface,
  ApiRequestInterface,
} from "@/api/apiDialectInterface"
import { getApiConfig, resolveDialect } from "@/api/apiConfig"
import { ApiRequestError } from "@/api/apiRequestError"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { isAbsoluteUrl, joinPath } from "@/api/queryString"
import { createResourceCollection } from "@/api/collectionShape"
import { AsyncRepositoryInterface } from "jsonld-repository"
import { IdAbleInterface, JsonLdCollection } from "jsonld-item"

/**
 * A repository over any REST API, the dialect doing the talking.
 *
 * It owns nothing but the mechanics — resolve the URL, carry the credentials,
 * parse the body, throw on a failure. Every decision that differs between
 * backends is asked of the {@link ApiDialectInterface}, so one implementation
 * serves Strapi, Supabase and whatever comes next.
 */
export interface RestRepositoryOptionsInterface {
  /** The resource's path: a route for Strapi, a table for Supabase. */
  path: string
  /** The dialect to speak. Defaults to the configured one. */
  dialect?: ApiDialectInterface
}

/** Absolute URL of a request whose dialect gave a path. */
export function resolveRequestUrl(url: string, baseUrl: string): string {
  if (isAbsoluteUrl(url)) return url
  if (!baseUrl) return url
  return joinPath(baseUrl, url)
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get("content-type") ?? ""
  const text = await response.text()
  if (!text) return undefined
  if (contentType.includes("json") || text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

export function restRepository<T extends IdAbleInterface = IdAbleInterface>({
  path,
  dialect: dialectOption,
}: RestRepositoryOptionsInterface): AsyncRepositoryInterface<T> {
  const dialect = (): ApiDialectInterface => dialectOption ?? resolveDialect()

  const send = async (
    request: ApiRequestInterface
  ): Promise<{ payload: unknown; response: Response }> => {
    const config = getApiConfig()
    const url = resolveRequestUrl(request.url, config.baseUrl)

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...config.getHeaders(),
      ...(request.headers ?? {}),
    }

    const token = config.getAuthToken()
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`
    }

    if (request.body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json"
    }

    const response = await config.fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    })

    const payload = await readBody(response)

    if (!response.ok) {
      throw new ApiRequestError({ status: response.status, url, payload })
    }

    return { payload, response }
  }

  const run = (operation: ApiOperationInterface) =>
    send(dialect().buildRequest(operation))

  // A dialect reads the identity from the record's own key; a bare `{ id }`
  // lookup (the id of the URL) has no such key, so the id travels as given.
  const identityOf = (params: IdAbleInterface | RecordOfAny): string | undefined => {
    const identity = dialect().getIdentifier(params as RecordOfAny)
    if (identity !== undefined) return identity
    const id = (params as RecordOfAny | undefined)?.id
    return id === undefined || id === null ? undefined : String(id)
  }

  return {
    getCollection: async (filter) => {
      const { payload, response } = await run({
        name: "getCollection",
        path,
        filter: filter as RecordOfAny,
      })

      const page = dialect().readCollection(payload, {
        headers: response.headers,
        status: response.status,
      })

      // Normalized on the way in, so every view — and every dialect asked to
      // read it again on the next render — sees the same envelope.
      return {
        data: createResourceCollection<T>({
          id: path,
          items: page.items as T[],
          totalItems: page.totalItems,
        }) as JsonLdCollection<T>,
      }
    },

    getItem: async (params) => {
      const { payload } = await run({
        name: "getItem",
        path,
        id: identityOf(params),
      })
      return { data: dialect().readItem(payload) as T }
    },

    createItem: async (params) => {
      const { payload } = await run({
        name: "createItem",
        path,
        item: params as RecordOfAny,
      })
      return { data: dialect().readItem(payload) as T }
    },

    updateItem: async (params) => {
      const { payload } = await run({
        name: "updateItem",
        path,
        id: identityOf(params as RecordOfAny),
        item: params as RecordOfAny,
      })
      return { data: dialect().readItem(payload) as T }
    },

    replaceItem: async (params) => {
      const { payload } = await run({
        name: "replaceItem",
        path,
        id: identityOf(params as RecordOfAny),
        item: params as RecordOfAny,
      })
      return { data: dialect().readItem(payload) as T }
    },

    removeItem: async (params) => {
      const { payload } = await run({
        name: "removeItem",
        path,
        id: identityOf(params),
      })
      return { data: payload }
    },
  }
}

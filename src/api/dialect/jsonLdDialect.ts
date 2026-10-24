import {
  ApiDialectInterface,
  ApiErrorPayloadInterface,
  ApiOperationInterface,
  ApiRequestInterface,
  CollectionPageInterface,
} from "@/api/apiDialectInterface"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import {
  appendBracketParam,
  joinPath,
  toQuerySuffix,
  withoutEmptyValues,
} from "@/api/queryString"
import { getIdFromIri, isApiIri } from "jsonld-item"
import { buildTopic, getClientConfig } from "jsonld-api-client"

export interface JsonLdDialectOptionsInterface {
  /**
   * Content type sent on an update. API Platform expects
   * `application/merge-patch+json` on PATCH; a plain JSON:API does not.
   */
  patchContentType?: string
}

/**
 * The dialect of a JSON-LD / Hydra API — API Platform, and anything following
 * its conventions.
 *
 * A collection is `{ member, totalItems }`, an item carries its own IRI in
 * `@id`, relations are IRIs, pages are `page` and `itemsPerPage`, and a 422
 * lists its `violations` field by field. This is what the package assumed
 * before it learned any other dialect, so it stays the default.
 */
export function jsonLdDialect({
  patchContentType = "application/merge-patch+json",
}: JsonLdDialectOptionsInterface = {}): ApiDialectInterface {
  const itemUrl = (path: string, id: string | undefined): string => {
    if (!id) return path
    // A JSON-LD item knows where it lives: an IRI is already the URL. An
    // absolute URL is not: it would carry the credentials to another host.
    if (isApiIri(id)) return id
    return joinPath(path, encodeURIComponent(id))
  }

  const buildQuery = (filter: RecordOfAny = {}): URLSearchParams => {
    const params = new URLSearchParams()
    Object.entries(withoutEmptyValues(filter)).forEach(([key, value]) =>
      appendBracketParam(params, key, value)
    )
    return params
  }

  const withoutIdentity = (item: RecordOfAny = {}): RecordOfAny => {
    const body = { ...item }
    delete body["@id"]
    delete body["id"]
    return body
  }

  return {
    name: "json-ld",

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
            url: `${path}${toQuerySuffix(buildQuery(filter))}`,
            method: "GET",
          }
        case "getItem":
          return { url: itemUrl(path, id), method: "GET" }
        case "createItem":
          return { url: path, method: "POST", body: withoutIdentity(item) }
        case "updateItem":
          return {
            url: itemUrl(path, id),
            method: "PATCH",
            body: withoutIdentity(item),
            headers: { "Content-Type": patchContentType },
          }
        case "replaceItem":
          return {
            url: itemUrl(path, id),
            method: "PUT",
            body: withoutIdentity(item),
          }
        case "removeItem":
          return { url: itemUrl(path, id), method: "DELETE" }
      }
    },

    readCollection(payload: unknown): CollectionPageInterface {
      const collection = (payload ?? {}) as RecordOfAny
      const items = (collection.member ??
        collection["hydra:member"] ??
        collection.collection ??
        []) as RecordOfAny[]

      return {
        items: Array.isArray(items) ? items : [],
        totalItems: (collection.totalItems ?? collection["hydra:totalItems"]) as
          number | undefined,
      }
    },

    readItem(payload: unknown): RecordOfAny | undefined {
      return (payload ?? undefined) as RecordOfAny | undefined
    },

    getId(item) {
      if (!item) return undefined
      const id = item["@id"] ?? item.id
      return id === undefined || id === null ? undefined : String(id)
    },

    getIdentifier(item) {
      if (!item) return undefined
      const iri = item["@id"] as string | undefined
      if (iri) return getIdFromIri(iri)
      return item.id === undefined || item.id === null ? undefined : String(item.id)
    },

    normalizeError(payload, status): ApiErrorPayloadInterface | undefined {
      if (!payload || typeof payload !== "object") {
        return status ? { status } : undefined
      }
      const error = payload as RecordOfAny
      return {
        status: (error.status as number | undefined) ?? status,
        title: (error.title ?? error["hydra:title"]) as string | undefined,
        detail: (error.detail ?? error.description ?? error["hydra:description"]) as
          string | undefined,
        violations: (error.violations ??
          error["hydra:violations"]) as ApiErrorPayloadInterface["violations"],
      }
    },

    referencesAreIris: true,

    exportRequest(path, filter) {
      const params = buildQuery(filter)
      // The export covers every filtered row, not just the page on screen.
      params.set("pagination", "false")
      const headers: Record<string, string> = { Accept: "text/csv" }
      const scope = getClientConfig().getScope?.()
      if (scope) headers["X-Scope"] = scope
      return { url: `${path}.csv${toQuerySuffix(params)}`, method: "GET", headers }
    },

    realtimeTopic(path) {
      return buildTopic(path)
    },
  }
}

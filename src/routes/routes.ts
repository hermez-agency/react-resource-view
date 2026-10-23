import { ActionList } from "react-data-form"
import { ViewResource } from "@/ViewResource"
import { FilterInterface } from "@/views/list/filter/useFilter"
import { decodeQuery, encodeQuery } from "@/internal/url/urlEncoder"
import { JsonLdIri } from "jsonld-item"
import { ViewResourceContextParams } from "@/ViewResourceContext"
import { getCurrentScope } from "@/scope/scope"
import { getPorts } from "@/ports"
import { isApiIri } from "jsonld-item"
import { getIdFromIri } from "jsonld-item"
import { resourceRegistered } from "resource-registry"

interface GenerateLinkParamsFromUri {
  resourceAction?: ActionList
  iri: JsonLdIri
  scope?: string
}

function extractResourceFromIri(iri: string): ViewResourceContextParams {
  const parts = iri.split("/")

  return {
    id: getIdFromIri(iri) as string,
    resourceId: parts[2] as string,
    resourceAction: ActionList.update,
  }
}

export function generateLinkFromIri({
  resourceAction,
  iri,
  scope,
}: GenerateLinkParamsFromUri): string | undefined {
  const resourceArg = extractResourceFromIri(iri)
  if (scope) {
    resourceArg.scope = scope
  }

  if (resourceAction) {
    resourceArg.resourceAction = resourceAction
  }

  if (resourceArg.resourceId) {
    return generateLink(resourceArg as Required<ViewResourceContextParams>)
  }

  return undefined
}

function findResourceByPath(path: string, scope?: string): ViewResource | undefined {
  const matches = (Object.values(resourceRegistered) as ViewResource[]).filter(
    (resource) => resource.path === path
  )

  if (matches.length === 0) return undefined

  // One path may be served by several scope-specific variants, so the current
  // scope's is preferred.
  return matches.find((resource) => resource.scope === scope) ?? matches[0]
}

/**
 * Convertit une URI d'API (ex. une `notification.uri`) en lien de navigation
 * interne. L'URI peut pointer vers une collection (`/api/appointments`) ou un
 * item (`/api/appointments/{id}`). On retrouve la resource view dont le `path`
 * matches, then builds the link within the current scope.
 */
export function generateLinkFromUri(
  uri: string,
  scope?: string
): string | undefined {
  if (!isApiIri(uri)) return uri

  const currentScope = scope ?? getCurrentScope()

  // 1. The URI matches a collection path directly, so it is a list view.
  const collectionResource = findResourceByPath(uri, currentScope)
  if (collectionResource) {
    return generateLink({
      resourceId: collectionResource["@id"],
      resourceAction: ActionList.list,
      scope: currentScope,
    })
  }

  // 2. Sinon on retire le dernier segment (l'id) et on cherche le path de base.
  const basePath = uri.replace(/\/[^/]+$/, "")
  const itemResource = findResourceByPath(basePath, currentScope)
  if (itemResource) {
    return generateLink({
      resourceId: itemResource["@id"],
      resourceAction: ActionList.read,
      id: getIdFromIri(uri),
      scope: currentScope,
    })
  }

  return undefined
}

export function encodeIri(path: string | number): string {
  // An identifier may be a number — Strapi's `id`, a Supabase primary key.
  const value = String(path)
  if (value.startsWith("/")) {
    return getIdFromIri(value)
  }
  return encodeURIComponent(value)
}

export function decodeIri(key: string): string {
  return decodeURIComponent(key)
}

export function generateLinkByResource({
  resource,
  resourceAction,
  filter,
  defaultData,
  id,
  viewVariantId,
}: {
  resource: ViewResource
  resourceAction: ActionList
  filter?: FilterInterface
  defaultData?: Record<string, any>
  id?: string | undefined
  /** The layout on screen, so a link built from inside a list keeps it. */
  viewVariantId?: string
}): string {
  return generateLink({
    resourceId: resource["@id"],
    resourceAction,
    scope: resource.scope,
    filter: filter,
    defaultData,
    id,
    viewVariantId,
  })
}

/**
 * Serialises a view context into the ordered segments both routing modes share.
 *
 * The order is `{scope}/{resourceId}/{action}/{id}/{subResource}` followed by
 * the child view's own three segments, so one parser reads back either mode.
 */
function buildSegments({
  resourceId,
  resourceAction,
  id,
  scope,
  subResource,
  childViewResource,
  resource,
}: ViewResourceContextParams): string[] {
  const currentResourceId = resource
    ? encodeIri(resource["@id"])
    : resourceId
      ? encodeIri(resourceId)
      : undefined

  const args: (string | undefined)[] = [
    scope ?? getCurrentScope() ?? "",
    currentResourceId,
    resourceAction ?? undefined,
    id ? encodeIri(id) : undefined,
    subResource ? encodeIri(subResource) : undefined,
  ]

  if (childViewResource) {
    args.push(
      childViewResource.resource
        ? encodeIri(childViewResource.resource["@id"])
        : childViewResource.resourceId
          ? encodeIri(childViewResource.resourceId)
          : undefined
    )
    args.push(childViewResource.resourceAction ?? undefined)
    args.push(childViewResource.id ? encodeIri(childViewResource.id) : undefined)
  }

  return args.filter((e): e is string => Boolean(e))
}

/** The query parameters carried alongside the segments, in either mode. */
function buildQueryParts({
  resourceAction,
  filter,
  childViewResource,
  defaultData,
  viewVariantId,
}: ViewResourceContextParams): string[] {
  const parts: string[] = []
  if (filter) parts.push("filter=" + encodeQuery(filter))
  // The chosen layout travels with the link. Without it, any navigation from
  // inside a list — the split view selecting a row on every click — lands on a
  // URL that says nothing about the variant, and the view falls back to the
  // first one declared.
  if (viewVariantId) parts.push("variant=" + encodeURIComponent(viewVariantId))

  const isCreateLink =
    resourceAction === ActionList.create ||
    childViewResource?.resourceAction === ActionList.create
  if (defaultData && isCreateLink) {
    parts.push("defaultData=" + encodeQuery(defaultData))
  }

  return parts
}

/**
 * Builds the URL for a view context, in whichever routing mode is configured.
 *
 * In `path` mode — the default — the context lives in the path:
 * `/admin/articles/update/42?filter=…`
 *
 * In `query` mode it lives entirely in the query string:
 * `/docs.html?view=admin/articles/update/42&filter=…`
 *
 * The second exists for static hosting, where a deep path has no server to
 * answer it and returns a 404, and for embedding the views in a page whose
 * path is not yours to control.
 */
export function generateLink(params: ViewResourceContextParams): string {
  const segments = buildSegments(params)
  const queryParts = buildQueryParts(params)
  const { mode, param, basePath } = getPorts().routing

  if (mode === "query") {
    const query = [
      ...(segments.length ? [`${param}=${segments.join("/")}`] : []),
      ...queryParts,
    ]
    return basePath + (query.length ? "?" + query.join("&") : "")
  }

  let finalRoute = segments.join("/")
  if (queryParts.length > 0) finalRoute += "?" + queryParts.join("&")

  return "/" + finalRoute
}

/**
 * Reads a URL back into a view context, in whichever mode it was written.
 *
 * A URL carrying the routing parameter is read as `query` mode whatever the
 * configuration says, so a link shared from a statically hosted page keeps
 * working.
 */
export function parseLink(url: string): ViewResourceContextParams {
  const [pathPart, queryPart] = url.replace(/^\//, "").split("?")
  const searchParamsForMode = new URLSearchParams(queryPart ?? "")
  const routingParam = getPorts().routing.param
  const fromQuery = searchParamsForMode.get(routingParam)

  const segments = (fromQuery ?? pathPart).split("/").filter(Boolean)

  const [scope, resourceId, resourceAction, id, ...rest] = segments

  const params: ViewResourceContextParams = {}

  if (scope) params.scope = scope
  if (resourceId) params.resourceId = decodeIri(resourceId)
  if (resourceAction) params.resourceAction = resourceAction as ActionList
  if (id) params.id = decodeIri(id)

  const actionValues = Object.values(ActionList) as string[]

  // A view without an id — a list, a page of one's own — has the child view
  // drawn over it start right after the action:
  // .../{resourceId}/list/{childResourceId}/{childAction}/{childId}
  // What was read as the id is the child's resource.
  if (id && rest[0] && actionValues.includes(rest[0])) {
    delete params.id
    const child: ViewResourceContextParams = {
      resourceId: decodeIri(id),
      resourceAction: rest[0] as ActionList,
    }
    if (rest[1]) child.id = decodeIri(rest[1])
    params.childViewResource = child
  } else if (rest.length === 1) {
    params.subResource = decodeIri(rest[0])
  } else if (rest.length >= 2) {
    // The childAction segment disambiguates:
    // .../{childResourceId}/{childAction}/{childId}
    // .../{subResource}/{childResourceId}/{childAction}/{childId}
    const hasSubResource = !actionValues.includes(rest[1])
    if (hasSubResource) {
      params.subResource = decodeIri(rest[0])
    }

    const [childResourceId, childAction, childId] = hasSubResource
      ? rest.slice(1)
      : rest
    const child: ViewResourceContextParams = {}
    if (childResourceId) child.resourceId = decodeIri(childResourceId)
    if (childAction) child.resourceAction = childAction as ActionList
    if (childId) child.id = decodeIri(childId)
    params.childViewResource = child
  }

  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart)
    const filterRaw = searchParams.get("filter")
    const dataRaw = searchParams.get("defaultData")
    const variantRaw = searchParams.get("variant")
    const filter = filterRaw ? decodeQuery(filterRaw) : undefined
    if (filter) params.filter = filter as FilterInterface
    if (variantRaw) params.viewVariantId = variantRaw
    const decodedData = dataRaw ? decodeQuery(dataRaw) : undefined
    if (decodedData) {
      // When the target is a sub-resource being created, defaultData belongs
      // to the child rather than to the view containing it.
      if (params.childViewResource?.resourceAction === ActionList.create) {
        params.childViewResource.defaultData = decodedData
      } else {
        params.defaultData = decodedData
      }
    }
  }

  return params
}

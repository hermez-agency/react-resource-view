import { generateLink, parseLink } from "@/routes/routes"
import { ActionList } from "react-data-form"
import { getIdFromIri } from "jsonld-item"
import { FC } from "react"
import { IconType } from "@/ViewResource"
import { getCurrentScope } from "@/scope/scope"
import { getPorts } from "@/ports"
import { ViewResourceContextParams } from "@/ViewResourceContext"

export interface MenuItemInterface {
  name: string
  icon?: IconType
  href?: string
  items?: MenuItemInterface[]
  hidden?: boolean
  isSelected?: boolean
  component?: FC<{ menuItem: MenuItemInterface }>
  /**
   * Drawn at the end of the entry, in the sidebar — a count of what waits
   * there. A component, so it can read what it counts from a hook, and the
   * entry stays the package's own: its link, its state, its shape.
   */
  badge?: FC<{ menuItem: MenuItemInterface }>
  priority?: number
  /**
   * When true and the current page matches one of this entry's `items`, the
   * header renders a sub-navigation bar
   * so the reader can move between those sibling pages.
   */
  subNavigation?: boolean
  /**
   * Evaluated on render: when true the item is locked — a badge with a padlock
   * is shown and clicking it redirects to the subscription page
   * instead of the usual destination.
   */
  locked?: () => boolean
}

export function createItemMenuWithResource({
  resource,
  resourceId: parentResourceId,
  scope: currentScope,
  resourceAction: currentResourceAction,
  id,
}: ViewResourceContextParams): MenuItemInterface {
  if (!parentResourceId && !resource) {
    throw new Error("resourceId or resource is required")
  }

  const name = resource?.name ?? (resource?.["@id"] as string)
  const resourceId = parentResourceId ?? (resource?.["@id"] as string)
  const scope = currentScope ?? resource?.scope ?? getCurrentScope()
  const resourceAction = currentResourceAction ?? ActionList.list

  return {
    icon: resource?.icon,
    name: getIdFromIri(name),
    href: generateLink({
      resourceId,
      scope,
      resourceAction,
      id,
    }),
  }
}

/**
 * Whether a menu entry points at what is currently on screen.
 *
 * In query mode the context lives in the query string, so comparing the
 * pathname alone would match every entry — or none.
 *
 * Browser-only: it reads the address bar directly. On a server it reports
 * every entry as inactive, which renders markup the browser then disagrees
 * with. Prefer {@link useIsActiveItemMenu}, which asks the router instead and
 * therefore answers the same on both sides.
 */
export function isActiveItemMenu(item: MenuItemInterface) {
  if (!item.href) return false
  if (typeof window === "undefined") return false

  return matchesCurrent(item.href, window.location.pathname, window.location.search)
}

/**
 * The same test, resolved through the navigation port.
 *
 * A router knows the current location while rendering on a server; `window`
 * does not exist there. Returns a predicate rather than a boolean so a menu
 * can test each of its entries — a hook cannot be called inside a loop.
 *
 * `defaultView` is what is on screen when the URL names no resource — a scope
 * opened bare, whose `defaultViewResourceContextParams` pick the page. Without
 * it, the entry for that page stays dark until the reader clicks on it, though
 * nothing on screen changes.
 */
export function useIsActiveItemMenu(
  defaultView?: ViewResourceContextParams
): (item: MenuItemInterface) => boolean {
  const { pathname, searchStr } = getPorts().navigation.useLocation()

  return (item) =>
    Boolean(item.href) &&
    matchesCurrent(item.href!, pathname, searchStr, defaultView)
}

function matchesCurrent(
  href: string,
  pathname: string,
  searchStr: string,
  defaultView?: ViewResourceContextParams
): boolean {
  const { mode, param } = getPorts().routing
  const current = mode === "query" ? pathname + searchStr : pathname

  // An entry pointing anywhere else than at a view — a link out of the scope,
  // a page of the host application — has no context to read: the string it
  // stands for is all there is to compare.
  if (mode === "query" && !readRoutingParam(href, param)) {
    return current.startsWith(href)
  }

  return matchesContext(parseLink(href), readCurrentView(current, defaultView))
}

/**
 * The view context the current URL stands for, the scope's default view
 * filling in when the URL names no resource.
 */
function readCurrentView(
  current: string,
  defaultView?: ViewResourceContextParams
): ViewResourceContextParams {
  const { mode, param } = getPorts().routing
  // In query mode a URL without the parameter names no view at all: its path
  // is the page the views are mounted under, not a scope.
  const parsed =
    mode === "query" && !readRoutingParam(current, param) ? {} : parseLink(current)

  if (parsed.resourceId || !defaultView) return parsed
  if (parsed.scope && defaultView.scope && parsed.scope !== defaultView.scope) {
    return parsed
  }

  return {
    ...defaultView,
    resourceId: defaultView.resourceId ?? defaultView.resource?.["@id"],
    ...parsed,
  }
}

function readRoutingParam(url: string, param: string): string | null {
  return new URLSearchParams(url.split("?")[1] ?? "").get(param)
}

/**
 * Whether the view on screen is the one a menu entry stands for.
 *
 * Compared context by context rather than as strings: the entry links to a
 * list, and in query mode it carries the base path the application is mounted
 * under, neither of which the current URL has to repeat to be that page. What
 * the entry does not name — the record being read, the layout chosen — is not
 * compared, so opening a record leaves its entry lit; what it names beyond a
 * list — a creation form, one record — has to match, so two entries on the
 * same resource stay distinguishable.
 */
function matchesContext(
  target: ViewResourceContextParams,
  current: ViewResourceContextParams
): boolean {
  if (target.scope && target.scope !== current.scope) return false
  if (target.resourceId && target.resourceId !== current.resourceId) return false
  if (target.id && target.id !== current.id) return false

  if (target.resourceAction && target.resourceAction !== ActionList.list) {
    return target.resourceAction === current.resourceAction
  }

  return true
}

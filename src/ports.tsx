import * as React from "react"
import { ComponentType, FC, ReactNode } from "react"
import type { Locale } from "date-fns"
import { enUS } from "date-fns/locale"
import { startNavigation } from "@/navigation/navigationState"
import {
  localSavedViewsStore,
  type SavedViewsStoreInterface,
} from "@/views/list/savedViews/savedViews"

/**
 * What the views need from the application hosting them.
 *
 * The package renders CRUD views over a JSON-LD API; it deliberately knows
 * neither which router the application uses nor where its API lives. Both come
 * from here, set once at startup through {@link configurePorts}.
 */

/** Where a navigation should go. */
export interface NavigateOptions {
  to: string
  replace?: boolean
  /**
   * Whether the router should scroll back to the top. The views set it to
   * false when switching tabs, to keep the reading position.
   */
  resetScroll?: boolean
}

/** Props of the link component, mirroring an anchor. */
export interface LinkPropsInterface extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  to: string
  children?: ReactNode
}

/**
 * The router primitives the views use: four required, one optional.
 *
 * Any router can satisfy this. An adapter for TanStack Router ships with the
 * package:
 *
 * ```ts
 * import { tanstackAdapter } from "react-resource-view/tanstack"
 * configurePorts({ navigation: tanstackAdapter })
 * ```
 */
export interface NavigationPortInterface {
  /**
   * Returns the imperative navigate function. Called as a hook.
   *
   * Routers that resolve navigation asynchronously may return a promise; the
   * views await it when they need to act once the URL has changed.
   */
  useNavigate: () => (options: NavigateOptions) => Promise<void> | void
  /**
   * Current location. `searchStr` is the raw query string, read reactively so
   * a client-side navigation re-renders the views that depend on it.
   */
  useLocation: () => {
    pathname: string
    searchStr: string
    search?: Record<string, unknown>
  }
  /** Renders an anchor handled by the router. */
  Link: ComponentType<LinkPropsInterface>
  /** Redirects on render. */
  Navigate: ComponentType<{ to: string; replace?: boolean }>
  /**
   * Whether the router is resolving a navigation — loading a route's code or
   * data — read as a hook. Optional: without it, a navigation counts from a
   * click on a link of the library, or a call to its `navigate`, until the new
   * view has loaded, which misses only the links the application draws itself.
   */
  useIsNavigating?: () => boolean
}

/**
 * How a view context is written into the URL.
 *
 * `path` puts it in the path — `/admin/articles/update/42` — which reads well
 * and is the default.
 *
 * `query` keeps it entirely in the query string —
 * `/docs.html?view=admin/articles/update/42`. Use it when the path is not
 * yours to control: static hosting, where a deep path has no server to answer
 * it and returns 404, or views embedded in an existing page.
 */
export interface RoutingPortInterface {
  mode: "path" | "query"
  /** Name of the query parameter carrying the context in `query` mode. */
  param: string
  /** Path the links point at in `query` mode, before the `?`. */
  basePath: string
}

export interface ResourceViewPortsInterface {
  navigation: NavigationPortInterface
  routing: RoutingPortInterface
  /**
   * Root URL of the application, used to build absolute links that must escape
   * an iframe. Defaults to the current origin.
   */
  appUrl: string
  /** Whether to render development affordances, such as the metadata panel. */
  isDev: boolean

  /**
   * Whether these views should emit the page's `<title>`, canonical and social
   * tags themselves.
   *
   * True suits a single-page application, where nothing else writes the
   * document head. Set it to false when the host router owns the head — a
   * server-rendered application declaring its metadata per route — otherwise
   * both write it and the page ends up with two of each, and a crawler reads
   * whichever came first.
   */
  ownsDocumentHead: boolean

  /** Application name, used as the page title suffix. */
  appName: string

  /** Description written into the page metadata. */
  description: string

  /**
   * Locale the views format their dates with — the calendar's month names, the
   * timeline's day headers — and which decides the day a week starts on.
   * Defaults to English (US); pass a date-fns locale to change it:
   *
   * ```ts
   * import { fr } from "date-fns/locale"
   * configurePorts({ dateLocale: fr })
   * ```
   */
  dateLocale: Locale

  /**
   * Where the views a reader saves (`views.list.savedViews`) are kept.
   * Defaults to the browser's `localStorage`, per resource and per browser;
   * give it an API to share them between users — see
   * {@link SavedViewsStoreInterface}.
   */
  savedViews: SavedViewsStoreInterface
}

const isBrowser = (): boolean => typeof window !== "undefined"

/**
 * Fallback navigation: full page loads through the History API.
 *
 * It keeps the views working — in a story, a test, a page rendered without a
 * router — but loses client-side routing. Supply a real adapter in production.
 */
const fallbackNavigation: NavigationPortInterface = {
  useNavigate: () => (options: NavigateOptions) => {
    if (!isBrowser()) return
    if (options.replace) window.location.replace(options.to)
    else window.location.assign(options.to)
  },
  useLocation: () => ({
    pathname: isBrowser() ? window.location.pathname : "/",
    searchStr: isBrowser() ? window.location.search : "",
    search: undefined,
  }),
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Navigate: ({ to, replace }) => {
    if (isBrowser()) {
      if (replace) window.location.replace(to)
      else window.location.assign(to)
    }
    return null
  },
}

let ports: ResourceViewPortsInterface = {
  navigation: fallbackNavigation,
  routing: { mode: "path", param: "view", basePath: "" },
  appUrl: isBrowser() ? window.origin : "http://localhost",
  isDev: false,
  ownsDocumentHead: true,
  appName: "",
  description: "",
  dateLocale: enUS,
  savedViews: localSavedViewsStore,
}

export function getPorts(): ResourceViewPortsInterface {
  return ports
}

/** Settings accepted by {@link configurePorts}; everything is optional. */
export interface ConfigurePortsInput extends Partial<
  Omit<ResourceViewPortsInterface, "routing">
> {
  routing?: Partial<RoutingPortInterface>
}

/**
 * Wires the host application into the views. Call it once at startup, before
 * the first view is rendered.
 */
export function configurePorts(newPorts: ConfigurePortsInput): void {
  ports = {
    ...ports,
    ...newPorts,
    routing: { ...ports.routing, ...newPorts.routing },
  }
}

/** The configured date-fns locale. */
export const getDateLocale = (): Locale => getPorts().dateLocale

/**
 * The day a week starts on for the configured locale — Sunday in en-US, Monday
 * in French. The calendar and the timeline lay their weeks out from it.
 */
export const getWeekStartsOn = (): 0 | 1 | 2 | 3 | 4 | 5 | 6 =>
  getDateLocale().options?.weekStartsOn ?? 0

/** Reads the navigate function through the configured router. */
export const useNavigate = (): ((
  options: NavigateOptions
) => Promise<void> | void) => {
  const navigate = getPorts().navigation.useNavigate()
  return (options) => {
    startNavigation(options.to)
    return navigate(options)
  }
}

/** Reads the current location through the configured router. */
export const useLocation = (): {
  pathname: string
  searchStr: string
  search?: Record<string, unknown>
} => getPorts().navigation.useLocation()

/** The configured router's link component. */
export const Link: FC<LinkPropsInterface> = ({ onClick, ...props }) => {
  const Component = getPorts().navigation.Link
  return (
    <Component
      {...props}
      onClick={(event) => {
        onClick?.(event)
        // Only a click the router will follow in this tab starts a navigation.
        const followed =
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          (!props.target || props.target === "_self")
        if (followed) startNavigation(props.to)
      }}
    />
  )
}

/** The configured router's redirect component. */
export const Navigate: FC<{ to: string; replace?: boolean }> = (props) => {
  const Component = getPorts().navigation.Navigate
  return <Component {...props} />
}

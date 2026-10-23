import {
  ComponentType,
  createContext,
  isValidElement,
  ReactNode,
  use,
  useEffect,
} from "react"
import { getPorts, useLocation } from "@/ports"
import {
  setNavigationLocation,
  setRouterPending,
} from "@/navigation/navigationState"
import { useIsNavigating } from "@/navigation/useIsNavigating"
import { useDelayedVisibility } from "@/navigation/useDelayedVisibility"
import { NavigationProgressBar } from "@/navigation/NavigationProgressBar"

/**
 * What `ResourceViewProvider` shows while moving from one view to the next:
 * a node, drawn only then, or a component, always mounted and told when;
 * `false` shows nothing.
 *
 * ```tsx
 * navigationLoader: <Spinner />
 * navigationLoader: ({ isNavigating }) => <PageLoader isLoading={isNavigating} />
 * ```
 *
 * Both are already delayed — nothing before 150 ms, then 300 ms at least.
 */
export type NavigationLoader =
  ReactNode | ComponentType<{ isNavigating: boolean }> | false

const NavigationIndicatorContext = /* @__PURE__ */ createContext(false)

const useRouterIsNavigating = (): boolean =>
  (getPorts().navigation.useIsNavigating ?? useNoRouterSignal)()
const useNoRouterSignal = (): boolean => false

const isComponent = (
  loader: NavigationLoader
): loader is ComponentType<{ isNavigating: boolean }> =>
  typeof loader === "function" ||
  (typeof loader === "object" &&
    loader !== null &&
    !isValidElement(loader) &&
    "$$typeof" in loader)

/**
 * Feeds the router's state to the navigation state, and shows the loader. Only
 * the outermost provider draws one: a provider nested in a view adds nothing.
 */
export function NavigationIndicator({
  loader,
  children,
}: {
  loader?: NavigationLoader
  children?: ReactNode
}) {
  const isNested = use(NavigationIndicatorContext)

  return (
    <NavigationIndicatorContext value={true}>
      {children}
      {!isNested && <NavigationIndicatorRoot loader={loader} />}
    </NavigationIndicatorContext>
  )
}

function NavigationIndicatorRoot({ loader }: { loader?: NavigationLoader }) {
  const routerPending = useRouterIsNavigating()
  const { pathname, searchStr } = useLocation()

  // Passive effects, after the layout effects through which a view that has
  // just mounted says it is loading: by now, the navigation it ends is known.
  useEffect(() => setRouterPending(routerPending), [routerPending])
  useEffect(() => setNavigationLocation(pathname + searchStr), [pathname, searchStr])

  const visible = useDelayedVisibility(useIsNavigating())

  if (loader === false) return null
  if (loader === undefined || loader === true) {
    return <NavigationProgressBar visible={visible} />
  }
  if (isComponent(loader)) {
    const Loader = loader
    return <Loader isNavigating={visible} />
  }
  return visible ? loader : null
}

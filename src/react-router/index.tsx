import { useContext } from "react"
import {
  Link as RouterLink,
  Navigate as RouterNavigate,
  UNSAFE_DataRouterStateContext,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
} from "react-router"
import type { NavigationPortInterface } from "@/ports"

/**
 * Ready-made navigation adapter for [React Router](https://reactrouter.com) v7.
 *
 * ```ts
 * import { configurePorts } from "react-resource-view"
 * import { reactRouterAdapter } from "react-resource-view/react-router"
 *
 * configurePorts({ navigation: reactRouterAdapter })
 * ```
 *
 * Importing this entry point is what pulls React Router in — the core of the
 * package never references it, so an application on another router installs
 * nothing extra.
 */
export const reactRouterAdapter: NavigationPortInterface = {
  useNavigate: () => {
    const navigate = useRouterNavigate()
    return ({ to, replace, resetScroll }) =>
      navigate(to, { replace, preventScrollReset: resetScroll === false })
  },

  useLocation: () => {
    const location = useRouterLocation()
    return {
      pathname: location.pathname,
      searchStr: location.search,
      search: Object.fromEntries(new URLSearchParams(location.search)),
    }
  },

  Link: ({ to, children, ...rest }) => (
    <RouterLink to={to} {...rest}>
      {children}
    </RouterLink>
  ),

  Navigate: ({ to, replace }) => <RouterNavigate to={to} replace={replace} />,

  // Pending while a data router loads the next route. A `<BrowserRouter>` has
  // no loaders to wait for, so it never reports a navigation in progress.
  useIsNavigating: () => {
    const state = useContext(UNSAFE_DataRouterStateContext)
    return state != null && state.navigation.state !== "idle"
  },
}

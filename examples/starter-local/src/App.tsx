import { useRouterState } from "@tanstack/react-router"
import { parseLink, ResourceViewProvider } from "react-resource-view"

/**
 * Loaded on demand: a scope is a chunk of its own, so a second one — a public
 * site next to the back office — does not weigh on the first.
 */
const SCOPES = {
  admin: () => import("@/scope").then((module) => module.adminScope),
}

/**
 * The whole application. The URL says which scope, resource, action and
 * record — /admin/tasks/list, /admin/tasks/read/1 — and the provider renders it.
 */
export function App() {
  const location = useRouterState({ select: (state) => state.location })
  const params = parseLink(location.pathname + location.searchStr)

  return (
    <ResourceViewProvider
      viewResourceContextParams={
        params.scope && !(params.scope in SCOPES) ? undefined : params
      }
      configuration={{ scopes: SCOPES, defaultScope: "admin" }}
    />
  )
}

import "@/setup"
import "@/styles.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { App } from "@/App"
import { seed } from "@/seed"

// Before the first render: the lists read the storage when they mount.
seed()

/**
 * One route: every URL renders the application, which reads the view to show
 * out of it. The router is there for client-side navigation, not to list pages.
 */
const router = createRouter({
  routeTree: createRootRoute({ component: App, notFoundComponent: () => null }),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

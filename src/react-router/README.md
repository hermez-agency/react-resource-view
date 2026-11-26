# react-resource-view/react-router

Navigation adapter for [React Router](https://reactrouter.com) v7 — the one
import that connects the views to your router.

```ts
import { configurePorts } from "react-resource-view"
import { reactRouterAdapter } from "react-resource-view/react-router"

configurePorts({ navigation: reactRouterAdapter })
```

`react-router` (^7) is an optional peer dependency: it is only needed, and only
loaded, by applications that import this entry point.

## Minimal example

```tsx
// main.tsx
import { createBrowserRouter, RouterProvider } from "react-router"
import { configurePorts, ResourceViewProvider } from "react-resource-view"
import { reactRouterAdapter } from "react-resource-view/react-router"
import { Admin } from "./Admin"

configurePorts({ navigation: reactRouterAdapter })

// The views build their own paths below `/admin`: give them a splat route.
const router = createBrowserRouter([{ path: "/admin/*", element: <Admin /> }])

createRoot(document.getElementById("root")!).render(
  <ResourceViewProvider>
    <RouterProvider router={router} />
  </ResourceViewProvider>
)
```

## What it maps

| Port              | React Router                                               |
| ----------------- | ---------------------------------------------------------- |
| `useNavigate`     | `useNavigate`; `resetScroll: false` → `preventScrollReset` |
| `useLocation`     | `useLocation` (`pathname`, `search`, parsed query)         |
| `Link`            | `<Link>`                                                   |
| `Navigate`        | `<Navigate>`                                               |
| `useIsNavigating` | `navigation.state !== "idle"` of a data router             |

`useIsNavigating` needs a data router (`createBrowserRouter` and the like). With
`<BrowserRouter>` there is no loader to wait for, so it stays `false` and the
views fall back to counting a navigation from a click on one of their links.

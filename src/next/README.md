# react-resource-view/next

Navigation adapter for the [Next.js](https://nextjs.org) **App Router**
(`next` 15 and 16). The Pages Router is not supported.

```ts
import { configurePorts } from "react-resource-view"
import { nextAdapter } from "react-resource-view/next"

configurePorts({ navigation: nextAdapter })
```

`next` is an optional peer dependency: it is only needed by applications that
import this entry point.

## Minimal example

The views are client components, and so is the module that configures them.

```tsx
// app/admin/providers.tsx
"use client"

import { Suspense } from "react"
import { configurePorts, ResourceViewProvider } from "react-resource-view"
import { nextAdapter } from "react-resource-view/next"

configurePorts({ navigation: nextAdapter })

export function Providers({ children }: { children: React.ReactNode }) {
  // `useSearchParams` suspends while a page is prerendered.
  return (
    <ResourceViewProvider>
      <Suspense>{children}</Suspense>
    </ResourceViewProvider>
  )
}
```

```tsx
// app/admin/layout.tsx
import { Providers } from "./providers"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
```

```tsx
// app/admin/[[...view]]/page.tsx — one catch-all route for every view
import { Admin } from "./Admin" // your scope, a client component

export default function Page() {
  return <Admin />
}
```

## What it maps

| Port          | Next.js                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `useNavigate` | `router.push` / `router.replace`; `resetScroll: false` → `scroll: false` |
| `useLocation` | `usePathname` and `useSearchParams`                                      |
| `Link`        | `next/link`                                                              |
| `Navigate`    | `router.replace` / `router.push` in an effect                            |

Next.js has no public "navigation pending" signal, so `useIsNavigating` is left
out: the views count a navigation from a click on one of their links.

Server-side rendering of the views is out of scope: they render on the client.

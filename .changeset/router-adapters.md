---
"react-resource-view": minor
---

Added: ready-made navigation adapters for React Router v7 (`react-resource-view/react-router`) and the Next.js App Router (`react-resource-view/next`), next to the TanStack one, instead of writing the four navigation primitives by hand

- `configurePorts({ navigation: reactRouterAdapter })` or `configurePorts({ navigation: nextAdapter })` is all it takes.
- Both routers are optional peer dependencies, loaded only by the application importing the adapter; the core still imports no router, and `pnpm run size` now checks it.
- The React Router adapter reports a navigation in progress with a data router; the Next.js adapter does not, as Next.js exposes no such signal. The Pages Router is not supported.

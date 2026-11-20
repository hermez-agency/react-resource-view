---
"react-resource-view": patch
---

Fixed: the development checks of `createViewResource` and `layout.*` no longer run in a production build, instead of throwing there too and leaving the application on its error screen

- Since 1.0.0, the package build replaced `process.env.NODE_ENV` with `"development"` in `dist/`, so the checks ran whatever the application's mode. `dist/` now leaves the expression to the application's bundler, which sets it to `"production"` for a production build.
- A tab declared with a resource id (`tabs.items[].resource: "users"`) is still checked in development, and that resource must be declared before the one holding the tab. Passing the resource itself (`resource: usersResource`) does not depend on the order.

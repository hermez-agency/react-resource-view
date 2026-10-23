---
"react-resource-view": minor
---

Added: `createPage("help", { name, icon, component })` declares a page without data (a home, a help, a dashboard): a menu entry and a route to a component, with no `create`, `read`, `update` or `delete` route and no request to the API, instead of a `createViewResource` with every permission turned off and a fake `getCollection`.

- `migrate` writes a 0.x resource made only of a name, an icon and a `viewComponent` as `createPage`, and no longer reports RV1-PERM-002 on it.

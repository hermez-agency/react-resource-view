# starter-local

A back office on [react-resource-view](https://hermez.dev/react-resource-view/docs/resource-view),
running on the browser's storage: no API, no backend.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/hermez-agency/react-resource-view/tree/main/examples/starter-local)

## Running it

```bash
npm install
npm run dev
```

## What is in it

| File                      | What it does                                                             |
| ------------------------- | ------------------------------------------------------------------------ |
| `src/resources/tasks.ts`  | Tasks: table, cards, items, board and split layouts, a filter bar        |
| `src/resources/events.ts` | Events: calendar and timeline layouts, plus a table                      |
| `src/seed.ts`             | The rows both start with (`storage: "local"` keeps them in localStorage) |
| `src/scope.ts`            | The back office: its resources and its menu                              |
| `src/setup.ts`            | The router the views navigate with                                       |

Edit a declaration and the screen follows. Changes made in the app survive a
reload; clear the site's storage to get the seed rows back.

To talk to a real API, replace `storage: "local"` with `path: "/api/tasks"` and
call `configureApi` in `src/setup.ts` — see
[Backends & dialects](https://hermez.dev/react-resource-view/docs/resource-view/backends).

This folder is built in the repository's CI so it does not break.

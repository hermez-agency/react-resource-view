---
title: "React Resource View 2.0: Cmd+K command palette, saved views, board and generation from OpenAPI"
description: "What React Resource View 2.0 changes for your React and TypeScript admin panel: a command palette, saved views, a board with no columns to declare, pages without data, singleton resources and resources generated from OpenAPI."
date: 2026-11-19
lang: en
translation: rrv-2-0
tags:
  - What's new
  - React
  - Admin panel
  - TypeScript
---

React Resource View 2.0.0 is out on npm. It bundles everything added since 1.0 for building a React admin panel or CRUD in TypeScript from a single resource declaration, and it removes a few internal names from the index. Here is what it changes for you as a user, with before / after code wherever the API moves.

## The only breaking change: a smaller index

The major version bump comes down to one thing. The `react-resource-view` index no longer re-exports internal helpers and test utilities: `onResourceViewDefaultsChange`, `getRegisteredOpenFrames`, `BUILT_IN_OPEN`, `resolveOpen`, `adoptResources`, `useInlineClaim`, `writeOptimistically`, `isOptimistic`, `notifyWriteError`, `joinPath`, `appendBracketParam`, `flattenStrapiRecord`, `PermissionCacheContext`, `resetApiConfig`, as well as the list view's `Header` and `ContentList` components (whose names clashed with the router's).

If you only import `createViewResource`, `layout`, `createScope` and their documented neighbours, there is nothing to do. Declarations marked `@internal` are also gone from the published `.d.ts` files, and a test now pins the list of public exports: any future addition or removal will show up in review.

## A Cmd+K command palette

With `commandPalette` on `AdminLayout` or `createAdminLayout`, `Cmd+K` (or `Ctrl+K`) opens a palette built from the scope: go to a menu entry, start creating a record. It only lists what your resources' permissions allow.

```tsx
decoratorComponent: createAdminLayout({
  commandPalette: { searchable: true },
})
```

With `searchable: true`, the palette also searches records, using each resource's `titleField`, sent as a list filter. The palette is a `dialog` containing a `combobox` and a `listbox`; `Esc` closes it. Before, an admin offered no keyboard navigation at all.

## Saved views, like in Notion

A combination of filters, sorting, layout and columns that you can neither name nor share with a link is a gap. `views.list.savedViews: true` adds saved view tabs above the list: users create, rename, duplicate and delete them.

```ts
views: {
  list: {
    savedViews: true,
    presets: [
      { id: "mine", name: "To do", filter: { status: "todo" } },
    ],
  },
}
```

Every view has an address: `?savedView=<id>` applies it. Views saved by a user go to `localStorage` by default; the `savedViews` port of `configurePorts` accepts four functions (`list`, `create`, `update`, `remove`) to share them through your API. In development, a preset with no name, with an undeclared layout or with another preset's id is rejected.

## A board that reads its columns from the form

Before, a board required `columns` next to the `options` the form already declared for the same field. Now one column per option is enough:

```ts
// before
layout.board({
  groupBy: "status",
  columns: [
    { value: "todo", label: "To do" },
    { value: "done", label: "Done" },
  ],
})

// after: one column per option of the `status` field
layout.board({ groupBy: "status" })
```

`columns` is still available to reorder columns or show only some of them, and now also accepts a function re-read on every render. `hideEmpty` hides columns with no cards, except while a card is being dragged. Records whose value matches no column land in a "No value" column instead of disappearing. A resource can also allow moving cards without offering the edit form: `permissions: { update: false, move: true }`.

## New layouts and grouping

The list gains `layout.gallery({ imageField })`, a grid of image cards for products, articles or profiles, as well as `layout.tree()`, `layout.map()` and `layout.chart()`. `layout.table({ groupBy })` and `layout.cards({ groupBy })` split rows by field into collapsible sections with their count. Everything stays independent of the API: users switch between them from the list's layout picker.

## Pages without data and singleton resources

A home page, a help page or a dashboard doesn't need a resource with every permission turned off and a fake `getCollection`. `createPage` declares a menu entry and a route to a component, with no API call:

```tsx
import { createPage } from "react-resource-view"
import { LifeBuoy } from "lucide-react"

export const help = createPage("help", {
  name: "Help",
  icon: LifeBuoy,
  component: HelpPage,
})
```

For settings or a profile that has a single record, `singleton: { get }` or `singleton: { id }` opens the edit form straight from the menu, and shows the create form, prefilled with `defaultData`, when the record doesn't exist yet.

## Generate resources from OpenAPI

After `init`, you still had to write every `createViewResource` by hand. The following command reads an OpenAPI 3.0 / 3.1 or Swagger 2.0 schema (API Platform, FastAPI, Supabase…) from a file or a URL:

```bash
npx react-resource-view generate resources
npx react-resource-view generate resources --only books,authors --dry-run
```

It writes one declaration per collection, with the `path`, the `form.inputs` (enums as select lists, IRIs and foreign keys as searchable relations, dates, numbers, booleans), the `permissions` matching the exposed operations and a table, plus a board if an enum field is named `status`. The resources are added to the scope's `resources`; no existing file is overwritten without `--force`.

## Plugging in a plain REST API

`restDialect` describes a typical REST API through configuration (`X-Total-Count`, `Link` header, cursor pagination), with the `jsonServerDialect` and `drfCursorDialect` presets, and `init -b json-server` to get started. A hand-written repository now returns `{ items, totalItems }` and always receives `{ id: string }`. If yours read the `@id` of the object it received, it must read `id` instead. The new `idField` option says where links and keys come from: your records no longer need an `@id`.

## Also new

- the `createMediaImageInput` and `createMediaFilesInput` controls keep an image or documents as base64 in the record, with no upload API;
- `react-resource-view/i18n` exports `messages` and `missingKeys(dictionary)`, so a test can fail when a release adds a message your dictionary doesn't translate;
- `inspectDefinition` lists the problems in a declaration without throwing, handy in CI;
- empty lists tell "nothing yet" apart from "nothing matches", and real-time updates batch a burst of notifications into a single fetch;
- several fixes: the JSON-LD dialect reads `hydra:violations`, `ApiUri` no longer waits forever after an error, and the calendar can be driven from the keyboard.

## Upgrading

```bash
npm i react-resource-view@latest
```

The full list is in the [changelog](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). For a first project, follow the [quickstart](/docs/resource-view/quickstart/); to go further, the [documentation](/docs/resource-view/quickstart/) covers every option mentioned here. The code is on [GitHub](https://github.com/hermez-agency/react-resource-view), under the MIT license.

*A Hermez product*

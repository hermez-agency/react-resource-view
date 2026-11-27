---
title: "React Resource View 2.2: a \"Shown fields\" menu for every list in your React admin panel"
description: "React Resource View 2.2 adds a menu to every list of your React and TypeScript admin panel to hide fields in the table, cards, board or calendar, with the choice kept per resource and optionally stored in your API."
date: 2026-11-26
lang: en
translation: rrv-2-2-visible-fields
tags:
  - What's new
  - React
  - Admin panel
  - TypeScript
---

React Resource View 2.2.0 is out on npm. It fixes an annoyance every React admin panel runs into: a resource has fifteen fields, nobody reads more than five, and everyone wants to see only their own five. From now on, the reader decides what the list shows, in any layout, without you writing any code. No migration is needed.

## Before: hideable columns, but only in the table

Up to 2.1, the table had a "Properties" menu for hiding columns. Handy, but limited to `layout.table()`: if your list also offered cards, a board or a calendar, those layouts showed every field, whatever the reader had picked. And the preference was lost when switching from one layout to another.

## After: one menu next to the filters, applied everywhere

In 2.2, a "Shown fields" menu appears next to the filters of every list, with a checkbox per declared field. Uncheck a field and it disappears from the table, the cards, the board, the calendar, the gallery, the items and the split view. The same preference applies to all seven layouts, because it is kept per resource, not per layout.

The menu is on by default. For an existing resource there is nothing to change: update the package and it is there. To configure it, everything goes through `views.list.fields`:

```ts
import { createViewResource, layout } from "react-resource-view"

export const tasks = createViewResource<Task>("tasks", {
  name: "Tasks",
  path: "/api/tasks",
  form: { inputs: TASK_FIELDS },
  views: {
    list: {
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
      fields: {
        toggle: true, // the "Shown fields" menu: on by default
        persist: "local", // where to keep the choice; false: until the reader leaves the list
        hidden: ["notes", "user.email"], // hidden until the reader shows them
      },
    },
  },
})
```

The three options:

- `toggle`: whether to show the menu. `false` removes it, for a list whose fields are fixed.
- `persist`: `"local"` (the default) keeps the choice in the browser; `false` keeps it only while the list stays open.
- `hidden`: the fields hidden on first display. The declaration sets the starting point; the reader can show them, and their choice wins from then on.

### Nested fields, down to the exact level

A field is a data key, and nested keys are written with dots. Hiding `user` hides everything under it; hiding only `user.email` keeps `user.name`. In the table, column order is still the one from the "Properties" menu, which keeps managing it.

## Your own components follow the menu

If your list uses a hand-written row component, it has no way of knowing on its own which fields are hidden. Two tools tell it. `<Field name="…">` renders nothing while the field is hidden, and `useFieldVisible("…")` returns a boolean when the layout depends on it:

```tsx
import { Field, useFieldVisible } from "react-resource-view"
import type { RowComponentPropsInterface } from "react-resource-view"

function TaskCard({ row }: RowComponentPropsInterface<Task>) {
  const showsPrice = useFieldVisible("price")
  if (!row) return null
  return (
    <article className={showsPrice ? "grid grid-cols-2" : ""}>
      <Field name="user.name">{row.data.user.name}</Field>
      <Field name="price">{row.data.price} €</Field>
    </article>
  )
}
```

`useFieldVisibility()` reads and updates the whole choice, if you want to build your own control instead of the menu.

## Keeping the choice in your API instead of the browser

By default, each reader's choice is written to `localStorage`, one entry per resource, with no error during server rendering. To make the preference follow a person from one machine to another, 2.2 adds a `fieldVisibility` port to `configurePorts`, built on the same idea as the saved views port: `read` and `write`, which may be async, and an optional `subscribe` to react to a change made elsewhere.

```ts
import { configurePorts } from "react-resource-view"

configurePorts({
  fieldVisibility: {
    read: (resource) =>
      fetch(`/api/field-visibility/${resource}`).then((r) => (r.ok ? r.json() : null)),
    write: (resource, state) =>
      // state: { hidden: string[], shown: string[] }, or null to fall back to the declaration
      fetch(`/api/field-visibility/${resource}`, {
        method: state ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: state ? JSON.stringify(state) : undefined,
      }).then(() => undefined),
  },
})
```

The state is deliberately small: `hidden` for what the reader has hidden, `shown` for what they have shown among the fields hidden by default. As long as nothing is stored (`null`), the declaration applies.

### What happens to existing setups

- Columns hidden in a table before 2.2 are carried over to the new storage the first time the list is opened: nobody suddenly gets all their columns back.
- Saved views and presets remember hidden fields in a `hiddenFields` key. A view saved with the old `columns.hidden` still applies it.

## Already merged, not yet released

Three changes are on the main branch, with their changesets, but are not in 2.2.0: don't rely on them until the next release.

- **`layout.feed()`** shows an activity log: records become dated events, grouped by day under "Today", "Yesterday" and then the date, along a vertical timeline. Filters, search, saved views and pagination work as in the other layouts.
- **The `Cmd+K` / `Ctrl+K` command palette** of `AdminLayout` will be on by default. `commandPalette: false` turns it off for an application that already uses that shortcut.
- **The development checks** in `createViewResource` and `layout.*` will no longer run in a production build, instead of possibly leaving the application stuck on its error screen there.

## Upgrading

```bash
npm i react-resource-view@latest
```

The menu is there the first time a list is opened. If you don't want to offer it on a resource, `fields: { toggle: false }` is all it takes.

For a first project, follow the [quickstart](/docs/resource-view/quickstart/); installation comes down to `npm i react-resource-view`, detailed in the [installation guide](/docs/resource-view/installation/). The layouts mentioned here are described in the [layouts documentation](/docs/resource-view/layouts/), and the full list of changes is in the [changelog](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). The code is on [GitHub](https://github.com/hermez-agency/react-resource-view), under the MIT license.

*A Hermez product*

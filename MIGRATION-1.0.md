# Migrating from 0.x to 1.0

1.0 rewrites how a resource is declared, so that a declaration reads once and
makes sense without the documentation. Every breaking change is listed below
with a stable id (`RV1-…`), the 0.x syntax, the 1.0 syntax, why it changed, and
whether the migration command rewrites it for you.

The same list, as data an AI or a script can apply without reading prose, is
[`migrations/1.0.json`](migrations/1.0.json) (shipped in the package, under
`node_modules/react-resource-view/migrations/1.0.json`).

## In three steps

1. **Run the migration.** It rewrites the declarations it finds — resources,
   layouts, shared fragments, `setResourceConfig`, a scope's menu — and lists
   what it could not decide:

   ```bash
   npx react-resource-view migrate src            # rewrite
   npx react-resource-view migrate src --dry-run  # print, write nothing
   npx react-resource-view migrate src --check    # exit 1 if anything is left
   ```

   It reads your code with your project's TypeScript and formats what it
   rewrites with your project's Prettier (only the files Prettier already
   formatted). What it leaves is marked `// TODO(RV1-…)` and listed at the end.

2. **List each resource in its scope.** A resource no longer names its scope
   (RV1-SCOPE-001): the migration prints the `scope` each resource declared —
   make sure it is in that scope's `resources`.

3. **Start the application in development.** `createViewResource` and
   `layout.*` now check what they are given: any 0.x key left over throws an
   error naming the change and the exact 1.0 rewrite, and a typo gets the
   closest key.

## What changes at a glance

```ts
// 0.x
const BOARD_BEHAVIOR: { behavior: object } = {
  behavior: { openRecordIn: "drawer", bulkActions: [markUrgent] },
}

export const tasks = createViewResource<Task>(TASKS_ID, {
  name: "Tasks",
  scope: "admin",
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  view: {
    fullWidth: true,
    name: "Tasks",
    form: { inputs: TASK_FIELDS },
    formFilter: { inputs: { title: { label: "Search a title" } } },
    viewVariants: [
      columnViewOptionFactory({
        ...BOARD_BEHAVIOR,
        name: "Board",
        identifierKey: "status",
        identifierKeyList: TASK_STATUSES,
      }),
      tableViewOptionFactory({ name: "Table" }),
    ],
  },
  views: {
    [ActionList.update]: {
      fullWidth: false,
      behavior: { openIn: "popup", closeAfterUpdate: true },
    },
  },
})
```

```ts
// 1.0
import { createViewResource, layout } from "react-resource-view"

export const tasks = createViewResource<Task>(TASKS_ID, {
  name: "Tasks",
  path: "/api/tasks",
  fullWidth: true,
  form: { inputs: TASK_FIELDS },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      bulkActions: [markUrgent], // every layout of the list selects
      layouts: [
        layout.board({ groupBy: "status", columns: TASK_STATUSES }),
        layout.table(),
      ],
    },
    read: { open: "drawer" }, // where a card of the board opens
    update: { fullWidth: false, open: "dialog" },
  },
})
// …and in the scope: `resources: [tasks]`.
```

- what is common to every action is at the root; what belongs to one action is
  in `views.<action>`; the two are merged deeply;
- everything is allowed by default, restrictions go in one `permissions`
  object, a refused action also protects its route;
- `behavior` is gone: each option is where it has an effect;
- layouts come from one `layout` namespace, with options named after what they
  do and checked against your item type;
- actions are plain strings: `views.update`, `rowActions: ["read"]`.

## Every change

| Id                                | Change                                                                                                                                                                                           | Kind     | Migration             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------- |
| [RV1-PERM-001](#rv1-perm-001)     | canRead, canList, canCreate, canUpdate, canDelete become one `permissions` object                                                                                                                | merge    | automatic             |
| [RV1-PERM-002](#rv1-perm-002)     | Everything is allowed by default                                                                                                                                                                 | semantic | manual                |
| [RV1-PERM-003](#rv1-perm-003)     | `canList` is read for the list (it was ignored)                                                                                                                                                  | semantic | automatic, then check |
| [RV1-PERM-004](#rv1-perm-004)     | `behavior.canExport` becomes `permissions.export`                                                                                                                                                | move     | automatic             |
| [RV1-PERM-005](#rv1-perm-005)     | Permission functions receive the record and may be asynchronous                                                                                                                                  | semantic | manual                |
| [RV1-PERM-006](#rv1-perm-006)     | A refused action also protects its route                                                                                                                                                         | semantic | manual                |
| [RV1-PERM-007](#rv1-perm-007)     | `permissionResource(resource, action, { item, context })` may return a promise; `usePermission` added                                                                                            | semantic | manual                |
| [RV1-PERM-008](#rv1-perm-008)     | Moving a card on a board asks `permissions.move`, which follows `update` unless declared                                                                                                         | semantic | manual                |
| [RV1-VIEW-001](#rv1-view-001)     | `view` disappears: what it held goes to the root of the resource or to `views.list`                                                                                                              | move     | automatic             |
| [RV1-VIEW-002](#rv1-view-002)     | `views[ActionList.update]` becomes `views.update`                                                                                                                                                | rename   | automatic             |
| [RV1-VIEW-003](#rv1-view-003)     | `name` of a view becomes `title`, and is derived when not declared                                                                                                                               | rename   | automatic             |
| [RV1-VIEW-004](#rv1-view-004)     | `label` becomes `views.<action>.buttonLabel`                                                                                                                                                     | move     | automatic             |
| [RV1-VIEW-005](#rv1-view-005)     | Root and action are merged deeply                                                                                                                                                                | semantic | manual                |
| [RV1-VIEW-006](#rv1-view-006)     | `itemsPerPage` becomes `views.list.pageSize`                                                                                                                                                     | rename   | automatic             |
| [RV1-VIEW-007](#rv1-view-007)     | `formFilter` and `defaultFilter` become `views.list.filters` with `initial`                                                                                                                      | merge    | automatic             |
| [RV1-VIEW-008](#rv1-view-008)     | `titleKey` becomes `titleField`                                                                                                                                                                  | rename   | automatic             |
| [RV1-VIEW-009](#rv1-view-009)     | A view no longer declares `id` or `icon`                                                                                                                                                         | remove   | automatic             |
| [RV1-VIEW-010](#rv1-view-010)     | A dialog or a drawer of `read` and `update` links to its full page (`expandable`)                                                                                                                | semantic | manual                |
| [RV1-BEHAV-001](#rv1-behav-001)   | `behavior` disappears: each option moves to where it has an effect                                                                                                                               | remove   | automatic             |
| [RV1-BEHAV-002](#rv1-behav-002)   | `openIn` becomes `open`: `window` → `page`, `popup` → `dialog`                                                                                                                                   | rename   | automatic             |
| [RV1-BEHAV-003](#rv1-behav-003)   | `closeAfterUpdate`, `refreshDataAfterUpdate`, `redirectToAfterUpdate` become one `afterSave`                                                                                                     | merge    | automatic, then check |
| [RV1-BEHAV-004](#rv1-behav-004)   | `rowActions` moves to `views.list.rowActions`, as strings                                                                                                                                        | move     | automatic             |
| [RV1-BEHAV-005](#rv1-behav-005)   | `eventSourced` becomes `realtime` at the root of the resource                                                                                                                                    | move     | automatic             |
| [RV1-BEHAV-006](#rv1-behav-006)   | `openRecordIn` becomes the `open` of `views.read`; `selectable`, `bulkActions` become options of `views.list`                                                                                    | move     | automatic             |
| [RV1-LAYOUT-001](#rv1-layout-001) | `viewVariants` becomes `views.list.layouts`                                                                                                                                                      | move     | automatic             |
| [RV1-LAYOUT-002](#rv1-layout-002) | `tableViewOptionFactory` becomes `layout.table`                                                                                                                                                  | rename   | automatic             |
| [RV1-LAYOUT-003](#rv1-layout-003) | `cardViewOptionFactory` becomes `layout.cards` (`grid` → `columns`)                                                                                                                              | rename   | automatic             |
| [RV1-LAYOUT-004](#rv1-layout-004) | `columnViewOptionFactory` becomes `layout.board` (`identifierKey` → `groupBy`, `identifierKeyList` → `columns`)                                                                                  | rename   | automatic             |
| [RV1-LAYOUT-005](#rv1-layout-005) | `calendarViewOptionFactory` becomes `layout.calendar` (`dateKey` → `dateField`, `endDateKey` → `endDateField`, `titleKey` → `titleField`, `colorKey` → `colorField`)                             | rename   | automatic             |
| [RV1-LAYOUT-006](#rv1-layout-006) | `timelineViewOptionFactory` becomes `layout.timeline` (`startDateKey` → `startField`, `endDateKey` → `endField`, `titleKey` → `titleField`, `groupKey` → `groupBy`, `statusKey` → `statusField`) | rename   | automatic             |
| [RV1-LAYOUT-007](#rv1-layout-007) | `splitViewFactory` becomes `layout.split` (`emptySelected` → `emptyState`, `redirectReadToList` → `readInList`, `resourceAction` → `action`)                                                     | rename   | automatic             |
| [RV1-LAYOUT-008](#rv1-layout-008) | `itemViewOptionFactory` becomes `layout.items`                                                                                                                                                   | rename   | automatic             |
| [RV1-LAYOUT-009](#rv1-layout-009) | A layout's `name` becomes `label`; its URL id is its type                                                                                                                                        | semantic | automatic, then check |
| [RV1-LAYOUT-010](#rv1-layout-010) | `listComponent`, `rowComponent`, `itemComponent` of a layout become `components.list\|row\|item`                                                                                                 | move     | automatic             |
| [RV1-LAYOUT-011](#rv1-layout-011) | A layout's `form` is merged over the resource's; `fields` picks the columns                                                                                                                      | semantic | automatic, then check |
| [RV1-LAYOUT-012](#rv1-layout-012) | Custom layouts: `createView` becomes `layout.custom`, options are read with `useLayout()`                                                                                                        | semantic | automatic, then check |
| [RV1-LAYOUT-013](#rv1-layout-013) | `layout.board({ openRecord, expandable })` disappears: a card opens `read` where `views.read` says                                                                                               | move     | automatic             |
| [RV1-LAYOUT-014](#rv1-layout-014) | `layout.board({ selectable, bulkActions })` disappears: the selection is declared on `views.list`, for every layout                                                                              | move     | automatic             |
| [RV1-COMP-001](#rv1-comp-001)     | `viewComponent`, `listComponent`, `rowComponent`, `itemComponent` become `components.view\|list\|row\|item`                                                                                      | move     | automatic             |
| [RV1-COMP-002](#rv1-comp-002)     | `decoratorComponent` of a resource becomes `components.wrapper`                                                                                                                                  | move     | automatic             |
| [RV1-COMP-003](#rv1-comp-003)     | `components.noResult` becomes `components.empty`                                                                                                                                                 | rename   | automatic             |
| [RV1-TABS-001](#rv1-tabs-001)     | `subViewResource` becomes `tabs`: `list` → `items`, `viewComponent` → `aside`                                                                                                                    | rename   | automatic, then check |
| [RV1-TABS-002](#rv1-tabs-002)     | A tab's `slug` → `id`, `name` → `label`, `viewComponent` → `component`, `resourceId` → `resource`, `resourceAction` → `action`                                                                   | rename   | automatic             |
| [RV1-TABS-003](#rv1-tabs-003)     | `onInitViewResource` becomes `filter` and `defaultData` functions of `{ item, parent }`                                                                                                          | semantic | automatic, then check |
| [RV1-DATA-001](#rv1-data-001)     | Without `path`, `storage: "local"` must be declared                                                                                                                                              | semantic | automatic             |
| [RV1-DATA-002](#rv1-data-002)     | `preGetCollection`, `preGetItem`, `preCreate`, `preUpdate` become `hooks.beforeList\|beforeRead\|beforeCreate\|beforeUpdate`                                                                     | move     | automatic             |
| [RV1-DATA-003](#rv1-data-003)     | Repository methods move to `repository`                                                                                                                                                          | move     | automatic             |
| [RV1-DATA-004](#rv1-data-004)     | `limit` becomes `quota` (`getLimit` → `get`)                                                                                                                                                     | rename   | automatic, then check |
| [RV1-DATA-005](#rv1-data-005)     | `resourceBuild`, `onChange` and `@type` are no longer declared                                                                                                                                   | remove   | automatic             |
| [RV1-DATA-006](#rv1-data-006)     | Writes are drawn before the API answers (`optimistic`)                                                                                                                                           | semantic | manual                |
| [RV1-SCOPE-001](#rv1-scope-001)   | A resource no longer declares its `scope`: the scope lists it in `resources`                                                                                                                     | move     | automatic, then check |
| [RV1-SCOPE-002](#rv1-scope-002)   | A scope's `menu` takes resources directly, or `"auto"`                                                                                                                                           | semantic | automatic             |
| [RV1-SCOPE-003](#rv1-scope-003)   | `setResourceConfig({ defaultResource })` becomes `configureResourceView({ defaults })`                                                                                                           | rename   | automatic, then check |
| [RV1-TYPE-001](#rv1-type-001)     | What one writes is `ResourceDefinition`, what the library builds is `ViewResource`                                                                                                               | rename   | automatic, then check |
| [RV1-TYPE-002](#rv1-type-002)     | `ViewInterface`, `ViewListInterface`, `ViewUpdateInterface` are replaced                                                                                                                         | semantic | manual                |
| [RV1-TYPE-003](#rv1-type-003)     | The context's `view` is the resolved view                                                                                                                                                        | semantic | manual                |

## Permissions

### RV1-PERM-001

**canRead, canList, canCreate, canUpdate, canDelete become one `permissions` object** — merge, rewritten by `migrate`.

Before (0.x):

```ts
createViewResource<Order>("orders", {
  path: "/api/orders",
  canRead: true,
  canUpdate: true,
})
```

After (1.0):

```ts
createViewResource<Order>("orders", {
  path: "/api/orders",
  permissions: { create: false, delete: false, export: false },
})
```

Why: Five keys for one notion, denied by default and silently: a resource declared without them showed a list with no button at all. One object, allowed by default, says only what is restricted.

Note: The codemod keeps what a 0.x declaration offered: an action it did not declare was refused, so it is written `false` — only the refusals are written, everything else being allowed. `"readonly"` is used when it fits. Without a `path` there is nothing to export, so `export` is left out. A declaration that named no permission at all is left to the 1.0 default and reported (RV1-PERM-002).

### RV1-PERM-002

**Everything is allowed by default** — semantic, by hand.

Before (0.x):

```ts
createViewResource("books", { path: "/api/books" })
// 0.x: a list with no read, edit or delete button
```

After (1.0):

```ts
createViewResource("books", { path: "/api/books" })
// 1.0: every action offered; restrict with `permissions`
```

Why: The interface's permissions only decide what is offered; the API is where access is enforced. A deny-by-default protected nothing and broke the first experience — the README example had no button.

By hand: A 0.x resource that declared no `canXxx` at all offered no read, create, update or delete button; in 1.0 it offers them all. The codemod lists these resources (it does not guess): add `permissions` to those that were meant to be read-only.

Note: Where a declaration named at least one `canXxx`, the codemod writes the refusals it implied (RV1-PERM-001).

### RV1-PERM-003

**`canList` is read for the list (it was ignored)** — semantic, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
canRead: true,
canList: false,
```

After (1.0):

```ts
permissions: { list: false },
```

Why: Bug: `permissionResource` answered the list with `canRead`, so `canList` had no effect.

By hand: Check the lists of resources that declared `canList` differently from `canRead`: the list now follows `canList`, and a refused list protects its page.

Note: 0.x never refused a list page — `canRead` only hid the read buttons and the way back to the list — so the codemod writes `list: false` only when `canList` said so.

### RV1-PERM-004

**`behavior.canExport` becomes `permissions.export`** — move, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  behavior: {
    canExport: true
  }
}
```

After (1.0):

```ts
permissions: { export: true } // or nothing: allowed by default
```

Why: The export is a permission like the others; it sat in `behavior`, away from them.

Note: The export button still only shows when the resource has a `path` and its dialect describes an export request.

### RV1-PERM-005

**Permission functions receive the record and may be asynchronous** — semantic, by hand.

Before (0.x):

```ts
canDelete: () => isAdmin(),
```

After (1.0):

```ts
permissions: {
  delete: ({ item }) => isAdmin() && item?.status !== "done",
},
```

Why: A rule about one record was impossible to write, and the scope's `authorization` was already asynchronous: one model now.

By hand: Nothing to change: a function ignoring its argument still works. Use `item` to write rules such as "a finished task cannot be deleted".

Note: Asynchronous answers are cached per action and record for the time a list is on screen, so a list of 50 rows asks once per row and action.

### RV1-PERM-006

**A refused action also protects its route** — semantic, by hand.

Before (0.x):

```ts
// canUpdate: false — /books/update/1 still drew the form
```

After (1.0):

```ts
// permissions: { update: false } — /books/update/1 draws the forbidden fallback
```

Why: A refused action only hid its button: typing the URL still opened the form.

By hand: Check the pages reached by a direct link: `/admin/books/update/1` with `update` refused now shows the scope's `forbiddenFallback` instead of the form.

Note: The fallback is the scope's `forbiddenFallback`, then the configuration's, then a built-in "Access denied".

### RV1-PERM-007

**`permissionResource(resource, action, { item, context })` may return a promise; `usePermission` added** — semantic, by hand.

Before (0.x):

```ts
if (permissionResource(resource, ActionList.update)) { … }
```

After (1.0):

```ts
const canUpdate = usePermission("update", item) // false while pending
```

Why: A permission can now depend on the record and answer asynchronously.

By hand: Calls that used the result as a boolean must handle a promise when a permission is asynchronous — in a component, use `usePermission(action, item)`.

### RV1-PERM-008

**Moving a card on a board asks `permissions.move`, which follows `update` unless declared** — semantic, by hand.

Before (0.x):

```ts
canUpdate: false,
view: { viewVariants: [columnViewOptionFactory({ identifierKey: "status" })] },
// 0.x: the cards still move
```

After (1.0):

```ts
permissions: { update: false, move: true },
views: { list: { layouts: [layout.board({ groupBy: "status" })] } },
```

Why: Moving a card writes its record: 1.0 asks a permission for it, as for every other write — but a separate one, so a board can change a status without opening the edit form.

By hand: A 0.x resource that refused `canUpdate` but drew a board still let its cards be dropped in another column; in 1.0 they stay where they are. Add `move: true` to `permissions` to move them without offering the edit form. The codemod marks these declarations with a TODO on `update`.

Note: `move` is a permission like the others — a boolean or a function of the record. Left undeclared, it answers as `update`, so a resource that never mentions it moves its cards exactly when it may update them.

## `view`, `views` and titles

### RV1-VIEW-001

**`view` disappears: what it held goes to the root of the resource or to `views.list`** — move, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  name: "Tasks",
  fullWidth: true,
  form: { inputs: TASK_FIELDS },
  formFilter: { inputs: { title: { label: "Search" } } },
  viewVariants: [tableViewOptionFactory({ name: "Table" })],
},
```

After (1.0):

```ts
fullWidth: true,
form: { inputs: TASK_FIELDS },
views: {
  list: {
    filters: { inputs: { title: { label: "Search" } } },
    layouts: [layout.table()],
  },
},
```

Why: `view` and `views` differed by one letter, and `view` was typed as a list: `itemsPerPage` and `formFilter` were offered as defaults for every action.

Note: `view.name` is dropped when it repeats the resource's `name`, and becomes `views.list.title` otherwise.

### RV1-VIEW-002

**`views[ActionList.update]` becomes `views.update`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
views: { [ActionList.update]: { … } }
```

After (1.0):

```ts
views: { update: { … } }
```

Why: The keys are plain strings, offered by the autocompletion; there is nothing to import.

Note: `ActionList.update` is still accepted wherever an action is expected.

### RV1-VIEW-003

**`name` of a view becomes `title`, and is derived when not declared** — rename, rewritten by `migrate`.

Before (0.x):

```ts
views: { [ActionList.update]: { name: "Edit a task" } }
```

After (1.0):

```ts
views: {
  update: {
    title: "Edit a task"
  }
}
```

Why: The name was declared three times (`name`, `view.name`, `views.list.name`) while the titles were already derived.

Note: In development, a `title` identical to the derived one is reported.

### RV1-VIEW-004

**`label` becomes `views.<action>.buttonLabel`** — move, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  label: {
    create: "New task"
  }
}
```

After (1.0):

```ts
views: {
  create: {
    buttonLabel: "New task"
  }
}
```

Why: An object indexed by action inside a view that is already an action: `views.update.label.create` meant nothing. It only ever labelled buttons.

### RV1-VIEW-005

**Root and action are merged deeply** — semantic, by hand.

Before (0.x):

```ts
view: { form: { inputs: FIELDS } },
views: { [ActionList.update]: { form: { inputs: { ...FIELDS, notes: undefined } } } }
```

After (1.0):

```ts
form: { inputs: FIELDS },
views: { update: { form: { inputs: { notes: false } } } }
```

Why: `views.update.behavior.closeAfterUpdate` erased the whole `view.behavior`, `openIn` included; the same held for `form`, `components` and `label`.

By hand: A `views.<action>` that restated a whole object (`components`, `form`, `behavior`) to change one key can now say only that key. One that relied on the shallow merge to _drop_ inherited keys must now remove them explicitly: `inputs: { notes: false }`, `components: { top: null }`.

Note: Arrays (`layouts`, `rowActions`, `valueOptions`) and functions are replaced, not merged.

### RV1-VIEW-006

**`itemsPerPage` becomes `views.list.pageSize`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  itemsPerPage: 50
}
```

After (1.0):

```ts
views: {
  list: {
    pageSize: 50
  }
}
```

Why: A word that belongs to no backend (`itemsPerPage` is API Platform's).

### RV1-VIEW-007

**`formFilter` and `defaultFilter` become `views.list.filters` with `initial`** — merge, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  formFilter: { inputs: { status: STATUS_INPUT } },
  defaultFilter: { status: "open" },
}
```

After (1.0):

```ts
views: {
  list: {
    filters: { inputs: { status: STATUS_INPUT }, initial: { status: "open" } },
  },
}
```

Why: The two notions go together and lived apart.

### RV1-VIEW-008

**`titleKey` becomes `titleField`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  titleKey: "email"
}
```

After (1.0):

```ts
titleField: "email"
```

Why: One suffix for every field option: `titleField`, `dateField`, `colorField`, `statusField`.

Note: Typed against the resource's item: a typo is a TypeScript error.

### RV1-VIEW-009

**A view no longer declares `id` or `icon`** — remove, rewritten by `migrate`.

Before (0.x):

```ts
icon: ListTodo,
view: { id: "tasks", icon: ListTodo },
```

After (1.0):

```ts
icon: ListTodo, // the resource's icon is the one the views use
```

Why: Neither had an effect on a view.

### RV1-VIEW-010

**A dialog or a drawer of `read` and `update` links to its full page (`expandable`)** — semantic, by hand.

Before (0.x):

```ts
views: {
  read: {
    open: "drawer"
  }
}
// 0.x: no way to the record's page from the drawer
```

After (1.0):

```ts
views: { read: { open: "drawer" } } // "Open in full page" in its header
views: { read: { open: "drawer", expandable: false } } // as in 0.x
```

Why: A window too narrow for its record had to be closed, and the record found again by hand.

By hand: Nothing to rewrite. `read` and `update` opened with `open: "dialog"`, `"drawer"` or a frame of one's own — and the records a board opens — now show an "Open in full page" link beside the close button; `create` and `delete` do not. Declare `expandable: false` on a view to take it away, `expandable: true` to add it to `create`.

Note: The link is a real link (`<a href>`): Ctrl/Cmd+click opens the page in a new tab. It keeps the layout of the list it was opened from.

## `behavior`

### RV1-BEHAV-001

**`behavior` disappears: each option moves to where it has an effect** — remove, rewritten by `migrate`.

Before (0.x):

```ts
views: { [ActionList.update]: { behavior: { openIn: "popup", closeAfterUpdate: true } } }
```

After (1.0):

```ts
views: {
  update: {
    open: "dialog"
  }
} // closing after a save is what a dialog does
```

Why: One type shared by the five actions: `closeAfterUpdate` could be written on a list and `bulkActions` on a form, without error and without effect.

### RV1-BEHAV-002

**`openIn` becomes `open`: `window` → `page`, `popup` → `dialog`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
behavior: {
  openIn: "popup"
}
```

After (1.0):

```ts
open: "dialog"
```

Why: `window` did not mean a new tab and `popup` evoked the browser: the new values describe what is seen. `openIn` was also too close to `openRecordIn`.

### RV1-BEHAV-003

**`closeAfterUpdate`, `refreshDataAfterUpdate`, `redirectToAfterUpdate` become one `afterSave`** — merge, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
behavior: {
  closeAfterUpdate: true
}
behavior: {
  refreshDataAfterUpdate: true
}
behavior: {
  redirectToAfterUpdate: "/done"
}
```

After (1.0):

```ts
afterSave: "close"
afterSave: "reload"
afterSave: {
  redirect: () => "/done"
}
```

Why: Three options that could contradict each other; a union makes a contradiction impossible, and the redirection can depend on the saved record.

By hand: Check forms that combined these options: they could contradict each other, `afterSave` keeps one (redirect, then reload, then close).

Note: `closeAfterUpdate: false` is the default and is dropped. Defaults: `close` in a dialog or a drawer, `stay` on a page (after a creation, the page moves to the new record, as in 0.x).

### RV1-BEHAV-004

**`rowActions` moves to `views.list.rowActions`, as strings** — move, rewritten by `migrate`.

Before (0.x):

```ts
views: { [ActionList.list]: { behavior: { rowActions: [ActionList.read, ActionList.update] } } }
```

After (1.0):

```ts
views: {
  list: {
    rowActions: ["read", "update"]
  }
}
```

Why: Only the list has rows.

Note: `ActionList.read` is still accepted.

### RV1-BEHAV-005

**`eventSourced` becomes `realtime` at the root of the resource** — move, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  behavior: {
    eventSourced: true
  }
}
```

After (1.0):

```ts
realtime: true
```

Why: It is a property of the data (Mercure), not of a view.

### RV1-BEHAV-006

**`openRecordIn` becomes the `open` of `views.read`; `selectable`, `bulkActions` become options of `views.list`** — move, rewritten by `migrate`.

Before (0.x):

```ts
columnViewOptionFactory({
  identifierKey: "status",
  identifierKeyList: STATUSES,
  behavior: { openRecordIn: "drawer", bulkActions: [markUrgent] },
})
```

After (1.0):

```ts
views: {
  read: { open: "drawer" },
  list: {
    bulkActions: [markUrgent],
    layouts: [layout.board({ groupBy: "status", columns: STATUSES })],
  },
}
```

Why: Where a card opens is where the record's `read` view opens: one decision, the same URL from a card, a button or a link. And a selection is the list's, not one layout's: declared once on `views.list`, every layout — table, cards, items, board — selects the same records and offers the same bulk actions.

Note: Declared on `view`, on a view or in a layout's `behavior`, `selectable` and `bulkActions` go to `views.list`; a shared fragment of them spread into a layout of the declaration is spread into `views.list` instead, and a layout built away from its resource keeps them, marked `TODO(RV1-BEHAV-006)`. `openRecordIn` goes to `views.read.open`; written on a layout or in a shared fragment, it is reported: declare `views.read.open` on the resource. `selectable` defaults to `true` when `bulkActions` is non-empty, and a board stays selectable for "Move to…".

## Layouts

### RV1-LAYOUT-001

**`viewVariants` becomes `views.list.layouts`** — move, rewritten by `migrate`.

Before (0.x):

```ts
view: {
  viewVariants: [tableViewOptionFactory()]
}
```

After (1.0):

```ts
views: {
  list: {
    layouts: [layout.table()]
  }
}
```

Why: The list is the only action with layouts.

### RV1-LAYOUT-002

**`tableViewOptionFactory` becomes `layout.table`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
tableViewOptionFactory({ name: "Table" })
```

After (1.0):

```ts
layout.table()
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-003

**`cardViewOptionFactory` becomes `layout.cards` (`grid` → `columns`)** — rename, rewritten by `migrate`.

Before (0.x):

```ts
cardViewOptionFactory({ name: "Cards", grid: 3 })
```

After (1.0):

```ts
layout.cards({ columns: 3 })
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-004

**`columnViewOptionFactory` becomes `layout.board` (`identifierKey` → `groupBy`, `identifierKeyList` → `columns`)** — rename, rewritten by `migrate`.

Before (0.x):

```ts
columnViewOptionFactory({
  name: "Board",
  identifierKey: "status",
  identifierKeyList: TASK_STATUSES,
})
```

After (1.0):

```ts
layout.board({ groupBy: "status", columns: TASK_STATUSES })
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item. `identifierKey` meant "group by".

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-005

**`calendarViewOptionFactory` becomes `layout.calendar` (`dateKey` → `dateField`, `endDateKey` → `endDateField`, `titleKey` → `titleField`, `colorKey` → `colorField`)** — rename, rewritten by `migrate`.

Before (0.x):

```ts
calendarViewOptionFactory({
  dateKey: "dueDate",
  titleKey: "title",
  colorKey: "assignee",
})
```

After (1.0):

```ts
layout.calendar({
  dateField: "dueDate",
  titleField: "title",
  colorField: "assignee",
})
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-006

**`timelineViewOptionFactory` becomes `layout.timeline` (`startDateKey` → `startField`, `endDateKey` → `endField`, `titleKey` → `titleField`, `groupKey` → `groupBy`, `statusKey` → `statusField`)** — rename, rewritten by `migrate`.

Before (0.x):

```ts
timelineViewOptionFactory({
  startDateKey: "startDate",
  endDateKey: "dueDate",
  groupKey: "assignee",
  statusKey: "status",
})
```

After (1.0):

```ts
layout.timeline({
  startField: "startDate",
  endField: "dueDate",
  groupBy: "assignee",
  statusField: "status",
})
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-007

**`splitViewFactory` becomes `layout.split` (`emptySelected` → `emptyState`, `redirectReadToList` → `readInList`, `resourceAction` → `action`)** — rename, rewritten by `migrate`.

Before (0.x):

```ts
splitViewFactory({ emptySelected: Pick, redirectReadToList: true })
```

After (1.0):

```ts
layout.split({ emptyState: Pick, readInList: true })
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-008

**`itemViewOptionFactory` becomes `layout.items`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
itemViewOptionFactory({ name: "List" })
```

After (1.0):

```ts
layout.items({ label: "List" })
```

Why: Seven long imports with inconsistent names (`splitViewFactory` came from `split/columnViewOptionFactory.ts`) for one notion; one `layout` namespace lists them all, each with options named after what they do and typed against the item.

Note: `import { layout } from "react-resource-view"`.

### RV1-LAYOUT-009

**A layout's `name` becomes `label`; its URL id is its type** — semantic, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
columnViewOptionFactory({ name: "Kanban" }) // ?variant=kanban
```

After (1.0):

```ts
layout.board({ label: "Kanban" }) // ?variant=board
```

Why: The id was derived from the name: renaming "Board" to "Kanban" changed the URL and broke the links already shared.

By hand: A layout whose old URL id (`?variant=…`, the slug of its name) differs from its type now answers to its type: `itemViewOptionFactory({ name: "List" })` was `?variant=list`, `layout.items()` is `?variant=items`. A link with the old id falls back on the first layout. Add `id: "list"` to keep it.

Note: The codemod drops a label that only repeats the type ("Table" on a table).

### RV1-LAYOUT-010

**`listComponent`, `rowComponent`, `itemComponent` of a layout become `components.list|row|item`** — move, rewritten by `migrate`.

Before (0.x):

```ts
cardViewOptionFactory({ rowComponent: ProductRow })
```

After (1.0):

```ts
layout.cards({ components: { row: ProductRow }, frame: false })
```

Why: One way to inject a component, everywhere: the `components` object.

Note: 0.x drew a card's row component with nothing around it; 1.0 frames it and puts the row's actions under it. The codemod writes `frame: false` on cards that had a `rowComponent`, which leaves the actions out too: remove it from a row that draws no card of its own.

### RV1-LAYOUT-011

**A layout's `form` is merged over the resource's; `fields` picks the columns** — semantic, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
tableViewOptionFactory({
  form: { inputs: { title: FIELDS.title, status: FIELDS.status } },
})
```

After (1.0):

```ts
layout.table({ fields: ["title", "status"] })
```

Why: Deep merge everywhere, and a column selection reads better as a list of fields than as a second form.

By hand: When a layout's `form.inputs` is not an object literal the codemod cannot list its keys: replace it with `fields: ["title", "status", …]`.

Note: The codemod writes `fields` from the keys of the layout's inputs, and keeps the inputs only when they say more than a reference to the same field.

### RV1-LAYOUT-012

**Custom layouts: `createView` becomes `layout.custom`, options are read with `useLayout()`** — semantic, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
export default function heatmapViewFactory(args) {
  return createView({ name: "Heatmap", listComponent: HeatmapList, ...args })
}
```

After (1.0):

```ts
export function heatmapLayout(options = {}) {
  return layout.custom({
    type: "heatmap",
    components: { list: HeatmapList },
    ...options,
  })
}
```

Why: The built-in layouts and yours share one shape; a layout's options are no longer mixed into the view.

By hand: The codemod rewrites a `createView({ … })` call written out in place. A factory of one's own that spreads its arguments into `createView` is left to the hand: rewrite it with `layout.custom`, and read its options in the components with `useLayout().options` instead of `useCurrentViewResourceContext().view`. `npx react-resource-view create-view-variant` writes the new shape.

### RV1-LAYOUT-013

**`layout.board({ openRecord, expandable })` disappears: a card opens `read` where `views.read` says** — move, rewritten by `migrate`.

Before (1.0 previews):

```ts
layout.board({ groupBy: "status", columns: STATUSES, openRecord: "drawer" })
```

After (1.0):

```ts
views: {
  read: { open: "drawer" },
  list: { layouts: [layout.board({ groupBy: "status", columns: STATUSES })] },
}
```

Why: Where a view opens was decided in four places, each with its own default: a board's card, a row's button, the form, the route. It is decided once, by the view: a card, a button and a shared link open the same frame at the same URL, Back closes it and a reload opens it again.

Note: A board's card now always opens the record's `read` view — on its page unless `views.read.open` says otherwise. `expandable` is only declared on the view. The codemod moves both to `views.read` when the board is written in the resource's `views.list.layouts`, and reports the boards built elsewhere.

### RV1-LAYOUT-014

**`layout.board({ selectable, bulkActions })` disappears: the selection is declared on `views.list`, for every layout** — move, rewritten by `migrate`.

Before (1.0 previews):

```ts
layout.board({ groupBy: "status", columns: STATUSES, bulkActions: [markUrgent] })
```

After (1.0):

```ts
views: {
  list: {
    bulkActions: [markUrgent],
    layouts: [layout.board({ groupBy: "status", columns: STATUSES })],
  },
}
```

Why: A selection is the list's, not one layout's: declared once on `views.list`, every layout — table, cards, items, board — selects the same records and offers the same bulk actions.

Note: `selectable` defaults to `true` when `bulkActions` is non-empty; a board stays selectable for "Move to…" unless `selectable: false`. `bulkActions` also takes `"delete"`, the built-in deletion of the selected records. The codemod moves both to `views.list` when the board is written in the resource's `views.list.layouts`, and marks with `TODO(RV1-LAYOUT-014)` those of the boards built elsewhere.

## Components

### RV1-COMP-001

**`viewComponent`, `listComponent`, `rowComponent`, `itemComponent` become `components.view|list|row|item`** — move, rewritten by `migrate`.

Before (0.x):

```ts
views: { [ActionList.update]: { viewComponent: PostBuilder } }
```

After (1.0):

```ts
views: {
  update: {
    components: {
      view: PostBuilder
    }
  }
}
```

Why: Two injection mechanisms — flat `xxxComponent` keys and a `components` object — for one notion.

### RV1-COMP-002

**`decoratorComponent` of a resource becomes `components.wrapper`** — move, rewritten by `migrate`.

Before (0.x):

```ts
decoratorComponent: Frame
```

After (1.0):

```ts
components: {
  wrapper: Frame
}
```

Why: Same reason: the `components` object is the one way in.

Note: The `decoratorComponent` of a scope and of `ResourceViewProvider`'s configuration are unchanged.

### RV1-COMP-003

**`components.noResult` becomes `components.empty`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
components: {
  noResult: NothingYet
}
```

After (1.0):

```ts
components: {
  empty: NothingYet
}
```

Why: Clearer name.

## Tabs (sub-views)

### RV1-TABS-001

**`subViewResource` becomes `tabs`: `list` → `items`, `viewComponent` → `aside`** — rename, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
subViewResource: { viewComponent: Summary, list: [ … ] }
```

After (1.0):

```ts
tabs: { aside: Summary, items: [ … ] }
```

Why: A technical name for what the reader sees as tabs, and `list` designated tabs.

By hand: A `subViewResource` declared on the 0.x `view` reached every action: the codemod puts its tabs on `views.read` and `views.update` — remove the one that had no use.

### RV1-TABS-002

**A tab's `slug` → `id`, `name` → `label`, `viewComponent` → `component`, `resourceId` → `resource`, `resourceAction` → `action`** — rename, rewritten by `migrate`.

Before (0.x):

```ts
{ slug: "team", name: "Team", resourceId: USERS_ID, resourceAction: ActionList.list }
```

After (1.0):

```ts
{ id: "team", label: "Team", resource: USERS_ID }
```

Why: The words of the rest of the declaration; `resource` takes the resource or its identifier.

Note: `resourceAction: ActionList.list` is the default and is dropped.

### RV1-TABS-003

**`onInitViewResource` becomes `filter` and `defaultData` functions of `{ item, parent }`** — semantic, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
onInitViewResource: (view, parent) => {
  const author = (parent?.data as User | undefined)?.name
  return { ...view, filter: { author }, defaultData: { author } }
},
```

After (1.0):

```ts
filter: ({ item }) => ({ author: (item as User | undefined)?.name }),
defaultData: ({ item }) => ({ author: (item as User | undefined)?.name }),
```

Why: To filter a tab on its parent one had to rebuild and return the whole view context.

By hand: The codemod rewrites the usual shape — a function ending in `return { ...view, filter: …, defaultData: … }` — and leaves a `TODO(RV1-TABS-003)` on anything else.

Note: `item` is typed after the resource the tabs are declared on: `({ item }) => ({ author: item.name })` is enough once the cast is no longer needed.

## Data: path, storage, hooks, repository, quota

### RV1-DATA-001

**Without `path`, `storage: "local"` must be declared** — semantic, rewritten by `migrate`.

Before (0.x):

```ts
createViewResource("drafts", { name: "Drafts" })
```

After (1.0):

```ts
createViewResource("drafts", { name: "Drafts", storage: "local" })
```

Why: Forgetting `path` switched to `localStorage` without a word: one believed to talk to the API while the data stayed in the browser.

Note: The codemod adds `storage: "local"` to a declaration with no `path`, unless it replaces all five repository methods or draws a screen of its own (`components.view`). Without `path`, `storage` or a complete `repository`, development throws an error naming the resource.

### RV1-DATA-002

**`preGetCollection`, `preGetItem`, `preCreate`, `preUpdate` become `hooks.beforeList|beforeRead|beforeCreate|beforeUpdate`** — move, rewritten by `migrate`.

Before (0.x):

```ts
preCreate: (data) => ({ ...data, owner: currentUser() }),
```

After (1.0):

```ts
hooks: {
  beforeCreate: (data) => ({ ...data, owner: currentUser() }),
},
```

Why: Only "before" hooks existed, flat among the options; `preCreate` and `preUpdate` lost the view context on the way to the repository (bug fixed).

Note: Hooks may now be asynchronous, and always receive `{ viewResourceContext }`. New: `beforeDelete`, `afterSave`, `afterDelete`.

### RV1-DATA-003

**Repository methods move to `repository`** — move, rewritten by `migrate`.

Before (0.x):

```ts
getItem: async ({ id }) => ({ data: await fetchBook(id) }),
```

After (1.0):

```ts
repository: {
  getItem: async ({ id }) => ({ data: await fetchBook(id) }),
},
```

Why: The repository methods were offered by the autocompletion of the declaration, mixed with its options.

Note: The built resource still exposes `resource.getItem(…)` and the others, decorated with the hooks.

### RV1-DATA-004

**`limit` becomes `quota` (`getLimit` → `get`)** — rename, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
limit: { getLimit: (ctx) => ({ current: count(ctx), max: 3 }), fallback: Upgrade },
```

After (1.0):

```ts
quota: { get: (ctx) => ({ current: count(ctx), max: 3 }), fallback: Upgrade },
```

Why: `limit` read like pagination; it is the number of records that may be created.

By hand: A `fallback` component receives `{ quota }` instead of `{ limit }`; the runtime context parameter `limit` is `quota`; `useLimit` is `useQuota`.

### RV1-DATA-005

**`resourceBuild`, `onChange` and `@type` are no longer declared** — remove, rewritten by `migrate`.

Before (0.x):

```ts
{ resourceBuild: false, … }
```

After (1.0):

```ts
{ … }
```

Why: What the library builds was offered in the autocompletion of what one writes.

Note: `resource.onChange` still exists on the built resource.

### RV1-DATA-006

**Writes are drawn before the API answers (`optimistic`)** — semantic, by hand.

Before (0.x):

```ts
createViewResource("tasks", { path: "/api/tasks" })
// 0.x: a deleted row stays until the API has answered
```

After (1.0):

```ts
createViewResource("tasks", {
  path: "/api/tasks",
  views: { delete: { optimistic: false } }, // as in 0.x, for deletions
})
```

Why: Every write waited for the API before anything moved, and only the board's drag and drop did otherwise.

By hand: Nothing to rewrite, but the perceived behaviour changes: a saved form, a deleted row, a cell edited in place, a card moved and the writes of `bulkActions` made through their `mutation` argument show in the list before the API answers — a created row appears, marked as being saved, before it has an id. A refusal puts the row back with a toast; a form keeps the API's violations on its fields. Declare `optimistic: false` at the root of a resource, or on one action (`views.delete: { optimistic: false }`) where the list must wait for the server — an in-place edit and a card moved are updates.

Note: The API's answer replaces the guess as soon as it comes (generated id, computed fields); several writes to one record show the last one; a list read again while a write is in flight — a realtime push — keeps the row as written. `useResourceMutation(resource)` gives an application's own actions the same optimism and rollback; `BulkActionInterface.onAction` receives it as its second argument.

## Scopes, menus and defaults

### RV1-SCOPE-001

**A resource no longer declares its `scope`: the scope lists it in `resources`** — move, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
createViewResource("tasks", { scope: "admin", … })
// adminScope.tsx
resources: [tasksResource]
```

After (1.0):

```ts
createViewResource("tasks", { … })
// adminScope.tsx
resources: [tasksResource]
```

Why: The scope was declared three times: `resource.scope`, `scope.resources` (which nothing read) and `createItemMenuWithResource({ scope })`.

By hand: Make sure every resource the codemod reports is listed in the `resources` of its scope (`npx react-resource-view migrate` prints them). A resource listed nowhere links within the current scope.

Note: The scope stamps its resources when it loads; `resource.scope` is still readable on the built resource.

### RV1-SCOPE-002

**A scope's `menu` takes resources directly, or `"auto"`** — semantic, rewritten by `migrate`.

Before (0.x):

```ts
menu: [createItemMenuWithResource({ resource: usersResource })]
```

After (1.0):

```ts
menu: [usersResource] // or menu: "auto"
```

Why: `createItemMenuWithResource` ran when the scope module was read, before any scope was known: without `resource.scope`, its links would point at the wrong area.

Note: The codemod rewrites the calls found in a `menu` (or a group's `items`). `createItemMenuWithResource` is still exported, for menus built outside a scope — pass it the `scope` then.

### RV1-SCOPE-003

**`setResourceConfig({ defaultResource })` becomes `configureResourceView({ defaults })`** — rename, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
setResourceConfig({
  defaultResource: {
    views: { [ActionList.update]: { behavior: { openIn: "popup" } } },
  },
})
```

After (1.0):

```ts
configureResourceView({ defaults: { views: { update: { open: "dialog" } } } })
```

Why: The merge was shallow — passing a `defaultResource` erased the default components (the table…) — and `defaultResource.views` was read for `openIn` only, the rest silently ignored. `defaults` has the shape of a declaration and is merged deeply into every resource.

By hand: `getResourceConfig` is gone; read the defaults with `getResourceViewDefaults()`.

## Types

### RV1-TYPE-001

**What one writes is `ResourceDefinition`, what the library builds is `ViewResource`** — rename, rewritten by `migrate`, then checked by hand.

Before (0.x):

```ts
import type { ViewResourceInterface } from "react-resource-view"
```

After (1.0):

```ts
import type { ViewResource } from "react-resource-view"
```

Why: `ResourceOptionInterface = Partial<ViewResourceInterface>` offered `resourceBuild`, `onChange`, `@type` and the repository methods in the autocompletion. The new public types drop the `Interface` suffix.

By hand: Code reading a built resource's old keys (`resource.canUpdate`, `resource.view`) must read `resource.permissions` and `resource.views`.

### RV1-TYPE-002

**`ViewInterface`, `ViewListInterface`, `ViewUpdateInterface` are replaced** — semantic, by hand.

Before (0.x):

```ts
const UPDATE: ViewUpdateInterface<Task> = { … }
```

After (1.0):

```ts
const UPDATE: UpdateViewDefinition<Task> = { … }
```

Why: One type per action, so each only offers what has an effect there.

By hand: A declaration fragment is typed with the definition of its action (`UpdateViewDefinition<Task>`); a component reading the context's view gets a `ResolvedView`.

### RV1-TYPE-003

**The context's `view` is the resolved view** — semantic, by hand.

Before (0.x):

```ts
const view = useCurrentViewResourceContext().view
view.name
view.grid
```

After (1.0):

```ts
const { view } = useCurrentViewResourceContext()
view.title
useLayout().options.columns
```

Why: The context exposes what the declaration means, with the same words.

By hand: Custom components reading the context's view: `view.name` → `view.title`, `view.rowComponent` → `view.components.row`, `view.viewVariants` → `view.layouts`, a layout's options (`view.identifierKey`, `view.grid`…) → `useLayout().options`, `view.behavior.openIn` → `view.open`.

## Not changed

- `createViewResource` keeps its name, and so do the dialects, `configureApi`,
  `configurePorts`, `ResourceViewProvider`, `AdminLayout`, `generateLink` and
  the routing: URLs are the same — `?variant=` included, for layouts whose
  label matched their type (RV1-LAYOUT-009).
- Forms are still `react-data-form`'s `FormInterface`, with one addition on the
  declaration side: an input set to `false` removes an inherited field.
- `ActionList` is still accepted wherever an action is expected.

# react-resource-view

## 1.1.0

### Minor Changes

- d3a7625: refactor: the optional `react-resource-view/styles.css` theme now follows the Hermez design system, not shadcn's neutral greys

  Visible only to applications that import the library's stylesheet; an application with its own shadcn variables sees nothing change.

  - Colours: warm "stone" greys (background `#fafaf9`, cards `#ffffff`, text `#1c1917`, secondary text `#57534e`, borders `#e7e5e4`, fields `#d6d3d1`), an orange primary `#bf4a02` under white text, the brand orange `#e46212` as focus ring, and `#fff6ee` as highlight. The `.dark` block keeps the same hue (background `#0c0a09`, primary `#ff8b44`). The destructive red is `#b91c1c`, so the destructive button reaches 4.5:1.
  - New tokens: `--success`, `--info`, `--glory` and `--warning` (the `success`, `info`, `glory` and `warning` buttons and badges had no colour until now), `--chart-1` to `--chart-5`, and the typography variables `--typeface-heading`, `--typeface-body`, `--typeface-mono`, `--heading-weight`, `--heading-tracking` (with `font-heading`, `font-sans` and `font-mono` mapped to them).
  - Radius: `--radius` goes from `0.875rem` to `0.75rem`, and `--radius-2xl` to `--radius-4xl` now derive from it — buttons, selects and badges stay pills, slightly tighter, and follow a custom `--radius`.
  - Shadows: `shadow-sm`, `shadow-md` and `shadow-lg` are tinted with the theme's text colour, lighter than Tailwind's.
  - No font is shipped and no rule restyles the application's headings: `--typeface-heading` names Bricolage Grotesque, used only if the application loads it. The variables stay in `@layer base`, so the application's own still win.

### Patch Changes

- c0e4eb4: fix(views): the table keeps its row actions in sight when it is wider than the screen, instead of pushing them out of view

  - The actions column and its header are `position: sticky` on the right edge, opaque, with a shadow on their left; the buttons are at least 40 px wide and tall. A fade on the table's edges tells that columns are hidden on that side.
  - `layout.table({ stickyActions: false })` leaves the actions in the flow; `layout.table({ stickyFirstColumn: true })` also pins the first column to the left.

## 1.0.0

### Major Changes

- 60d41c1: 1.0: a declaration that reads once and makes sense without the documentation.
  Breaking changes, each one rewritten by `npx react-resource-view migrate` or
  explained step by step in `MIGRATION-1.0.md`; `migrations/1.0.json` is the same
  list as data, for a script or an AI to apply.

  - **One place per notion.** `view` is gone: what every action shares — `form`,
    `fullWidth`, `titleField`, `components`, `description` — sits at the root of
    the resource; what belongs to one action sits in `views.list | read | create |
update | delete`, each typed with only the options that have an effect there.
    Root, action and layout are merged deeply, so `views.update` says only what
    differs, and `inputs: { notes: false }` removes an inherited field. Actions
    are plain strings (`views.update`, `rowActions: ["read"]`); `ActionList` is
    still accepted.
  - **Permissions.** `canRead`, `canList`, `canCreate`, `canUpdate`, `canDelete`
    and `behavior.canExport` become one `permissions` object — `"all"`,
    `"readonly"`, a list of actions, or a boolean or a function per action.
    Everything is allowed by default, so the shortest declaration has all its
    buttons. A function is told the record (`({ item }) => item.status !== "done"`)
    and may answer asynchronously; answers are cached per record while a list is
    on screen. A refused action also protects its route: `/books/update/1` draws
    the scope's `forbiddenFallback` instead of the form. `canList` is now read for
    the list (it was ignored). `usePermission(action, item)` and
    `useAllowedActions(actions, item)` are added; `permissionResource` takes
    `{ item, context }` and may return a promise.
  - **`behavior` is gone**, each option moved to where it has an effect:
    `openIn` → `views.<action>.open` (`"page"`, `"dialog"`, `"drawer"`);
    `closeAfterUpdate`, `refreshDataAfterUpdate`, `redirectToAfterUpdate` → one
    `afterSave: "close" | "stay" | "reload" | { redirect: (item) => string }`;
    `rowActions` → `views.list.rowActions`; `eventSourced` → `realtime` at the
    root; `openRecordIn` → `views.read.open`; `selectable`, `bulkActions` →
    `views.list.selectable`, `views.list.bulkActions`, for every layout of the
    list (`bulkActions` also takes `"delete"`).
  - **Layouts.** `viewVariants` becomes `views.list.layouts`, and the seven
    factories one `layout` namespace: `layout.table()`, `layout.cards({ columns })`,
    `layout.board({ groupBy, columns })`, `layout.calendar({ dateField })`,
    `layout.timeline({ startField, endField, groupBy })`, `layout.split({ readInList })`,
    `layout.items()` and `layout.custom()` for one's own (read its options with
    `useLayout()`). Field options are checked against the resource's item type —
    a typo is a TypeScript error — and share one suffix: `titleField`,
    `dateField`, `colorField`, `statusField`. A layout's URL id is its type, so a
    new label breaks no shared link; `fields` picks a layout's columns.
  - **Data.** Without `path`, `storage: "local"` must be declared: a forgotten
    path no longer turns into localStorage silently. `preGetCollection`,
    `preGetItem`, `preCreate`, `preUpdate` become `hooks.beforeList`,
    `beforeRead`, `beforeCreate`, `beforeUpdate`, joined by `beforeDelete`,
    `afterSave` and `afterDelete`; hooks may be asynchronous and always receive
    the view context — creations and updates used to lose it on the way to the
    repository. Hand-written repository methods move to `repository: { … }`.
    `limit` becomes `quota: { get, fallback }` (`useLimit` → `useQuota`).
  - **Titles and components.** `name` is declared once; titles are derived and
    overridden with `views.<action>.title`, a button's text with `buttonLabel`.
    `viewComponent` and the other `xxxComponent` keys, and `decoratorComponent`,
    become one `components` object (`view`, `wrapper`, `top`, `bottom`, `empty`
    — ex `noResult` —, `pagination`, `navigation`, `title`, `actions`).
  - **Tabs.** `subViewResource` becomes `views.read | update.tabs: { orientation,
aside, items }`, a tab being `{ id, label, resource, filter: ({ item }) => … }`
    instead of an `onInitViewResource` returning the whole context.
  - **Scopes and defaults.** A resource no longer names its `scope`: the scope's
    `resources` ties them, and `menu: "auto"` (or a list mixing resources, links
    and groups) builds the navigation. `setResourceConfig({ defaultResource })`
    becomes `configureResourceView({ defaults })`, merged deeply into every
    resource, including those declared before it is called.
  - **Types.** `ResourceDefinition` is what one writes, `ViewResource` what the
    library builds; `ViewResourceInterface`, `ResourceOptionInterface`,
    `ViewInterface` and the factory option interfaces are replaced.
  - **Optimistic writes.** Every write going through a resource's repository —
    a form saved, a row deleted, a cell edited in place, a card moved, the
    writes of a bulk action made through its new `mutation` argument — is drawn
    before the API answers: the row changes at once (a created one appears,
    marked as being saved), the API's answer replaces it as soon as it comes,
    and a refusal puts it back with a toast — a form keeps the API's violations
    on its fields. Several writes to one record show the last one; a list read
    again while a write is in flight (a realtime push) keeps the row as
    written. On by default — a change of perceived behaviour —, turned off with
    `optimistic: false` at the root or per action
    (`views.delete: { optimistic: false }`). `useResourceMutation(resource)`
    gives an application's own actions the same optimism and rollback
    (`create`, `update`, `remove`, `mutate`, `isPending`), and `RowInterface`
    gains `pending`. Built on the library's own state rather than React 19's
    `useOptimistic`: no new requirement on the React version.
  - **One routed opening.** `views.<action>.open` is resolved once, and anything
    but `"page"` is written into the URL under the view it was opened from
    (`…/tasks/list/tasks/update/12`, filter and layout kept): a row's button —
    now a real link —, a board's card and a link typed by hand open the same
    frame, Back closes it, a reload opens it again over the same list, and a
    save closes it by going back to that URL. A list reads itself again once per
    save, instead of once per button of its rows. `layout.board({ openRecord,
expandable })` is gone: a card opens the record's `read` view where
    `views.read.open` says — on its page by default, where it used to open
    nothing.
  - **Frames of one's own.** `open.custom({ type, placement, component })`, on
    the model of `layout.custom()`: the component receives the title, the view,
    `close` and the link to the full page. `placement: "inline"` draws the view
    under the row that opened it in a table, a plain list or a card grid — a
    `layout.custom()` says it can with `supports: ["inline"]` and draws
    `<InlineChildView row={row} />` — and falls back to a dialog elsewhere, with
    a warning in development. `configureResourceView({ open: { accordion } })`
    registers a frame under a name, typed through the `OpenFrames` interface.
  - **"Open in full page".** A `read` or `update` view opened in a frame has a
    link to the same view on its page beside the close button, a real
    `<a href>` that Ctrl/Cmd+click opens in a new tab. `expandable: false` on
    the view takes it away; `create` and `delete` do not have it unless they say
    `expandable: true`.
  - **Checked in development.** `createViewResource` and `layout.*` throw on a key
    they do not read — with the closest key, or the exact 1.0 rewrite of a 0.x
    one — on a resource with no data source, a board without `groupBy`, two
    layouts sharing a URL id, and warn about a title identical to the derived
    one. Nothing is checked in production.
  - **Command line.** `npx react-resource-view migrate [paths]` rewrites 0.x
    declarations (`--dry-run`, `--check`); `create-view-variant` writes a
    `layout.custom()` file; `init` starts on the 1.0 syntax.

### Minor Changes

- 29ce470: feat(views): a list sorts by its column headers, selects its records in every layout and says when it could not load, not only on the board and not with an empty list

  - `views.list.sort: { fields, initial }`: the table's headers of the fields named sort ascending, then descending, then not at all (`aria-sort`); the sort goes to the API through the dialect, into the URL, and survives "Clear the search". `useSort()` gives the same to a layout of one's own.
  - **Breaking (1.0):** `selectable` and `bulkActions` leave `layout.board()` for `views.list`, and reach every layout: checkboxes on the table's rows (and "Select all" in its header), the cards and the items. `bulkActions` accepts `"delete"`, which deletes the selection after a confirmation, as far as `permissions.delete` allows. `selectable` defaults to `true` on a board and wherever bulk actions are declared. `npx react-resource-view migrate` rewrites both (RV1-BEHAV-006, RV1-LAYOUT-014).
  - A view whose records could not be loaded draws what the API answered and "Try again" (`components.error` replaces it), rather than "An error occurred" in a list, or an empty form that could be saved over the record. `loadError` on the view context holds what the request threw.

- e7e7654: Moving to another view shows that the click was heard, instead of nothing until
  the next view appears at once: a thin bar runs along the top of the screen, in
  the theme's primary colour, until the new view has its data, and the view fades
  in, sliding up a few pixels. No new dependency.

  - The bar waits 150 ms, so an instant navigation flashes nothing, then stays
    300 ms at least; it runs quickly, then slower, and fills up when the view is
    there. The loading view is marked `aria-busy`, the bar has
    `role="progressbar"`, and neither takes the focus.
  - Under `prefers-reduced-motion: reduce`, the view fades without moving.
  - `ResourceViewProvider` takes `navigationLoader` — a node, a component
    receiving `{ isNavigating }`, or `false` for nothing — and `viewTransition`
    (`true` by default).
  - Any router works: a navigation counts from a click on a link of the library,
    or a call to its `navigate`, until the new view has loaded. The navigation
    port takes an optional `useIsNavigating`, which the TanStack adapter reads
    from `useRouterState`.
  - `useIsNavigating()`, `useDelayedVisibility()` and `NavigationProgressBar` are
    exported, for an indicator drawn elsewhere.

## 0.15.0

### Minor Changes

- b1f8272: Open a card of a board, select several and move them together, instead of only
  dragging one card at a time onto a column.

  - `behavior.openRecordIn` (`"drawer"`, `"popup"` or `"window"`) makes the whole
    card clickable — hover and focus states, Enter from the keyboard — and opens
    the record's `read` view: in a panel on the right or a dialog, both written
    into the URL as a child view of the list (`…/tasks/list/tasks/read/12`, which
    `parseLink` now reads), so the link is shareable and Back closes it; or on
    the record's own page, through `generateLink`. The panel has a way to edit the
    record, traps the focus and gives it back to the card.
  - A button, a link, a menu, a checkbox or a drag handle drawn in a card keeps
    its click, without any `stopPropagation`: the card only opens on a click that
    lands on none of them (`data-card-control` marks anything else), and not when
    text is being selected.
  - Cards can be selected — checkbox, Ctrl/Cmd+click, Shift+click for a range, a
    long press on a phone, Escape to clear — and a bar offers "Move to…",
    `behavior.bulkActions` and "Deselect all". Dragging a selected card moves the
    whole selection under an "N cards" preview. Each record is updated through
    the repository and drawn in its new column at once; one that fails goes back,
    and a message says how many could not be moved. `behavior.selectable: false`
    turns selection off.
  - Each column scrolls on its own, and an empty column shows where to drop.

- d970551: Add a Django REST Framework dialect: `djangoDialect()` reads DRF's
  `{ count, next, previous, results }` page (or a bare array when the view has no
  paginator), pages with `page` / `page_size` — or `limit` / `offset` with
  `pagination: "limit-offset"` — sorts with `ordering=-field`, sends filters as
  query parameters for django-filter, addresses a record at `/articles/{id}/` with
  DRF's trailing slash, and pins a 400's `{ field: ["message"] }` on its input.
  Options: `primaryKey`, `pagination`, `pageSizeParam`, `defaultItemsPerPage`,
  `orderParam` and `trailingSlash`.

  `npx react-resource-view init -b django` starts a back office on it, dumping the
  schema drf-spectacular serves at `/api/schema/?format=json`.

### Patch Changes

- 9582599: `init` writes the `react-data-form`, `react-mini-i18n`, `resource-registry` and
  `@tanstack/react-router` ranges from the package's own `peerDependencies`, so a
  generated starter installs without `--legacy-peer-deps` instead of failing with
  `ERESOLVE` on a hard-coded `react-data-form@^0.2.1` against a `^0.1.0` peer.
- 35a40a9: A record saved from a button opening over a list (`openIn: "popup"` or
  `"drawer"`) reads the list again with the filter it has now, instead of the one
  the button mounted with — a list filtered on « A », then on « B », no longer
  shows the rows of « A » under « B » after a save. The buttons of every row also
  share a single request instead of each reading the list again.

## 0.14.0

### Minor Changes

- 642aac2: Add a FastAPI dialect: `fastapiDialect()` lists, reads, creates, updates and
  deletes against a standard FastAPI CRUD router, instead of showing empty lists
  under the JSON-LD default.

  A page is `skip` / `limit`, as in the FastAPI tutorial, or `page` / `size` with
  `pagination: "page-size"` for fastapi-pagination, whose `{ items, total }`
  drives the page count; a bare array hides the pagination. A sort is
  `order_by=-created_at,title`, an array filter repeats its parameter, and a 422
  lands under the field its `loc` names — `["body", "address", "city"]` on
  `address.city`. Options: `primaryKey`, `pagination`, `defaultItemsPerPage`,
  `orderParam` and `trailingSlash`.

- 5dfb920: Add `npx react-resource-view init`: it starts a back office on your API — API
  Platform, Spring Boot, another REST API, Supabase, Strapi or FastAPI — with the
  dialect wired, the URL in `.env`, and `api-schema` / `api-schema:check` scripts
  that dump the OpenAPI schema into TypeScript with api-dumper.

  Add a Spring Boot dialect: `springDialect()` pages with `page` (from 0) and
  `size`, sorts with `sort=field,desc`, reads a `Page`, a `PagedModel` or Spring
  Data REST's HAL, and pins Bean Validation errors on their field.

### Patch Changes

- ef36d4e: Capitalise the first letter of each view name in the view switcher, so a
  `board` or `vue d'ensemble` tab reads `Board` and `Vue d'ensemble`, custom and
  translated names included — the rest of the label is left as written.

## 0.13.0

### Minor Changes

- 1a4b81b: Recognize a 401 or a 403 thrown by a scope's `authorization` from its `status`,
  not only from `UnauthorizedError` and `ForbiddenError`. Any error carrying
  `status: 401` calls `onUnauthorized`, any error carrying `status: 403` renders
  the `forbiddenFallback`: an auth library no longer has to import the classes,
  and two copies of `react-resource-view` in one bundle still agree. No other
  status is recognized, and errors recognized today behave as before.

### Patch Changes

- 6cd82c4: Save a card moved to another column of a board kept in the local repository,
  instead of answering "Une erreur est survenue" and putting the card back.

  The drop sent only the short identifier of the record (`12`), which the local
  repository compared to the `@id` it keys records on (`/tasks/12`) and never
  found. It now finds the dropped row again and sends the whole identity the
  dialect reads it by — `@id` and `id` for JSON-LD, `documentId` for Strapi, the
  primary key for Supabase — so every repository addresses the record as before.
  A card dropped back into its own column sends nothing.

  The error a failed update shows is now the translatable key `An error occurred`,
  also used when a list or a calendar fails to load, rather than a French sentence.
  Applications translating `Une erreur est survenue` should add the new key.

- 1d323a6: Keep a column of the columns view at its width when one of its cards holds a
  long unbreakable word (a path, a URL, an identifier). As a flex item, the
  column was never narrower than its widest content: once a parent sized the
  columns, it grew around the word and slid under its neighbours. The column is
  now `min-w-0` and the content of a record card `break-words`, so the word wraps
  inside the card instead.
- 29e5142: Keep the horizontal sub-view bar inside the page and level with the side column when `subViewResource` has one, instead of pushing the page sideways and starting 4rem below the column.

  The sub-view track was a bare `1fr`, which is never narrower than what it holds —
  and the bar is as wide as all its tabs, a table in a tab as wide as its columns.
  The track is now `minmax(0, 1fr)` and the tabs container `min-w-0`, so the bar
  scrolls inside the width left beside the column, as it already did without one.

  The bar was also meant to stay pinned under the top bar while a long sub-view
  scrolls, but the scroll area's root sets `position: relative` inline, which beat
  its `sticky` class: the bar never stuck, and its `top` offset moved it down
  instead. The bar is now pinned from a wrapper of its own.

- 47c7df9: Keep the horizontal sub-view tab bar within its column when
  `subViewResource.viewComponent` draws a left column beside it. The tabs' grid
  track grew to the width of the whole row of tabs, so the bar never scrolled:
  the last tabs were cut off and the page itself overflowed to the right. The bar
  now scrolls sideways as it does without a left column; the vertical menu and
  records without a left column render as before.

## 0.12.0

### Minor Changes

- 1b184f0: Let a scope's `authorization` wait for a real session — `authClient.getSession()`, a `/me` call — instead of having to answer synchronously, and keep the scope hidden until it has.

  `authorization` may now return `boolean | Promise<boolean>`; a synchronous
  function works as before. Nothing of the scope renders while it is pending:
  `authorizationFallback` shows instead, the page loader by default. An
  `UnauthorizedError`, thrown or rejected, still calls `onUnauthorized`. A
  `ForbiddenError`, thrown or rejected, or a `false` result, now renders
  `forbiddenFallback` — an "Access denied" message by default — where a
  `ForbiddenError` used to reach the error boundary and a `false` was ignored.
  Both fallbacks are accepted on the scope and on the provider configuration,
  the scope's winning.

  The check runs again when the scope changes, and on demand through
  `recheckAuthorization()` from `useScopeContext()`, so a sign-out is taken into
  account without a reload. An answer that arrives after the scope changed is
  ignored.

- dcd05f1: Pin a block at the bottom of `AdminLayout`'s sidebar — "Need help?", support, documentation — instead of leaving its footer empty with no way to fill it.

  `AdminLayout` and `createAdminLayout` now take `footerMenu`, menu entries drawn
  like the scope's `menu` under an optional `footerMenuTitle`, and
  `sidebarFooter`, any node rendered below them. An entry whose `href` is
  absolute leaves the application: a web page opens in a new tab, a `mailto:`
  hands over to the mail client. On narrow screens both go behind a last entry of
  the bottom bar, named after `footerMenuTitle` ("More" without one), which opens
  them in a drawer. Without either option the sidebar renders no footer, as
  before.

### Patch Changes

- 2f8da83: Leave out the foot of a record card — its separator and the padding under it — when the resource permits none of the row's actions, instead of ending the card on a stray line above an empty strip.

  The card layout now reads which actions a row offers (`behavior.rowActions`,
  then `canUpdate`, `canDelete`…) before drawing their bar, as the calendar and
  timeline preview already did. A card with at least one permitted action is
  unchanged.

## 0.11.0

### Minor Changes

- 509f297: Name the record on screen in `AdminLayout`, instead of an empty top bar above a bare "Edit a user".

  The top bar now carries a breadcrumb — the scope's `label`, the resource, the
  record — where it used to hold nothing but the sidebar toggle. On a record, the
  page header links back to the list, takes the record's name as its title (read
  from `title`, `name` or `label`, or from the view's new `titleKey`), says the
  action and the id underneath, and offers the actions still worth having there:
  edit from the read page, delete from either — deleting goes back to the list.

  A view overrides the title with `components.title` and the actions with
  `components.actions`; `components.navigation` still replaces the whole header.

- e9b26ae: Give a board, a calendar or a wide table the whole page in `AdminLayout`, instead of the column every view was squeezed into.

  A view now takes `fullWidth`. Set on a resource's `view`, it covers every action
  of the resource; on one of `views`, that action; on a list variant built by a
  `*ViewOptionFactory`, that variant only. The most specific declaration wins, so
  a resource drawn full width keeps its forms narrow with
  `views: { update: { fullWidth: false } }`, and a board can be the one wide
  layout of a list whose table stays in the column. `AdminLayout` drops its width
  constraint for such a view and keeps its side margins; nothing changes for a
  view that does not ask.

  `isFullWidthView` resolves the option for the view on screen, for a
  `decoratorComponent` of one's own that wants to honour it too.

### Patch Changes

- caa2c75: Light the sidebar entry of the page `AdminLayout` opens on, and unfold the group of the page on screen, instead of leaving the reader to find either.

  A scope opened bare — `/playground`, `?view=admin` — shows the page its
  `defaultViewResourceContextParams` name, but its URL names none, so no entry
  was lit until the reader clicked on one. `useIsActiveItemMenu` now takes that
  default view, and `AdminLayout` hands it the scope's.

  A sub-entry on screen now unfolds its group, even one the reader had folded on
  an earlier visit, and marks it with the accent colour, without the background
  the page itself carries. The entry on screen also carries `aria-current="page"`.

- 0b22ae2: Fold the admin sidebar away, and keep a menu entry lit on the page it points at.

  Two things `AdminLayout` got wrong on the screen it is mostly read on. The top
  bar's button only ever opened the mobile drawer, so on a wide screen — the one
  place it is shown — pressing it did nothing; it now folds the sidebar column
  away and back.

  And a menu entry was matched against the address bar as a string, which held
  only while the URL was exactly the one the entry was built from: opening a
  record of a resource turned its entry off, and in query mode an application
  whose views are mounted somewhere other than the configured `basePath` never
  lit any entry at all. The comparison is now made context by context — scope,
  resource, record — so an entry pointing at a list stays lit for everything
  inside that list, while two entries on the same resource (its list, its
  creation form) stay distinguishable.

## 0.10.0

### Minor Changes

- a52d64d: Give a scope a ready-made admin shell instead of writing one from scratch.

  Every project reached for the same `decoratorComponent`: a collapsible sidebar
  built from the scope's `menu`, a top bar, a page header with sub-navigation
  tabs, and a bottom bar on narrow screens instead of the sidebar. `AdminLayout`
  is that shell, exported so a scope only needs to point at it:

  ```ts
  const adminScope: ScopeInterface = {
    name: "admin",
    decoratorComponent: AdminLayout,
    menu: [createItemMenuWithResource({ resource: articlesResource })],
  }
  ```

  `createAdminLayout({ logo, topBarEnd })` builds a configured variant when the
  host wants a logo or actions in the top bar — `decoratorComponent` only ever
  receives `children`, so `AdminLayout` itself takes no props there.

## 0.9.0

### Minor Changes

- fa4c785: Read the sub-views of a record without three rows of buttons in the way.

  The tab bar wrapped onto as many lines as the tabs needed, and cut every label
  to twelve characters below `md` to limit the damage — a record with eight
  sub-views pushed its content off a phone screen before a word of it was read.
  The bar now stays on one line and scrolls sideways, labels whole.

  `subViewResource.orientation: "vertical"` is the other shape: the tabs go down
  a column beside the sub-view, which is what a record with a dozen of them
  wants — the whole menu is read at once, and it follows the reader down the
  page. Below `md` the column would leave the sub-view a third of the screen, so
  it falls back to the scrolling bar there; the same declaration reads both ways.

## 0.8.0

### Minor Changes

- 7120675: Open a small window on a calendar event or a timeline bar.

  Clicking one used to print every key of the record — `@context`, `@id` and the
  dates already written on the event included — which is a data dump rather than a
  preview. What opens now names the event, dates it in one line, summarises it in
  at most five fields labelled the way the resource's `form.inputs` labels them,
  and hands over to the row's actions for the rest.

  The summary is the variant's `rowComponent`, which both layouts now default to
  `PreviewRowComponent` instead of `DumpRowComponent`: a resource with something
  better to show still declares its own, exactly as in the card and list layouts.

### Patch Changes

- f974887: Keep a list header on one line when its description is long.

  The header laid the name, the layout switcher and the create button side by
  side, each free to wrap on its own. A resource introduced by a full sentence
  took the whole width for it, and the create button was pushed alone onto the
  line below, floating under the tabs.

  The text now yields instead of pushing — it is the flexible part of the line —
  and the switcher, the export and the create button form a single bar, so the
  width that does run out takes the whole bar down, never one button of it.

## 0.7.0

### Minor Changes

- ec43323: Open an action in a drawer.

  `behavior: { openIn: "drawer" }` joins `"popup"` and `"window"`: the view slides
  in as a panel rather than replacing the page or sitting in the middle of it.
  From the right on a desktop, up from the bottom below the `md` breakpoint —
  where a thumb reaches — and swiped away towards the side it came from.

  The panel is as tall as the screen, which is what a long form wants: a record
  with a dozen fields is filled in without the list behind it going anywhere. Like
  a dialog, it closes itself on the resource's `onChange` rather than navigating
  after a creation.

- 089e9df: Give a list a header of its own.

  The create button, the export button and the layout switcher used to be stacked
  above the rows as three loose controls, and the resource's `icon` — already used
  by the menu and by the sub-view tabs — appeared nowhere on the screen it belongs
  to. They are now one line: the icon, the view's `name` and its `description` on
  the left, the layout switcher beside them, the actions on the right.

  Nothing is declared for it: a resource that names no icon simply shows none, and
  a list nested inside another view — a sub-view tab — leaves the naming to
  whatever contains it. The filter bar is untouched.

- 32cac69: Add a command that scaffolds a view variant.

  `npx react-resource-view create-view-variant Heatmap --dir src/views` writes one
  file — the list, row and item components, the factory that declares them and the
  options interface to extend — where the project keeps its views. Run bare, it
  asks for the name and the directory; `--icon`, `--jsx`, `--force`, `--dry-run`
  and `--yes` cover the rest.

  Nothing about declaring a variant changes: the generated factory goes into
  `viewVariants` beside the built-in ones.

## 0.6.0

### Minor Changes

- 2ea49a4: Speak Strapi and Supabase, not only JSON-LD.

  The views assumed one API family everywhere: a collection was `member` and
  `totalItems`, an item carried its own IRI in `@id`, a page was `page` and
  `itemsPerPage`, a validation failure was a list of `violations`. Every one of
  those is now a decision an **API dialect** makes, and three ship with the
  package:

  ```ts
  import { configureApi, strapiDialect } from "react-resource-view"

  configureApi({
    baseUrl: "https://cms.example.com",
    getAuthToken: () => getUserToken(),
    dialect: strapiDialect(),
  })
  ```

  - `jsonLdDialect()` — API Platform and Hydra. The default, and it still goes
    through the client of `jsonld-api-client`, so an application already talking
    to API Platform needs no change at all.
  - `strapiDialect()` — Strapi v4 and v5. `pagination[page]`, `filters[field][$eq]`,
    `sort[0]`, `populate`, writes wrapped in `data`, and the v4 `{ id, attributes }`
    envelope flattened so both versions read alike.
  - `supabaseDialect({ apiKey })` — Supabase, over PostgREST. `limit`/`offset`,
    `field=eq.value`, `order`, the count read from `Content-Range`, rows addressed
    by their primary key, and writes that ask for the stored row back.

  A resource may also declare a `dialect` of its own, for an application reading
  two backends at once. Filters, pagination and sorting are written once, in the
  package's own vocabulary, and the dialect translates them.

  JSON-LD is now an option rather than an assumption: a relation is only
  dereferenced as an IRI where the dialect says relations are IRIs, no Mercure
  subscription is opened against a backend that runs no hub, and the CSV export
  button hides itself where the API serves no CSV.

- a6582d3: A row now offers update and delete. Read is gone from the default, and which
  actions a row draws is a view's decision — `view.behavior.rowActions`.

  **This changes what an existing list renders.** A row is already the record —
  the table edits it in place, the other layouts draw it in full — so a button
  whose only job is to show the same fields again was not earning the width it
  took. Put it back where the detail view carries more than the list does:

  ```ts
  tableViewOptionFactory({
    behavior: {
      rowActions: [ActionList.read, ActionList.update, ActionList.delete],
    },
  })
  ```

  Permissions still apply on top: an action listed there without the matching
  `can*` renders nothing.

  `ListResourceViewButton` had two implementations — one exported from the entry
  point, one declared inside `ResourceViewButton.tsx` and used by the table. The
  duplicate is gone; both now resolve to the same component.

  The dialog's close button carried a hard-coded French label, which no
  dictionary could reach. It goes through `Trans` like every other string.

### Patch Changes

- dbdb70e: Stop overwriting `document.title` when `ownsDocumentHead` is `false`.

  The port says the host application declares its own head, but the title was
  still written imperatively from an effect. Any page embedding a view — a
  documentation page, a dashboard panel — ended up carrying the name of the
  embedded view instead of its own.

- a6582d3: Keep the chosen layout when a list navigates to itself.

  Selecting a row in the split view switched the reader to the table. Two things
  lost the variant on the way:

  - `generateLink` never serialised it, so the URL the split view navigated to
    said nothing about which layout it came from. It now carries `?variant=<id>`,
    and `parseLink` reads it back.
  - `useResolvedViewParams` rebuilds the context field by field, and
    `viewVariantId` was not among them — so a variant handed to
    `ResourceViewProvider`, or read off the URL, was dropped before it reached the
    view. Both now come through.

  Every layout that renders a record in full — card, item list, columns, split —
  draws it in a frame of its own and offers the row's actions, instead of handing
  the bare `rowComponent` to the page.

  The columns layout wrapped each row a second time before passing it on, so the
  row component received an object whose every field was `undefined` and the board
  drew blank cards. Columns also gained a count, an empty state, and a drop
  target that highlights only the column under the pointer.

  The timeline's `colorByStatus` was declared by the factory and read by nobody;
  bars now take their colour from it. Its two footer counts were adjacent bare
  text nodes — a single anonymous flex item — so they read as one glued sentence
  rather than sitting at either end.

- 8520b8c: Make a form opening in a dialog behave like one.

  `behavior: { openIn: "popup" }` drew a dialog with no name, introduced by
  whatever sentence the _list_ had been given — every action inherits the
  resource's `view`, description included — and a creation made from it
  navigated straight out of the page the dialog sat on, taking the list, its
  filters and its page with it.

  - A popup is now titled by the view it opens, which assistive technology
    announces and a reader can read; the list's description stays on the list.
  - After a creation in a popup nothing navigates: the dialog closes on the
    resource's `onChange` and the list refreshes underneath. On a screen of its
    own the move to the new record's edit view is unchanged — and now builds its
    link in the resource's own scope, instead of walking out of the area it was
    made in.
  - A view an action does not name is called after that action: a resource whose
    list is "Coffee beans" edits "Edit — Coffee beans" rather than a second
    "Coffee beans". A name the action declares is left alone.
  - The delete confirmation speaks English — "Supprimer ?", "Annuler" and the
    error toast were shipped in French and never went through `react-mini-i18n` —
    and no longer repeats the name of the view that frames it.
  - Cards of one row line their actions up on the bottom edge, instead of leaving
    each set of buttons wherever its record happened to end.

## 0.5.0

### Minor Changes

- 29b4a50: Stop shipping French. The calendar and the timeline formatted their dates with
  a hardcoded `fr` date-fns locale, started their weeks on Monday and sorted their
  rows with a French collation, and three labels were written in French. Dates now
  follow the `dateLocale` port — English (US) by default — which also decides the
  first day of the week and the collation:

  ```ts
  import { fr } from "date-fns/locale"
  configurePorts({ dateLocale: fr })
  ```

  `getDateLocale()` and `getWeekStartsOn()` read it back.

  **Breaking for applications relying on the former defaults:** "Aujourd'hui"
  became "Today", "Nettoyer la recherche" became "Clear the search", and dates are
  formatted in English until `dateLocale` is set. Translate the new labels through
  `react-mini-i18n`, as with every other label of the package.

## 0.4.1

### Patch Changes

- a684375: Keep what the user picks while the list is fetching. A request landing used to
  write the whole view context back — the one captured when it left — so a layout
  chosen from the variant tabs, or a filter applied, was reverted a few
  milliseconds later. Requests now bring back rows only, `setViewResource` accepts
  an updater like React's own setters, and the variant tabs are controlled, so the
  highlighted tab is always the layout on screen.

  The timeline's footer counts are translatable, and the header of its row column
  can be named with `groupsLabel`.

## 0.4.0

### Minor Changes

- Add `ownsDocumentHead`, to stop competing with a host router over the head.

  `MetaResource` always wrote the page's title, canonical and social tags. That
  is right for a single-page application, where nothing else does — but a
  server-rendered host declares metadata per route, and both writing it leaves
  the page with two of every tag. A crawler reads whichever came first, which is
  the host's, so the views' work was both invisible and harmful.

  Set `ownsDocumentHead: false` when the host router owns the head. The title is
  still kept in step as the visitor moves between views. It defaults to true, so
  existing applications are unaffected.

## 0.3.1

### Patch Changes

- Build page metadata without reading `window`.

  `MetaResourceComponent` took the canonical URL from `window.location`. There is
  no `window` on a server, so it threw while rendering the one element a crawler
  always reads — and React answered by abandoning the server render entirely,
  returning an empty document.

  It now reads the path from the navigation port, which a router answers on both
  sides.

## 0.3.0

### Minor Changes

- 730b568: Initial release: CRUD views for JSON-LD / Hydra APIs — list, read, create,
  update and delete — in table, card, column, split, calendar or timeline
  layouts, wired to the API and to the URL.

  The package knows no router: it asks for four navigation primitives through
  `configurePorts`, and ships an adapter for TanStack Router on the `/tanstack`
  subpath. Applications on another router install nothing extra.

- 6101570: The view context can now live entirely in the query string.

  `configurePorts({ routing: { mode: "query", basePath: "/docs.html" } })` writes
  links as `/docs.html?view=admin/articles/update/42` instead of
  `/admin/articles/update/42`. It exists for static hosting, where a deep path has
  no server to answer it and returns 404, and for embedding the views in a page
  whose path is not yours to control.

  `parseLink` reads a URL carrying the routing parameter as query mode whatever
  the configuration says, so a link shared from a statically hosted page keeps
  working wherever it is opened.

- Add `useIsActiveItemMenu`, which works while rendering on a server.

  `isActiveItemMenu` reads `window.location`. There is no `window` on a server,
  so it threw mid-render; React caught it, silently fell back to rendering in the
  browser, and left an empty document behind — a page that looks fine to a
  visitor and empty to anything that only reads the markup.

  The new hook asks the navigation port instead, which a router can answer on
  either side, and returns a predicate so a menu can test every entry.
  `isActiveItemMenu` no longer throws off the browser, but reports every entry as
  inactive there; prefer the hook wherever the markup is rendered on a server.

### Patch Changes

- f946e39: `isActiveItemMenu` now works in query mode.

  It compared `window.location.pathname` against the entry's href. In query mode
  the context lives in the query string, so the pathname is the same for every
  page and no entry was ever marked active.

- 36efeea: Fix `filter` and `defaultData` losing everything after a reserved character.

  They were serialised with `encodeURI`, which leaves `&`, `=` and `#` untouched.
  A value such as `{ title: "Tom & Jerry" }` produced
  `?defaultData={"title":"Tom & Jerry"}`, where the ampersand ended the parameter
  and the rest was read as a stray one. `encodeURIComponent` escapes them.

  Links written with the previous encoding still parse, so bookmarks and shared
  URLs keep working.

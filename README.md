<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/rrv-logo-dark.svg">
    <img src="assets/logo/rrv-logo.svg" alt="React Resource View — A Hermez product" height="64">
  </picture>
</p>

<p align="center">
  <a href="https://hermez.dev/react-resource-view/playground/">
    <img src="diagrams/hero.png" alt="react-resource-view — declare a resource, get the whole CRUD: list, detail, create, edit and delete as a table, cards, a board, a split view, a calendar or a timeline, wired to API Platform, Spring Boot, Strapi, Supabase, FastAPI or Django and to the URL" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/react-resource-view"><img alt="npm" src="https://img.shields.io/npm/v/react-resource-view?color=3b7dd8&label=npm"></a>
  <a href="https://github.com/hermez-agency/react-resource-view/blob/main/LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-f0a35a"></a>
  <a href="https://hermez.dev/react-resource-view/"><img alt="Documentation" src="https://img.shields.io/badge/docs-hermez.dev-7c5cff"></a>
  <a href="https://hermez.dev/react-resource-view/playground/"><img alt="Playground" src="https://img.shields.io/badge/playground-live-3ecf8e"></a>
</p>

# react-resource-view

**Documentation: [hermez.dev/react-resource-view](https://hermez.dev/react-resource-view/)**

CRUD views for REST APIs — API Platform, Spring Boot, Supabase, Strapi,
FastAPI, Django, or any REST API that publishes OpenAPI. You declare a resource — its
path, its form, its layout — and the package renders the list, the detail, the
create and edit forms, and the delete confirmation, wired to the API and to the
URL.

```tsx
import { createViewResource, layout } from "react-resource-view"

const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  form: { inputs: { title: { label: "Title" }, body: { label: "Body" } } },
  views: {
    list: { layouts: [layout.table(), layout.cards({ columns: 3 })] },
  },
})
```

That is the whole declaration: a list with its buttons, a detail page, create
and edit forms and a delete confirmation — every action offered unless
`permissions` restricts it, every field name checked against `Article`.

> **Upgrading from 0.x?** 1.0 rewrote the declaration:
> `npx react-resource-view migrate` rewrites yours,
> [MIGRATION-1.0.md](MIGRATION-1.0.md) lists every change, and
> [`migrations/1.0.json`](migrations/1.0.json) the same list as data.

Built on [`react-data-form`](https://github.com/hermez-agency/react-data-form)
for the forms. Which API answers, and how it spells a page or a filter, is a
[dialect](#connecting-an-api) — JSON-LD is the default, not a requirement.

Two libraries, one idea: `react-data-form` for the forms, `react-resource-view`
for the application around them.
[Watch the 1-minute tour](https://hermez.dev/react-resource-view/videos/two-libraries.mp4)
(with sound).

<p align="center">
  <a href="https://hermez.dev/react-resource-view/videos/two-libraries.mp4">
    <img src="website/public/videos/two-libraries-poster.jpg" alt="Describe your app. Don't draw it. — a one-minute tour of react-data-form and react-resource-view" width="100%">
  </a>
</p>

## See it in action

A page builder declared as data: blocks on the left, the live page on the
right, and the JSON behind it. [Watch the full video (with sound)](https://hermez.dev/react-resource-view/videos/page-builder.mp4)
or [open the page builder](https://hermez.dev/react-resource-view/playground/builder/).

<p align="center">
  <a href="https://hermez.dev/react-resource-view/videos/page-builder.mp4">
    <img src="diagrams/page-builder-demo.gif" alt="The page builder: typing a new title on the left re-renders the hero of the page on the right, live" width="100%">
  </a>
</p>

## Documentation

Everything below, at length and with the examples running rather than quoted:
[the documentation site](https://hermez.dev/react-resource-view/docs/resource-view/)
— a page per layout, per filter, per dialect — and a
[playground](https://hermez.dev/react-resource-view/playground/):
a whole back office built from eight resource declarations, every edit real,
every screen a URL, and the source of each screen one click away.

[![The playground's table layout: an Articles list with its layout switcher, its filter bar, and rows of titles, authors, categories, statuses and dates, each editable in place and each offering open, edit and delete](diagrams/react-resource-view.playground.png)](https://hermez.dev/react-resource-view/playground/)

## Architecture

[![The pieces of react-resource-view and how they fit together](diagrams/react-resource-view.png)](https://hermez.dev/react-resource-view/architecture.html)

A resource is declared once and registered. The URL says which resource, which
action and which filters; the context resolves that into a view, fetches through
the resource's own repository, and renders. The package never talks to a router
itself, nor to one API in particular: the router arrives through
`configurePorts`, the API through `configureApi`.

The picture above is a still of an interactive diagram:
[open it](https://hermez.dev/react-resource-view/architecture.html)
to trace a relationship, focus a component, or follow the four guided views.

## Connecting an API

The views know a resource has rows, pages and filters. How a given backend
spells those — the URL an item lives at, the query string a filter becomes, the
envelope a collection arrives in, where the validation errors hide — is a
**dialect**, set once at startup:

```ts
import { configureApi, strapiDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://cms.example.com",
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
  dialect: strapiDialect(),
})
```

Resources read the dialect at each request, so `configureApi` may run before or
after the modules declaring them.

| Dialect             | Backend               | What it knows                                                                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `jsonLdDialect()`   | API Platform, Hydra   | `member` / `totalItems`, IRIs, `page` and `itemsPerPage`, Hydra `violations`, Mercure, CSV export                              |
| `strapiDialect()`   | Strapi v4 and v5      | `pagination[page]`, `filters[field][$eq]`, `sort[0]`, `populate`, writes under `data`, `documentId`                            |
| `supabaseDialect()` | Supabase, PostgREST   | `limit` / `offset`, `field=eq.value`, `order`, the count in `Content-Range`, `Prefer: return=representation`                   |
| `fastapiDialect()`  | FastAPI               | `skip` / `limit` or `page` / `size`, plain query filters, `order_by=-field`, `{ items, total }`, 422 `detail`                  |
| `springDialect()`   | Spring Boot           | `page` (from 0) / `size`, `sort=field,desc`, `Page`, `PagedModel` or HAL `_embedded`, Bean Validation errors                   |
| `djangoDialect()`   | Django REST Framework | `page` / `page_size` or `limit` / `offset`, django-filter query filters, `ordering=-field`, `{ count, results }`, field errors |

JSON-LD is the default, so an application already talking to API Platform needs
none of this — and keeps going through the client it configured with
`configureClient` (see [The rest of the configuration](#the-rest-of-the-configuration)).

### Strapi

```ts
import { configureApi, strapiDialect, createViewResource } from "react-resource-view"

configureApi({
  baseUrl: "https://cms.example.com",
  getAuthToken: () => getApiToken(),
  dialect: strapiDialect(),
})

const articles = createViewResource("articles", {
  path: "articles", // → /api/articles
  name: "Articles",
  form: { inputs: { title: { label: "Title" } } },
  views: { list: { pageSize: 25 } },
})
```

`strapiDialect` takes `apiPath` (default `/api`), `populate` (default `"*"` —
without it the relation columns come back empty), `identifier` (`documentId` on
v5, `id` on v4) and `defaultOperator` (`$eq`; pass `$containsi` to make every
text filter a case-insensitive search). The v4 `{ id, attributes }` envelope is
flattened on the way in, so a resource declared once reads the same on both
versions.

### Supabase

```ts
import {
  configureApi,
  supabaseDialect,
  createViewResource,
} from "react-resource-view"

configureApi({
  baseUrl: "https://xyzcompany.supabase.co",
  getAuthToken: () => getSession()?.access_token,
  dialect: supabaseDialect({ apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY }),
})

const articles = createViewResource("articles", {
  path: "articles", // → /rest/v1/articles
  name: "Articles",
  form: { inputs: { title: { label: "Title" } } },
})
```

`supabaseDialect` takes `apiKey` (a value or a function), `primaryKey` (default
`id` — PostgREST addresses a row by a filter on it, having no item route),
`select` (default `*`; `"*,author(*)"` embeds a relation), `schema`,
`defaultTextOperator` and `restPath`.

### FastAPI

```ts
import {
  configureApi,
  fastapiDialect,
  createViewResource,
} from "react-resource-view"

configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => getAccessToken(),
  dialect: fastapiDialect(),
})

const items = createViewResource("items", {
  path: "items", // → /items, /items/{id}
  name: "Items",
  form: { inputs: { title: { label: "Title" } } },
})
```

`fastapiDialect` takes `primaryKey` (default `id`), `pagination`
(`"skip-limit"`, the default, or `"page-size"` for
[fastapi-pagination](https://github.com/uriyyo/fastapi-pagination)),
`defaultItemsPerPage` (default `30`), `orderParam` (default `order_by`, sent as
`-created_at,title`) and `trailingSlash` (default `false`; set it when the
collection route is declared as `/items/`, or FastAPI answers with a 307
redirect). A 422 lands under the field its `loc` names —
`["body", "address", "city"]` on the `address.city` input; a `detail` spelled
as a sentence becomes the error's explanation.

A route the dialect reads as it stands, as in the FastAPI tutorial — a bare
array carries no total, so the pagination hides itself:

```python
@app.get("/items", response_model=list[Item])
def list_items(skip: int = 0, limit: int = 30, order_by: str | None = None):
    return repository.list(offset=skip, limit=limit, order_by=order_by)

@app.get("/items/{item_id}", response_model=Item)
def read_item(item_id: int): ...

@app.post("/items", response_model=Item)
def create_item(item: ItemCreate): ...

@app.patch("/items/{item_id}", response_model=Item)
def update_item(item_id: int, item: ItemUpdate): ...

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int): ...
```

With fastapi-pagination the list answers `{ items, total, page, size, pages }`,
and the pagination counts its pages from `total` — pass
`fastapiDialect({ pagination: "page-size" })`:

```python
from fastapi_pagination import Page, add_pagination, paginate

@app.get("/items", response_model=Page[Item])
def list_items():
    return paginate(repository.all())

add_pagination(app)
```

### Spring Boot

```ts
import { configureApi, springDialect, createViewResource } from "react-resource-view"

configureApi({
  baseUrl: "http://localhost:8080",
  getAuthToken: () => getAccessToken(),
  dialect: springDialect(),
})

const books = createViewResource("books", {
  path: "/api/books", // → /api/books?page=0&size=20, /api/books/{id}
  name: "Books",
  form: { inputs: { title: { label: "Title" } } },
})
```

A controller taking a `Pageable` and returning a `Page` needs nothing more: the
dialect reads `content` and `totalElements`, the `page` block of a `PagedModel`,
or Spring Data REST's `_embedded` — a record whose id is hidden is addressed
by its `_links.self.href`. `springDialect` takes `primaryKey` (default `id`),
`defaultItemsPerPage` (default `20`) and `updateMethod` (`"PUT"`, the default, or
`"PATCH"`). A failed `@Valid` lands each `errors[].field` on its input, and a
`ProblemDetail` gives the error its title and explanation.

### Django

```ts
import { configureApi, djangoDialect, createViewResource } from "react-resource-view"

configureApi({
  baseUrl: "http://localhost:8000",
  getAuthToken: () => getAccessToken(),
  dialect: djangoDialect(),
})

const articles = createViewResource("articles", {
  path: "/api/articles", // → /api/articles/?page=1&page_size=30, /api/articles/{id}/
  name: "Articles",
  form: { inputs: { title: { label: "Title" } } },
})
```

A `ModelViewSet` with a paginator answers `{ count, next, previous, results }`;
the dialect reads `results` and counts its pages from `count`. A view without
pagination answers a bare array, which carries no total, so the pagination hides
itself. `djangoDialect` takes `primaryKey` (default `id`), `pagination`
(`"page-number"`, the default, or `"limit-offset"` for
`LimitOffsetPagination`), `pageSizeParam` (default `page_size`, which DRF only
reads when the paginator sets `page_size_query_param`), `defaultItemsPerPage`
(default `30`), `orderParam` (default `ordering`, sent as `-created_at,title`)
and `trailingSlash` (default `true`, as DRF's routers declare it; Django
redirects the other spelling and the redirect loses the body of a POST). A 400
lands each message under its field — `{ address: { city: [...] } }` on
`address.city`, `non_field_errors` on the form — and a `detail` becomes the
explanation of the error. The schema comes from
[drf-spectacular](https://drf-spectacular.readthedocs.io) at
`/api/schema/?format=json`.

### Two backends at once

A resource may carry a dialect of its own, which wins over the configured one:

```ts
const invoices = createViewResource("invoices", {
  path: "invoices",
  dialect: supabaseDialect({ apiKey }),
})
```

### Filters, pages and sorts

They are written once, in the package's own vocabulary, and the dialect
translates them:

| Key                 | Means                                 | Strapi                 | Supabase          | FastAPI                     | Django                      |
| ------------------- | ------------------------------------- | ---------------------- | ----------------- | --------------------------- | --------------------------- |
| `page`              | 1-based page                          | `pagination[page]`     | `offset`          | `skip` (or `page`)          | `page`                      |
| `itemsPerPage`      | rows per page (`views.list.pageSize`) | `pagination[pageSize]` | `limit`           | `limit` (or `size`)         | `page_size` (or `limit`)    |
| `order`             | `{ title: "asc" }`                    | `sort[0]=title:asc`    | `order=title.asc` | `order_by=title` (`-title`) | `ordering=title` (`-title`) |
| `title: "hello"`    | a field                               | `filters[title][$eq]`  | `title=eq.hello`  | `title=hello`               | `title=hello`               |
| `status: ["a","b"]` | any of                                | `filters[status][$in]` | `status=in.(a,b)` | `status=a&status=b`         | `status=a&status=b`         |

A value spelled as an object carries its own operator through untouched —
`{ title: { $containsi: "hell" } }` on Strapi, `{ createdAt: { gte: "2024-01-01" } }`
on Supabase.

### Another API entirely

A dialect is one object — `buildRequest`, `readCollection`, `readItem`,
`getId`, `getIdentifier`, `normalizeError` — and `ApiDialectInterface` is
exported to implement it. A resource that brings its own `repository: {
getCollection, getItem, … }` still bypasses all of this, as it always could.

### Typing resources from OpenAPI

Rather than copying the API's types into hand-written interfaces, export the
OpenAPI schema your API publishes (`/api/docs.jsonopenapi` on API Platform,
`/openapi.json` on FastAPI, where the Pydantic models become
`components["schemas"]`), and generate the types with
[api-dumper](https://github.com/hermez-agency/api-dumper):

```bash
pnpm add -D api-dumper typescript
```

```ts
// api-dumper.config.ts
import { defineConfig } from "api-dumper"

export default defineConfig({
  source: "http://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform", // only on API Platform
  strip: { contentTypes: ["text/csv"] },
})
```

`npx api-dumper` writes `openapi.json`, `api-schema.ts` and one file per enum under
`enums/`, all to commit; `npx api-dumper --check` fails the CI when they are out of
date.

`paths` types the client, `components["schemas"]` types the resources:

```ts
import type { components } from "./src/api-schema/api-schema"

// API Platform's JSON-LD schema carries the "@id" an item needs; on another
// backend, intersect the schema with { "@id": string }.
type Article = components["schemas"]["Article.jsonld"]

const articles = createViewResource<Article>("articles", {
  path: "/api/articles",
  // `inputs`, `titleField`, `layout.board({ groupBy })`… are checked against
  // Article: a field that does not exist is a TypeScript error.
  form: { inputs: { title: { label: "Title" } } },
})
```

The whole recipe — the config, the enums, the per-backend
specifics for API Platform, Strapi, Supabase, FastAPI and Django, and when to regenerate — is on
[the documentation site](https://hermez.dev/react-resource-view/docs/resource-view/openapi-types/).

## Start a project

One command writes a whole back office on your API — Vite, React, Tailwind,
TanStack Router, the admin layout and one example resource — and asks for the
rest:

```bash
npx react-resource-view init my-admin
```

It asks which API the back office talks to — API Platform, Spring Boot,
another REST API, Supabase, Strapi, FastAPI or Django — its URL, and the URL of its
OpenAPI schema, guessed from the backend (`/api/docs.jsonopenapi`,
`/v3/api-docs`, `/openapi.json`, `/api/schema/?format=json`). The dialect is wired in `src/setup.ts`, the URL
lands in `.env`, and the project comes with the commands that dump the schema
into TypeScript with [api-dumper](https://github.com/hermez-agency/api-dumper):

```bash
npm run api-schema         # or: make api-schema — writes src/api-schema/
npm run api-schema:check   # in the CI: fails when src/api-schema is stale
```

One starter per technology, ready to paste:

| Backend        | Command                                                                           | Schema dumped from         |
| -------------- | --------------------------------------------------------------------------------- | -------------------------- |
| API Platform   | `npx react-resource-view init my-admin -b api-platform -u https://localhost`      | `/api/docs.jsonopenapi`    |
| Spring Boot    | `npx react-resource-view init my-admin -b spring-boot -u http://localhost:8080`   | `/v3/api-docs`             |
| Other REST API | `npx react-resource-view init my-admin -b rest -u http://localhost:3000 -s <url>` | the URL you pass           |
| Supabase       | `npx react-resource-view init my-admin -b supabase -u https://<ref>.supabase.co`  | `supabase gen types`       |
| Strapi         | `npx react-resource-view init my-admin -b strapi -u http://localhost:1337`        | `/api/openapi.json`        |
| FastAPI        | `npx react-resource-view init my-admin -b fastapi -u http://localhost:8000`       | `/openapi.json`            |
| Django         | `npx react-resource-view init my-admin -b django -u http://localhost:8000`        | `/api/schema/?format=json` |

Every question has a flag — `--backend spring-boot --api-url http://localhost:8080
--schema-url … --yes` — see `npx react-resource-view init --help` and
[the starter page](https://hermez.dev/react-resource-view/docs/resource-view/starter/).
Writing your API in Python? [FastAPI and Django side by side](https://hermez.dev/react-resource-view/docs/resource-view/python/).

## Installation

```bash
pnpm add react-resource-view react-data-form react-mini-i18n resource-registry
```

`react`, `react-data-form`, `react-mini-i18n` and `resource-registry` are peer
dependencies. The last two own module-level singletons — a dictionary and a
registry — so they must resolve to a single copy.

### Styles

The components use [Tailwind CSS v4](https://tailwindcss.com) classes backed by
the shadcn theme variables. Tailwind must scan the compiled files:

```css
@import "tailwindcss";
@source "../node_modules/react-resource-view/dist";

/* Only if your application has no shadcn theme of its own */
@import "react-resource-view/styles.css";
```

## Connecting a router

The views navigate and build links, but the package knows no router. It asks
for four primitives — a fifth, optional, [says when it is
loading](#between-two-views) — and ships an adapter for
[TanStack Router](https://tanstack.com/router):

```ts
import { configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })
```

With any other router, supply the four yourself:

```ts
configurePorts({
  navigation: {
    useNavigate: () => { /* ({ to, replace, resetScroll }) => void */ },
    useLocation: () => ({ pathname, searchStr }),
    Link: ({ to, children, ...rest }) => <RouterLink to={to} {...rest}>{children}</RouterLink>,
    Navigate: ({ to, replace }) => <RouterRedirect to={to} replace={replace} />,
  },
})
```

Left unconfigured, navigation falls back to full page loads through the History
API. Enough for a test or a story, not for production.

Importing `react-resource-view/tanstack` is what pulls TanStack Router in — the
core never references it, so an application on another router installs nothing
extra.

### Between two views

Moving to another view takes the time the next one needs to load — its code,
its permissions, its data. Meanwhile a thin bar runs along the top of the
screen, in the theme's `--primary`, and the new view fades in, sliding up a few
pixels, once it is there. Nothing to install: React and inline styles.

- The bar waits 150 ms before showing, so an instant navigation flashes nothing,
  then stays 300 ms at least. It runs quickly, then slower and slower, and fills
  up only when the new view has its data.
- Under `prefers-reduced-motion: reduce`, the view fades without moving.
- The loading view is marked `aria-busy`, the bar has `role="progressbar"`;
  neither takes the focus.

A navigation counts from a click on a link of the library, or a call to its
`navigate`, until the new view has loaded. A router that knows more says so
through the optional `useIsNavigating` of the navigation port — the TanStack
adapter reads `useRouterState(s => s.status === "pending")`.

```tsx
<ResourceViewProvider
  configuration={{
    // a node, a component receiving { isNavigating }, or false for nothing
    navigationLoader: ({ isNavigating }) => <PageLoader isLoading={isNavigating} />,
    viewTransition: false, // true by default
  }}
/>
```

`useIsNavigating()` gives the raw signal, `useDelayedVisibility()` the delay
and minimum duration, and `NavigationProgressBar` the default bar, for an
indicator drawn elsewhere.

## The rest of the configuration

```ts
configurePorts({
  appName: "My application", // page title suffix
  description: "…", // page metadata
  appUrl: "https://app.example.com", // absolute links escaping an iframe
  isDev: import.meta.env.DEV, // development affordances
})
```

The API connection is configured separately, through
[`configureApi`](#connecting-an-api). On the JSON-LD dialect it can also come
from the client itself, which is what an existing API Platform application
already does:

```ts
import { configureClient } from "jsonld-api-client"

configureClient({
  baseUrl: "https://api.example.com",
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
  getScope: () => getCurrentScope(),
})
```

`configureApi` falls back to those settings when it is given none of its own,
so nothing has to move.

## Admin layout

A scope's `decoratorComponent` wraps every view of that scope. `AdminLayout` is
a ready-made one — a collapsible sidebar built from the scope's `menu`, a top
bar with a breadcrumb, a page header naming the record on screen, and a bottom
bar instead of the sidebar on a phone:

```ts
const adminScope: ScopeInterface = {
  name: "admin",
  label: "Back office",
  decoratorComponent: createAdminLayout({ logo: <MyLogo />, topBarEnd: <UserMenu /> }),
  // The one place a resource's scope is written: its links lead here.
  resources: [tasks, users],
  // One entry per resource; or a list mixing resources, links and groups.
  menu: "auto",
}
```

Links kept out of the way of the pages — help, support, documentation — are
pinned at the bottom of the sidebar with `footerMenu` (an absolute `href` opens
in a new tab), or any node with `sidebarFooter`; on a phone they go behind a
last entry of the bottom bar:

```ts
createAdminLayout({
  footerMenuTitle: "Need help?",
  footerMenu: [{ name: "Documentation", href: "https://example.com/docs" }],
})
```

Views sit in a column of constrained width; a board, a calendar or a wide table
takes the whole page with `fullWidth` — at the root of the resource, on one
action of `views`, or on a single layout, the most specific one winning:

```ts
createViewResource<Task>("tasks", {
  path: "/api/tasks",
  fullWidth: true,
  views: {
    list: { layouts: [layout.board({ groupBy: "status", columns: STATUSES })] },
    // The forms keep the column.
    update: { fullWidth: false },
  },
})
```

[The admin layout
page](https://hermez.dev/react-resource-view/docs/resource-view/admin-layout/)
goes through the navigation, the slots and the theme; the
[playground](https://hermez.dev/react-resource-view/playground/?view=admin/admin_tasks/list)
runs on it, its task board full width.

## The declaration

What is common to every action sits at the root of the resource; what belongs
to one action sits in `views.<action>`, and the two are merged deeply — a view
only says what differs:

```ts
export const tasks = createViewResource<Task>("tasks", {
  name: "Tasks",
  icon: ListTodo,
  path: "/api/tasks",
  fullWidth: true,
  // Everything is allowed by default: only restrictions are declared.
  permissions: {
    delete: ({ item }) => item?.status !== "done",
  },
  form: { inputs: TASK_FIELDS }, // shared by create, update and read
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [
        layout.board({ groupBy: "status", columns: TASK_STATUSES }),
        layout.table({ fields: ["title", "status", "dueDate"] }),
      ],
    },
    read: { open: "drawer" }, // a row's button and a card of the board alike
    update: { fullWidth: false, open: "dialog", afterSave: "close" },
  },
})
```

| Key                                                            | Where                                      | What it does                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `name`, `icon`                                                 | root                                       | The menu, the titles (derived: "Tasks", "Edit — Tasks"), the breadcrumb                                |
| `path`                                                         | root                                       | The API path — or `storage: "local"` to keep the records in the browser, or a `repository`             |
| `permissions`                                                  | root                                       | `"all"` (default), `"readonly"`, a list of actions, or one boolean / function per action               |
| `hooks`                                                        | root                                       | `beforeList`, `beforeRead`, `beforeCreate`, `beforeUpdate`, `beforeDelete`, `afterSave`, `afterDelete` |
| `realtime`                                                     | root                                       | Reloads the views when the API pushes a change (Mercure)                                               |
| `quota`                                                        | root                                       | How many records may be created: `{ get: (ctx) => ({ current, max }), fallback }`                      |
| `form`, `fullWidth`, `titleField`, `components`, `description` | root or `views.<action>`                   | Merged deeply, the action winning; `inputs: { notes: false }` removes a field                          |
| `title`, `buttonLabel`                                         | `views.<action>`                           | The view's title, when the derived one will not do; the text of its button                             |
| `open`                                                         | `views.read`, `create`, `update`, `delete` | `"page"`, `"dialog"`, `"drawer"` or `open.custom()` — written into the URL, see below                  |
| `afterSave`                                                    | `views.create`, `update`                   | `"close"`, `"stay"`, `"reload"` or `{ redirect: (item) => string }`                                    |
| `tabs`                                                         | `views.read`, `update`                     | Sub-views under the record: `{ items: [{ resource, filter: ({ item }) => … }] }`                       |
| `layouts`, `filters`, `pageSize`, `rowActions`                 | `views.list`                               | How the list is drawn, filtered, paged, and what its rows offer                                        |

Dropping a card in another column of a board asks `permissions.move`, which
answers as `update` unless it is declared: `{ update: false, move: true }`
moves the cards without offering the edit form.

In development, `createViewResource` checks the declaration: a key it does not
read, a 0.x key or a resource with no data source throws an error that says how
to write it.

### Permissions

They decide what the interface offers — the API stays where access is enforced.
A refused action hides its buttons and protects its route: `/books/update/1`
draws the scope's `forbiddenFallback` instead of the form. A function is told
the record, and may answer asynchronously; the answers are cached per record
while a list is on screen. In a component, `usePermission("delete", record)`.

### Where a view opens

`views.<action>.open` is decided once, by the view. Anything but `page` is
written into the URL under the view it was opened from —
`…/tasks/list/tasks/update/12`, with the list's filter and layout — so a row's
button, a board's card and a shared link open the same frame, Back closes it, a
reload opens it again, and a save closes it by going back to the list's URL.

A frame of your own is built like a layout of your own:

```tsx
import { open } from "react-resource-view"

const accordion = open.custom({
  type: "accordion",
  placement: "inline", // under the row that opened it; or "overlay"
  component: ({ title, children, close, expandHref }) => (
    <Collapsible open onOpenChange={close}>
      <h3>{title}</h3>
      {children}
    </Collapsible>
  ),
})

views: {
  read: {
    open: accordion
  }
}
```

`configureResourceView({ open: { accordion } })` registers it under a name
(`open: "accordion"`, typed by augmenting the `OpenFrames` interface). `inline`
is drawn under the row by a table, a plain list and a card grid — a
`layout.custom()` says it can with `supports: ["inline"]` and draws
`<InlineChildView row={row} />`; elsewhere the frame falls back to a dialog,
with a warning in development.

## Layouts

A list renders through one or several layouts, from the `layout` namespace:

| Declaration                                     | Layout                                 |
| ----------------------------------------------- | -------------------------------------- |
| `layout.table()`                                | Data table, editable in place          |
| `layout.cards({ columns })`                     | Card grid                              |
| `layout.board({ groupBy, columns })`            | Kanban board, one column per value     |
| `layout.split()`                                | List on the left, details on the right |
| `layout.calendar({ dateField })`                | Calendar, by day, week or month        |
| `layout.timeline({ startField, endField })`     | Timeline, grouped by row               |
| `layout.items()`                                | Plain item list                        |
| `layout.tree({ parentField })`                  | Records under their parent             |
| `layout.map({ latitudeField, longitudeField })` | A marker per record on a map           |
| `layout.chart({ groupBy })`                     | Figures and a chart over the records   |
| `layout.custom({ type, components })`           | A layout of your own                   |

Several layouts can coexist on one resource; the view keeps the reader's choice
in the URL, under the layout's type (`?variant=board`) — a label of its own
(`label: "Kanban"`) does not change it. Every layout takes `fields` (the
columns, the lines of a card), `label`, `icon`, `fullWidth` and `components`.

### Boards: opening, selecting, moving

A card of a board opens the record's `read` view where `views.read.open` says,
and several cards move together. The selection is the list's: declared once on
`views.list`, it holds for every layout — table, cards, items, board:

```tsx
views: {
  list: {
    // On by default when there are bulk actions; a board stays selectable
    // for "Move to…" unless `selectable: false`.
    selectable: true,
    // In the bar a selection brings up — beside "Move to…" on a board.
    // `"delete"` is the built-in deletion of the selected records.
    bulkActions: [
      { label: "Archive", onAction: (records) => archive(records) },
      "delete",
    ],
    layouts: [layout.board({ groupBy: "status", columns: STATUSES })],
  },
}
```

- **Opening** — the whole card is clickable and reachable with Tab, Enter opens
  it, where `views.read.open` says: over the board — with a way to edit it — at
  the same URL as the row's read button, or on the record's page.
- **Controls first** — a button, a link, a menu, a checkbox or a drag handle in
  the card keeps its click (or anything marked `data-card-control`); selecting
  text does not open the card either.
- **Selecting** — the checkbox on hover, Ctrl/Cmd+click, Shift+click for a range
  in a column, a long press on a phone; Escape clears it.
- **Moving** — drag a selected card to carry the whole selection, or use
  “Move to…”. One update per record through the repository, drawn at once; a
  card whose update fails goes back to its column, and a message says how many.

### A layout of your own

A layout is a `layout.custom()` call over three components, so the ninth layout
is a single file — and one command writes it:

```bash
npx react-resource-view create-view-variant Heatmap --dir src/views
```

Run it bare and it asks for the name and the directory. It writes
`src/views/heatmapLayout.tsx`: the list, row and item components, the function
that declares them, and the options interface to extend — read back in the
components with `useLayout().options`. Nothing is registered anywhere — declare
it in `layouts` beside the built-in ones:

```ts
import heatmapLayout from "./views/heatmapLayout"

views: {
  list: { layouts: [layout.table(), heatmapLayout()] },
}
```

`--icon <LucideIcon>` picks the switcher's icon, `--jsx` writes JavaScript,
`--dry-run` prints the file instead of writing it, and `--yes` never asks — see
`npx react-resource-view --help`. [Create your own view
variant](https://hermez.dev/react-resource-view/docs/resource-view/custom-variant/)
takes the generated file apart, and runs one.

## Filters

`filters.inputs` declares the filter form, and `filters.initial` the filters
applied as long as the URL carries none of its own. Both are written in the
package's own vocabulary; the [dialect](#filters-pages-and-sorts) translates
them for the API:

```ts
views: {
  list: {
    filters: {
      inputs: { published: { label: "Published" } },
      initial: { published: true },
    },
  },
}
```

The distinction matters: a `defaultValue` on a filter input would not do, since
the first request goes out before the form exists — the list would then show
something other than what the filters display.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

### The architecture diagram

The diagram is generated by [archify](https://github.com/tt-a1i/archify) from
`diagrams/react-resource-view.architecture.json`. The renderer is installed
rather than vendored; `skills-lock.json` records the version it came from:

```bash
npx skills add tt-a1i/archify --skill archify --agent claude-code --copy
ARCHIFY=.claude/skills/archify/bin/archify.mjs

# Rebuild the interactive artefact the documentation site serves
node $ARCHIFY deliver architecture \
  diagrams/react-resource-view.architecture.json \
  website/public/architecture.html --quality showcase

# Recapture the still the README shows, and keep the 2048x1320 light one
node $ARCHIFY visual-check website/public/architecture.html
cp website/public/architecture.visual-check.2048x1320.light.png \
  diagrams/react-resource-view.png
rm website/public/architecture.visual-check.*
```

`deliver` refuses to write an artefact that fails its own layout and
composition checks, so a diagram that lands is a diagram that reads.

## Author

A Hermez product — [hermez.dev](https://hermez.dev).

## License

MIT

A Hermez product

---
title: "Connect API Platform to a React admin panel: lists, forms and real time with React Resource View"
description: "A React and TypeScript admin panel for an API Platform API (JSON-LD, Hydra) without writing the CRUD screens: types generated from OpenAPI, a resource declared once, an admin menu and Mercure live updates."
date: 2026-11-26
lang: en
translation: api-platform-react-admin
tags:
  - Use case
  - API Platform
  - React
  - Admin panel
  - TypeScript
---

You have an API built with API Platform and you need an admin panel: list records, filter them, create, edit and delete them. The usual reflex is to write a table, then forms, then wire up Hydra pagination, IRIs and validation messages, one resource after another. This article shows the shortest path with React Resource View, which speaks JSON-LD and Hydra out of the box: from the API to a React admin in TypeScript, with generated types instead of copied ones.

The example manages `articles`, with fictional data. It assumes an API running on `https://api.example.com` that exposes `/api/articles`.

## What the library understands about API Platform

An API Platform collection responds with `application/ld+json`: records are in `member`, their count in `totalItems`, each record carries an `@id` (its IRI, for example `/api/articles/7`), and a validation error comes back as `violations`. React Resource View's JSON-LD dialect reads all of that: pagination (`page` and `itemsPerPage`), IRIs, violations shown on the matching fields, and the Mercure channel for real time. There is nothing to configure to turn it on: it is the default dialect.

## 1. Install and configure API access

```bash
npm i react-resource-view react-data-form react-mini-i18n resource-registry
```

Then, once, before the first render:

```ts
import { configureApi } from "react-resource-view"

configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => localStorage.getItem("token") ?? undefined,
})
```

The token is added to every request, and passed to Mercure as well. If your application already configures `jsonld-api-client` with `configureClient`, it keeps working as is: `configureApi` picks up its settings when you don't give it any.

## 2. Types that come from the API

Copying the `Article` interface by hand is the best way to let it drift away from the API. API Platform publishes its OpenAPI schema; the [api-dumper](https://github.com/hermez-agency/api-dumper) tool generates TypeScript types from it:

```bash
pnpm add -D api-dumper typescript
```

```ts
// api-dumper.config.ts
import { defineConfig } from "api-dumper"

export default defineConfig({
  source: "https://api.example.com/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform",
  strip: { contentTypes: ["text/csv"] },
})
```

`npx api-dumper` writes the types to `src/api-schema/`; `npx api-dumper --check` fails in CI when they no longer match the API. This step is optional: without it, just declare an interface by hand.

## 3. Declare the resource

A declaration says where the resource lives and which fields it has. Those fields are both the table columns and the fields of the create and edit forms:

```ts
import { createViewResource, layout } from "react-resource-view"
import type { components } from "./api-schema/api-schema"

// The item is typed with the shape the API returns: in JSON-LD, it carries "@id".
type Article = components["schemas"]["Article.jsonld"]

export const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  realtime: true,
  form: {
    inputs: {
      title: { label: "Titre", required: true },
      author: { label: "Auteur" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Chercher un titre" } } },
      layouts: [layout.table(), layout.cards({ columns: 3 })],
    },
  },
})
```

The keys of `form.inputs` are checked against the `Article` type: a field that does not exist in the schema becomes a TypeScript error, not an empty column found during QA. The title search filter ("Chercher un titre") is sent to API Platform as a query parameter (`title=…`), so it assumes the matching filter is enabled on the API side, and it is written to the URL: a copied link reproduces the same list.

The list is shown as a table or as cards, as the user chooses, without reloading the data:

![The Articles list in the playground: layout switcher, filter bar and editable table, with demo data](/blog/brancher-api-platform-react-back-office-playground.png "The React Resource View playground, with fictional articles")

## 4. A menu and an admin page

A resource's screens live in a *scope*, which declares its resources and wraps their views in a side menu, a breadcrumb and, on mobile, a bottom bar:

```ts
import { createAdminLayout, type ScopeInterface } from "react-resource-view"
import { articles } from "./articles"

export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Back-office",
  decoratorComponent: createAdminLayout({}),
  resources: [articles],
  menu: "auto", // one entry per resource
}
```

Adding a second resource means declaring it and adding it to `resources`: the menu, routes and links follow.

## 5. Validation errors in the right place

When API Platform rejects a record, it responds with `violations`: a list of `propertyPath` values and messages. The dialect attaches each one to the form field with that name. There is no code to write for an `Assert\NotBlank` constraint set on the PHP side to show up under the "title" field.

## 6. Real time with Mercure

In the declaration above, `realtime: true` is enough: the list subscribes to the resource's Mercure topic and refetches when the API publishes a change. Two useful details:

- the topic is only built for a `path` under `/api/`, the prefix that identifies an IRI;
- if the hub responds with an HTTP error (a `401` after the cookie expires, a `502` during a deployment), the connection is reopened after 1 s, 2 s, 4 s… up to 30 s, and the views refetch as soon as the hub is back.

A private hub on another domain needs cookies: `realtime: { withCredentials: true }`.

## What you end up with

With one configuration, one declaration and one scope, the admin panel lists, filters, creates, edits and deletes the articles of your API Platform API, with types that follow the schema, two layouts and live updates. Permissions (`permissions: { delete: … }`), other layouts (board, calendar, timeline) and custom actions are declared in the same place, when you need them.

If your API is not API Platform, the declaration does not change: you swap the dialect in `configureApi`, for example for `strapiDialect()`, `supabaseDialect()`, `springDialect()` or `restDialect()`.

## Going further

Install the library with `npm i react-resource-view`, then follow the [quickstart](/docs/resource-view/quickstart/). The useful pages for this case:

- [backends and dialects](/docs/resource-view/backends/), for the API settings;
- [typing resources from OpenAPI](/docs/resource-view/openapi-types/), for the full api-dumper recipe;
- [the admin layout](/docs/resource-view/admin-layout/), for the menu, slots and theme.

The code is on [GitHub](https://github.com/hermez-agency/react-resource-view), under the MIT license.

*A Hermez product — [hermez.dev](https://hermez.dev).*

---
title: "A complete React admin panel from your resources: React Resource View in 10 minutes"
description: "Declare a resource once and get the list, detail page, create, edit and delete screens for your REST API, with a filter and several ways to display the same rows."
date: 2026-11-13
lang: en
translation: rrv-admin-in-10-minutes
tags:
  - Tutorial
  - React
  - Admin panel
---

An admin panel is always the same story: a table, a form to create, the same form to edit, a delete button, a few filters. You write it for the first resource, then copy it for the second, the third, the tenth.

React Resource View tackles the problem from the other end: **you declare the resource once**, and the library builds the five CRUD screens from that declaration. Here is how, in ten minutes, against an existing REST API.

## What we're building

A React application that talks to an API and offers, for an `articles` resource:

- a paginated **list**, with a filter;
- a **detail page**;
- a **create** form and an **edit** form;
- a **delete** action with confirmation.

The list renders as a table or as cards, and users switch between them on the fly, like in a Notion database.

## 1. A project wired to your API

The quickest route is to let the starter write the application around your API:

```bash
npx react-resource-view init my-admin
cd my-admin
npm install
npm run dev
```

The command asks which API you're talking to (API Platform, Spring Boot, Supabase, Strapi, FastAPI, Django or any REST API) and where it runs. You get an admin panel on `http://localhost:5173`, with its menu and a sample resource.

If you already have an application, just add the package:

```bash
pnpm add react-resource-view react-data-form react-mini-i18n resource-registry
```

Then configure API access, once, before the first render:

```ts
import { configureApi, configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })
configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => localStorage.getItem("token") ?? undefined,
})
```

By default, the library speaks JSON-LD and Hydra, the API Platform format. For a different API, you switch *dialect* without touching the resource declaration.

## 2. Declare the resource

A declaration says where the resource lives on the API and which fields it has. Those fields are both the create and edit form **and** the table columns:

```ts
import { createViewResource } from "react-resource-view"

export const articles = createViewResource("articles", {
  name: "Articles",
  path: "/api/articles",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
    },
  },
})
```

The name is used to derive page titles ("Articles", "Edit — Articles"…). Everything is allowed by default; a `permissions` key restricts whatever needs restricting.

## 3. Render the list

All that's left is to render the resource:

```tsx
import { ActionList } from "react-data-form"
import { ViewResourceContextProvider } from "react-resource-view"

export function ArticlesPage() {
  return (
    <ViewResourceContextProvider
      resource={articles}
      resourceAction={ActionList.list}
    />
  )
}
```

You see a table with one row per record returned by the API, pagination, a create button, and edit and delete actions on each row. All five screens come from the same declaration.

## 4. Add a filter

The filter bar is an ordinary form, declared in `views.list.filters`:

```ts
views: {
  list: {
    filters: {
      inputs: {
        title: { label: "Search a title" },
      },
    },
  },
}
```

The filter is written to the URL: a copied link reproduces the same list, and the browser's back button does what you expect.

## 5. A second display

*Layouts* decide how the same rows are drawn. Add cards next to the table:

```ts
import { layout } from "react-resource-view"

views: {
  list: {
    layouts: [layout.table(), layout.cards({ columns: 3 })],
  },
}
```

A switcher appears above the list. Changing the display reloads nothing and costs no extra code: the table, the cards, but also a column board, a calendar or a timeline are all declared the same way.

## Going further

In ten minutes, you have an application that lists, filters, creates, edits and deletes, with two displays. The rest is in the [documentation](/docs/resource-view/quickstart/):

- [backends and dialects](/docs/resource-view/backends/) to talk to Strapi, Supabase or any REST API;
- permissions, to say who can do what;
- layouts, to choose between table, cards, board, calendar and the others.

The code is on [GitHub](https://github.com/hermez-agency/react-resource-view), under the MIT license.

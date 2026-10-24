import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { ResourceDemo } from "@/components/ResourceDemo"
import { A, C, H2, P } from "@/components/prose"
import { articlesResource } from "@/demo/resources"

export const Route = createFileRoute("/docs/resource-view/quickstart")({
  head: () => ({
    meta: [
      { title: "Quickstart — react-resource-view" },
      {
        name: "description",
        content:
          "From zero to a list running on your API in five minutes: the starter or a manual install, one declared resource, then a filter and a second layout.",
      },
    ],
  }),
  component: Quickstart,
})

const INIT = `npx react-resource-view init my-admin
cd my-admin
npm install
npm run dev`

const INSTALL = `pnpm add react-resource-view react-data-form react-mini-i18n resource-registry`

const STYLES = `@import "tailwindcss";

@source "../node_modules/react-resource-view/dist";
@source "../node_modules/react-data-form/dist";

@import "react-resource-view/styles.css";`

const SETUP = `import { configureApi, configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })
configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => localStorage.getItem("token") ?? undefined,
  // jsonLdDialect() by default — see Backends for the others.
})`

const RESOURCE = `import { createViewResource } from "react-resource-view"

export const articles = createViewResource("articles", {
  name: "Articles",
  path: "/api/articles",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
    },
  },
})`

const RENDER = `import { ActionList } from "react-data-form"
import { ViewResourceContextProvider } from "react-resource-view"

export function ArticlesPage() {
  return (
    <ViewResourceContextProvider
      resource={articles}
      resourceAction={ActionList.list}
    />
  )
}`

const FILTER = `form: { … },
views: {
  list: {
    filters: {
      inputs: {
        title: { label: "Search a title" },
        status: {
          label: "Status",
          controller: SelectInputController,
          valueOptions: STATUSES,
        },
      },
    },
  },
}`

const LAYOUT = `import { layout } from "react-resource-view"

form: { … },
views: {
  list: {
    filters: { … },
    layouts: [layout.table(), layout.cards({ columns: 3 })],
  },
}`

function Quickstart() {
  return (
    <DocArticle
      toc={[
        { id: "project", title: "1. A project on your API" },
        { id: "resource", title: "2. Declare a resource" },
        { id: "list", title: "3. The list, from your API" },
        { id: "filter", title: "4. Add a filter" },
        { id: "layout", title: "5. Add a second layout" },
        { id: "next", title: "Where to go next" },
      ]}
    >
      <P>
        Five minutes, from nothing to a list running on your API, then a filter and
        a second way to look at the same rows. Every step ends on what you should see
        on screen.
      </P>

      <H2 id="project">1. A project on your API</H2>

      <P>
        Either let the starter write the application around your API — a Vite and
        React back office with the dialect wired and one example resource:
      </P>

      <CodeBlock lang="bash">{INIT}</CodeBlock>

      <P>
        It asks which API you talk to (API Platform, Spring Boot, Supabase, Strapi,
        FastAPI, Django or any REST API) and where it runs.{" "}
        <A href="/docs/resource-view/starter">Start a project</A> lists every flag and
        every file it writes. <strong>You should see</strong> a back office on{" "}
        <C>http://localhost:5173</C>, with its menu and the example resource. Skip to{" "}
        <A href="#resource">step 2</A> to make it yours.
      </P>

      <P>
        Or <A href="https://stackblitz.com/github/hermez-agency/react-resource-view/tree/main/examples/starter-local">open the starter in StackBlitz</A> — the same
        application on browser storage, with two resources and every layout, running
        in your tab with nothing to install. Edit a declaration and watch the screen
        change.
      </P>

      <P>Or add the package to an application you already have:</P>

      <CodeBlock lang="bash">{INSTALL}</CodeBlock>
      <CodeBlock lang="css" filename="app.css">
        {STYLES}
      </CodeBlock>
      <CodeBlock filename="src/setup.ts">{SETUP}</CodeBlock>

      <P>
        Import <C>setup.ts</C> once, before anything renders. The pieces are detailed
        in <A href="/docs/resource-view/installation">Installation</A>, the other
        backends in <A href="/docs/resource-view/backends">Backends &amp; dialects</A>
        .
      </P>

      <Callout kind="note" title="The browser calls the API">
        <P>
          The views fetch from the reader's browser: the API has to allow the origin
          your application is served from. Without CORS the list stays empty and the
          console says why.
        </P>
      </Callout>

      <H2 id="resource">2. Declare a resource</H2>

      <P>
        One declaration per resource: where it lives on the API, and the fields.
        Those fields are the create and edit form <em>and</em> the table's columns.
      </P>

      <CodeBlock filename="src/resources/articles.ts">{RESOURCE}</CodeBlock>

      <P>
        <A href="/docs/resource-view/resources">Declaring a resource</A> covers the
        repository behind it and every key of the declaration.
      </P>

      <H2 id="list">3. The list, from your API</H2>

      <P>Render it:</P>

      <CodeBlock filename="src/ArticlesPage.tsx">{RENDER}</CodeBlock>

      <P>
        <strong>You should see</strong> a table with one row per record the API
        returns, a pager, a button to create one, and on each row the edit and
        delete actions — every action is offered unless <C>permissions</C> restricts
        it, and the five screens come from the one declaration:
      </P>

      <Demo label="The list — rows read from the API" wide>
        <ResourceDemo resource={articlesResource} variant="table" />
      </Demo>

      <H2 id="filter">4. Add a filter</H2>

      <P>
        The filter bar is an ordinary form description, in{" "}
        <C>views.list.filters</C>. Its
        values go out with the request and into the URL.
      </P>

      <CodeBlock>{FILTER}</CodeBlock>

      <P>
        <strong>You should see</strong> a bar above the table. Type in it and the
        rows narrow down; reload the page and the filter is still there.{" "}
        <A href="/docs/resource-view/filters">Filters</A> explains defaults and the
        URL.
      </P>

      <Demo label="Type a title or pick a status" wide>
        <ResourceDemo resource={articlesResource} variant="table" />
      </Demo>

      <H2 id="layout">5. Add a second layout</H2>

      <P>
        Layouts are a list. Declare two and the view shows a switcher; the reader
        picks, and the choice survives a reload.
      </P>

      <CodeBlock>{LAYOUT}</CodeBlock>

      <P>
        <strong>You should see</strong> a switcher above the filter bar. Pick{" "}
        <em>Cards</em> and the same rows, with the same filter, become a grid:
      </P>

      <Demo label="Same resource, same filter — as cards" wide>
        <ResourceDemo resource={articlesResource} variant="cards" />
      </Demo>

      <H2 id="next">Where to go next</H2>

      <P>
        <A href="/docs/resource-view/layouts">Choosing a layout</A> has the five
        others (split, board, calendar, timeline…);{" "}
        <A href="/docs/resource-view/routing">Routing</A> puts the views on real
        URLs; <A href="/docs/resource-view/openapi-types">Types from OpenAPI</A>{" "}
        types the resources from your API's schema.
      </P>
    </DocArticle>
  )
}

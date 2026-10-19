import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { ResourceDemo } from "@/components/ResourceDemo"
import { A, C, H2, Li, P, Term, Ul } from "@/components/prose"
import { articlesResource } from "@/demo/resources"

export const Route = createFileRoute("/docs/resource-view/")({
  head: () => ({
    meta: [
      { title: "react-resource-view — Introduction" },
      {
        name: "description",
        content:
          "Declare a resource once and get its list, detail, create, edit and delete screens, wired to your API — API Platform, Spring Boot, Supabase, Strapi, FastAPI, Django or any REST API — and to the URL.",
      },
    ],
  }),
  component: ViewIntroduction,
})

const DECLARATION = `import {
  DatePickerInputController,
  NumberInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"

const CATEGORIES = [
  { label: "Forms", value: "Forms" },
  { label: "Views", value: "Views" },
  { label: "Routing", value: "Routing" },
  { label: "JSON-LD", value: "JSON-LD" },
  { label: "Architecture", value: "Architecture" },
]

const STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "In review", value: "review" },
  { label: "Published", value: "published" },
]

export const articles = createViewResource("articles", {
  name: "Articles",
  path: "/api/articles",
  // The fields are the form *and* the table's columns.
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
      category: {
        label: "Category",
        controller: SelectInputController,
        valueOptions: CATEGORIES,
      },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: STATUSES,
      },
      readingTime: { label: "Minutes", controller: NumberInputController },
      publishedAt: { label: "Published on", controller: DatePickerInputController },
    },
  },
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
      layouts: [layout.table(), layout.cards({ columns: 3 })],
    },
  },
})`

const RENDER = `import { ViewResourceContextProvider } from "react-resource-view"
import { ActionList } from "react-data-form"

<ViewResourceContextProvider
  resource={articles}
  resourceAction={ActionList.list}
/>`

function ViewIntroduction() {
  return (
    <DocArticle
      toc={[
        { id: "declaration", title: "One declaration" },
        { id: "running", title: "What that gives you" },
        { id: "url", title: "The URL is the state" },
        { id: "boundaries", title: "What it does not do" },
        { id: "next", title: "Where to go next" },
        { id: "other-projects", title: "Other projects" },
      ]}
    >
      <P>
        <C>react-resource-view</C> renders the CRUD surface of a{" "}
        <Term id="resource">resource</Term>: the list and its{" "}
        <Term id="view-variant">layouts</Term>, the detail page, the create and edit{" "}
        <Term id="form">forms</Term>, the delete confirmation, the filter bar and the
        pagination. You describe the resource; it writes the screens. Those are its
        five <Term id="view">views</Term> — list, detail, create, edit and delete —
        and the list alone comes in seven layouts.
      </P>

      <P>
        It is built on <A href="/docs/form">react-data-form</A> for everything with
        fields in it, which is why the two are documented side by side.
      </P>

      <H2 id="declaration">One declaration</H2>

      <CodeBlock filename="articles.ts">{DECLARATION}</CodeBlock>

      <P>Rendering it is one component:</P>

      <CodeBlock>{RENDER}</CodeBlock>

      <H2 id="running">What that gives you</H2>

      <P>
        Everything below comes from a declaration of that shape — no screen was
        written by hand. Switch the layout, filter the list, open a row, edit it,
        delete it. Where those forms open is one key —{" "}
        <A href="/docs/resource-view/resources">a page, a dialog or a drawer</A> — and
        what they ask for need not be the same when creating as when editing, which is{" "}
        <A href="/docs/resource-view/forms">a form per action</A>. A layout the
        package does not ship is one command away —{" "}
        <A href="/docs/resource-view/custom-variant">create your own layout</A>
        .
      </P>

      <Demo label="A resource, running" code={DECLARATION} wide>
        <ResourceDemo resource={articlesResource} variant="table" />
      </Demo>

      <Callout kind="note" title="No server behind this page">
        <P>
          A resource declared without a <C>path</C> falls back to a
          localStorage-backed <Term id="repository">repository</Term>. Every demo on
          this site runs against a real repository with no API behind it — your edits
          survive a reload.
        </P>
      </Callout>

      <H2 id="url">The URL is the state</H2>

      <P>
        Which view, which item, which filters, which page,
        which layout: all of it lives in the address bar rather than in component
        state.
      </P>

      <Ul>
        <Li>A link reopens exactly what the sender was looking at.</Li>
        <Li>The back button does what the reader expects.</Li>
        <Li>
          A reload does not lose the filters — which is the difference between a list
          people use and a list people fight.
        </Li>
      </Ul>

      <P>
        Two <A href="/docs/resource-view/routing">routing modes</A> carry it: in the
        path, or entirely in the query string for statically hosted or embedded
        views.
      </P>

      <H2 id="boundaries">What it does not do</H2>

      <Ul>
        <Li>
          <strong>It has no router.</strong> Four primitives are asked for; an
          adapter for TanStack Router ships with the package.
        </Li>
        <Li>
          <strong>It knows no API in particular.</strong> Which backend answers, and
          how it spells a page or a filter, is a{" "}
          <A href="/docs/resource-view/backends">dialect</A> — API Platform, Spring
          Boot, Supabase, Strapi, FastAPI and Django ship with the package, and any other
          REST API works without one — configured separately through{" "}
          <C>configureApi</C>.
        </Li>
        <Li>
          <strong>It is not an admin panel.</strong> The library itself is a set of
          components you render where you want them, with no generated dashboard.
          The <A href="/docs/resource-view/starter">starter</A> command writes a
          back office on your API for you, and{" "}
          <A href="/docs/resource-view/admin-layout">AdminLayout</A> is an optional
          shell for it — neither is required.
        </Li>
        <Li>
          <strong>It does not own your layout.</strong> A view is a component, not a
          page.
        </Li>
      </Ul>

      <H2 id="next">Where to go next</H2>

      <div className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
        {[
          {
            to: "/docs/resource-view/installation",
            title: "Installation",
            body: "Install, style, and point the client at your API.",
          },
          {
            to: "/docs/resource-view/resources",
            title: "Declaring a resource",
            body: "createViewResource, its five views, and the repository behind them.",
          },
          {
            to: "/docs/resource-view/forms",
            title: "A form per action",
            body: "One description for four screens — and a different form where creating is not editing.",
          },
          {
            to: "/docs/resource-view/layouts",
            title: "Choosing a layout",
            body: "Seven layouts over one collection, switched by the reader.",
          },
          {
            to: "/docs/resource-view/custom-variant",
            title: "Create your own layout",
            body: "One command writes the eighth layout: a single file, yours to draw.",
          },
          {
            to: "/docs/resource-view/routing",
            title: "Routing",
            body: "The four primitives, and the two ways to carry a context.",
          },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-xl border border-border p-4 no-underline transition hover:border-view/50 hover:bg-muted/40"
          >
            <p className="flex items-center justify-between font-medium">
              {card.title}
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>

      <H2 id="other-projects">Other projects</H2>

      <Ul>
        <Li>
          <A href="/docs/form">React Data Form</A> — the form library this package
          renders its fields with, documented on this same site and published
          separately as <C>react-data-form</C>.
        </Li>
        <Li>
          <A href="https://hermez.dev">hermez.dev</A> — Hermez, the agency that
          writes and maintains both packages.
        </Li>
      </Ul>
    </DocArticle>
  )
}

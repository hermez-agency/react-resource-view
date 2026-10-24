import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, P, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/resource-view/generate-resources")({
  head: () => ({
    meta: [
      { title: "Resources from an OpenAPI schema — react-resource-view" },
      {
        name: "description",
        content:
          "npx react-resource-view generate resources reads the OpenAPI schema of your API and writes one resource per collection: inputs, selects, relations, permissions, a table and a board. API Platform, FastAPI, Supabase and any OpenAPI 3 or Swagger 2 API.",
      },
    ],
  }),
  component: GenerateResources,
})

const COMMAND = `npx react-resource-view generate resources
npx react-resource-view generate resources --schema src/api-schema/openapi.json --only books,authors`

const SESSION = `$ npx react-resource-view generate resources
Wrote 3 resources to src/resources:
  books.ts  /api/books
  authors.ts  /api/authors
  reviews.ts  /api/reviews

Registered in src/scope.ts.`

const SCHEMA = `{
  "paths": {
    "/api/books": { "get": { … }, "post": { … } },
    "/api/books/{id}": { "get": { … }, "put": { … }, "delete": { … } }
  },
  "components": {
    "schemas": {
      "Book": {
        "required": ["title", "author"],
        "properties": {
          "title": { "type": "string" },
          "price": { "type": "number" },
          "publishedAt": { "type": ["string", "null"], "format": "date-time" },
          "status": { "type": "string", "enum": ["draft", "in_review", "published"] },
          "author": { "type": "string", "format": "iri-reference" }
        }
      }
    }
  }
}`

const GENERATED = `import { Database } from "lucide-react"
import {
  DatePickerInputController,
  MultiSelectInputController,
  NumberInputController,
  SelectInputController,
  SelectSearchInputController,
  SwitchInputController,
  TextAreaInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Books — written by \`react-resource-view generate resources\` from
 * /api/books in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Book {
  "@id": string
  id?: number
  title: string
  isbn?: string | null
  description?: string | null
  price?: number
  pages?: number
  inStock?: boolean
  publishedAt?: string | null
  status?: "draft" | "in_review" | "published"
  genres?: ("novel" | "essay" | "poetry")[]
  author: string
  createdAt?: string
}

const BOOK_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
]

const BOOK_GENRES = [
  { value: "novel", label: "Novel" },
  { value: "essay", label: "Essay" },
  { value: "poetry", label: "Poetry" },
]

export const books = createViewResource<Book>("books", {
  name: "Books",
  icon: Database,
  path: "/api/books",
  titleField: "title",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      isbn: { label: "Isbn" },
      description: { label: "Description", controller: TextAreaInputController },
      price: { label: "Price", controller: NumberInputController },
      pages: { label: "Pages", controller: NumberInputController },
      inStock: { label: "In stock", controller: SwitchInputController },
      publishedAt: { label: "Published at", controller: DatePickerInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: BOOK_STATUS,
      },
      genres: {
        label: "Genres",
        controller: MultiSelectInputController,
        valueOptions: BOOK_GENRES,
      },
      author: {
        label: "Author",
        required: true,
        controller: SelectSearchInputController,
        onSearch: relationSearch("/api/authors", {
          valueField: "@id",
          labelField: "name",
        }),
      },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          title: { label: "Title" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: BOOK_STATUS,
          },
        },
      },
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
    },
  },
})
`

const SCOPE = `import { authors } from "@/resources/authors"
import { books } from "@/resources/books"
import { reviews } from "@/resources/reviews"

export const adminScope: ScopeInterface = {
  name: "admin",
  resources: [books, authors, reviews],
  menu: "auto",
}`

const RERUN = `$ npx react-resource-view generate resources
Nothing written: src/resources/books.ts, src/resources/authors.ts already exist. Pass --force to overwrite, or --only to leave them out.

$ npx react-resource-view generate resources --only reviews`

function GenerateResources() {
  return (
    <DocArticle
      toc={[
        { id: "command", title: "The command" },
        { id: "reads", title: "What it reads" },
        { id: "writes", title: "What it writes" },
        { id: "options", title: "Options" },
        { id: "after", title: "After generating" },
      ]}
    >
      <H2 id="command">Twenty resources, one command</H2>

      <P>
        <C>init</C> writes one example resource. An API with twenty collections has
        twenty more to declare — and the OpenAPI schema it publishes already says
        what each of them is made of. <C>generate resources</C> reads it and writes
        one declaration per resource, ready to be edited:
      </P>

      <CodeBlock lang="bash">{COMMAND}</CodeBlock>
      <CodeBlock lang="bash">{SESSION}</CodeBlock>

      <P>
        Without <C>--schema</C>, it reads <C>src/api-schema/openapi.json</C> — the
        file <C>api-schema</C> writes when the project was started with{" "}
        <A href="/docs/resource-view/starter">init</A>. The schema is read as JSON,
        from a file or a URL, with no dependency to install.
      </P>

      <H2 id="reads">What it reads</H2>

      <P>
        A resource is a collection path (<C>/api/books</C>) whose operations speak
        about records. The schema may be OpenAPI 3.0, 3.1 or Swagger 2.0:
      </P>

      <CodeBlock lang="json">{SCHEMA}</CodeBlock>

      <Ul>
        <Li>
          <strong>API Platform</strong> — JSON-LD collections, <C>@id</C>, IRIs as
          relations.
        </Li>
        <Li>
          <strong>FastAPI</strong> (and Django REST Framework, Spring Boot…) —{" "}
          <C>anyOf</C> with <C>null</C>, enums by reference, <C>author_id</C> as a
          foreign key to <C>/authors</C>.
        </Li>
        <Li>
          <strong>Supabase</strong> — the Swagger 2.0 PostgREST publishes, whose
          tables have no item route and whose foreign keys are written in the
          column's description.
        </Li>
      </Ul>

      <P>
        A path that is an action rather than a collection (<C>POST /token</C>), or
        has no record schema, is left out and reported.
      </P>

      <H2 id="writes">What it writes</H2>

      <P>
        For the <C>Book</C> above, <C>src/resources/books.ts</C>:
      </P>

      <CodeBlock lang="ts" filename="src/resources/books.ts">
        {GENERATED}
      </CodeBlock>

      <PropsTable
        rows={[
          {
            name: "path, name, titleField",
            type: "string",
            description:
              "The collection path, a name from the last segment, and the first of name, title, label, email, slug… the schema has as a text.",
          },
          {
            name: "form.inputs",
            type: "inputs",
            description:
              "One per property the create or update body takes, readOnly ones left out. Numbers, booleans, dates, emails and long texts get their controller; required comes from the schema.",
          },
          {
            name: "enum",
            type: "select",
            description:
              "A SelectInputController with its valueOptions (MultiSelectInputController for an array of enum).",
          },
          {
            name: "relation",
            type: "search select",
            description:
              "An IRI (format iri-reference), a foreign key named author_id or declared by PostgREST: a SelectSearchInputController whose options are searched in the target resource through relationSearch.ts, written next to them.",
          },
          {
            name: "permissions",
            type: "permissions",
            description:
              "From the operations exposed: no POST gives create: false, no PUT or PATCH update: false, no DELETE delete: false, and a collection with none of them is \"readonly\". All exposed, nothing declared.",
          },
          {
            name: "views.list",
            type: "layouts, filters",
            description:
              "A table, and a board when an enum named status, state, stage or phase is among the inputs. Filters are the collection's own query parameters that match an input.",
          },
        ]}
      />

      <Callout kind="note" title="Typed from the file, not from the API">
        <P>
          The interface in each file is written from the schema, so the project
          compiles without <C>api-schema</C>. To type it from{" "}
          <A href="/docs/resource-view/openapi-types">the generated types</A>{" "}
          instead, replace the interface with the schema's type.
        </P>
      </Callout>

      <H2 id="options">Options</H2>

      <PropsTable
        rows={[
          {
            name: "-s, --schema <file|url>",
            type: "string",
            description:
              "The OpenAPI schema, as JSON. Default: src/api-schema/openapi.json.",
          },
          {
            name: "--only <names>",
            type: "string",
            description:
              "Only these resources (books,authors) — by path segment, type or export name. Relations still point at the others.",
          },
          {
            name: "-d, --dir <path>",
            type: "string",
            description: "Where to write the files. Default: src/resources.",
          },
          {
            name: "--scope <file>",
            type: "string",
            description:
              "The scope to register them in. Default: src/scope.ts when it exists.",
          },
          {
            name: "-f, --force",
            type: "boolean",
            description: "Overwrite files that already exist.",
          },
          {
            name: "--dry-run",
            type: "boolean",
            description: "List the files instead of writing them.",
          },
        ]}
      />

      <H3 id="existing">Nothing is overwritten</H3>

      <P>
        A file that exists is never replaced without <C>--force</C>. The command
        then writes nothing at all, so a run is all or nothing:
      </P>

      <CodeBlock lang="bash">{RERUN}</CodeBlock>

      <H2 id="after">After generating</H2>

      <P>
        The resources are added to the scope's <C>resources</C> array, with their
        imports, once — running the command again does not duplicate them. A scope
        it cannot edit gets the line to add, printed:
      </P>

      <CodeBlock lang="ts" filename="src/scope.ts">
        {SCOPE}
      </CodeBlock>

      <P>
        The files are yours from then on: rename an input, swap the controller of a
        relation, add a <C>layout.cards()</C>. What the schema cannot say — which
        icon, which label is friendly, which filters the back office needs — is what
        is left to write, and it is written on top of a resource that already runs.
      </P>

      <Callout kind="tip" title="The permissions decide what is offered">
        <P>
          They follow the operations the API exposes, not who may call them. The API
          stays where access is enforced — see{" "}
          <A href="/docs/resource-view/permissions">Permissions</A>.
        </P>
      </Callout>
    </DocArticle>
  )
}

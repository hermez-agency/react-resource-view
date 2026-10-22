import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, P, Term, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/resource-view/openapi-types")({
  head: () => ({
    meta: [
      { title: "Typing resources from an OpenAPI schema — react-resource-view" },
      {
        name: "description",
        content:
          "Export the OpenAPI schema your API publishes, turn it into TypeScript with api-dumper, and type the client and every resource from it — API Platform, Strapi, Supabase, FastAPI, Django or any other API.",
      },
    ],
  }),
  component: OpenApiTypes,
})

const HANDWRITTEN = `// Copied by hand from the API — and wrong the day the API changes.
interface Article {
  "@id": string
  id: number
  title: string
  status: "draft" | "published"
}

const articles = createViewResource<Article>("articles", { … })`

const INSTALL = `pnpm add -D api-dumper typescript`

const CONFIG = `import { defineConfig } from "api-dumper"

export default defineConfig({
  // Where the API publishes its schema — URL or file, JSON or YAML.
  source: "http://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
})`

const PACKAGE_JSON = `{
  "scripts": {
    "api-schema": "api-dumper"
  }
}`

const TREE = `src/api-schema/
├── openapi.json    # the schema, as it was read (and cleaned)
├── api-schema.ts   # the types: paths, components, operations
└── enums/          # one file per enum of the schema
    └── Gender.ts`

const UNION = `// The collection answers application/ld+json *or* text/csv…
const { data } = await client.GET("/api/articles")

// …so data is a union, and this no longer type-checks.
data?.member`

const STRIP = `export default defineConfig({
  source: "http://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  // Removed from every request and response before the types are generated.
  strip: { contentTypes: ["text/csv"] },
})`

const CLIENT = `import createClient from "openapi-fetch"
import type { paths } from "@/api-schema/api-schema"

export const client = createClient<paths>({ baseUrl: "https://api.example.com" })

// The path is checked against the schema, and data is typed from it.
const { data } = await client.GET("/api/articles/{id}", {
  params: { path: { id: "42" } },
})`

const RESOURCE = `import { createViewResource } from "react-resource-view"
import type { components } from "@/api-schema/api-schema"

// "@id" is what createViewResource asks of an item — see the note below.
type Article = components["schemas"]["Article"] & { "@id": string }

export const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  // inputs, titleField, layout.board({ groupBy })… are checked against Article.
  form: { inputs: { title: { label: "Title" } } },
})`

const SIDE_BY_SIDE = `// Before — an interface copied from the API, by hand.
interface Article {
  "@id": string
  id: number
  title: string
}
createViewResource<Article>("articles", { … })

// After — the type the API itself declares.
type GeneratedArticle = components["schemas"]["Article"] & { "@id": string }
createViewResource<GeneratedArticle>("articles", { … })`

const ALIAS = `import type { components } from "@/api-schema/api-schema"

/** A schema of the API, by name — autocompleted, and a typo fails to compile. */
export type Schema<K extends keyof components["schemas"]> = components["schemas"][K]

/** The same schema as a resource item, with the "@id" createViewResource asks for. */
export type Item<K extends keyof components["schemas"]> = Schema<K> & { "@id": string }`

const ALIAS_USE = `const articles = createViewResource<Item<"Article">>("articles", { … })
const authors = createViewResource<Item<"Author">>("authors", { … })`

const API_PLATFORM_CLIENT = `import { createGenericClient } from "jsonld-api-client"
import type { paths } from "@/api-schema/api-schema"

// Typed against your schema, and the instance the JSON-LD dialect sends through.
export const client = createGenericClient<paths>({ baseUrl: "https://api.example.com" })`

const API_PLATFORM_CONFIG = `import { defineConfig } from "api-dumper"

export default defineConfig({
  source: "http://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform",
  strip: { contentTypes: ["text/csv"] },
})`

const API_PLATFORM_RESOURCE = `import type { components } from "@/api-schema/api-schema"

// The JSON-LD representation: the fields, plus @id and @type — nothing to add.
type Article = components["schemas"]["Article.jsonld"]

const articles = createViewResource<Article>("articles", { … })`

const ENUM_PHP = `#[ApiResource(operations: [new GetCollection(), new Get()])]
enum Gender: string
{
    case MALE = 'MALE';
    case FEMALE = 'FEMALE';
}`

const ENUM_STANDARD = `# Any OpenAPI 3 document — a named schema with the standard enum keyword
components:
  schemas:
    ArticleStatus:
      type: string
      enum: [draft, published]`

const ENUM_X_IRIS = `{
  "Gender": {
    "type": "string",
    "enum": ["MALE", "FEMALE"],
    "x-enum-name": "Gender",
    "x-enum-iris": { "MALE": "/api/genders/MALE", "FEMALE": "/api/genders/FEMALE" }
  }
}`

const ENUM_COLLECTIONS = `export default defineConfig({
  source: "http://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform",
  apiPlatform: {
    // The collections that list an enum's cases, fetched at generation time.
    collections: { paths: ["/api/genders", "/api/article_statuses"] },
  },
})`

const ENUM_OUTPUT = `// src/api-schema/enums/Gender.ts — generated
export const Gender = ["MALE", "FEMALE"] as const
export const GenderEnum = { MALE: "MALE", FEMALE: "FEMALE" } as const
export const GenderApiEnum = { MALE: "/api/genders/MALE", FEMALE: "/api/genders/FEMALE" } as const
export type GenderValues = keyof typeof GenderEnum

// In the application
const genderOptions = [
  { label: "Male", value: GenderApiEnum.MALE },
  { label: "Female", value: GenderApiEnum.FEMALE },
]`

const STRAPI = `# Strapi 5 — from the root of the Strapi project
npm run strapi openapi generate -- --output ./openapi.json`

const STRAPI_HTTP = `// config/server.js — opt in to GET /api/openapi.json
module.exports = {
  openapi: {
    "content-api": { access: "public" },
  },
}`

const SUPABASE = `npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > database.types.ts`

const SUPABASE_RESOURCE = `import type { Tables } from "./database.types"

type Article = Tables<"articles"> & { "@id": string }

const articles = createViewResource<Article>("articles", {
  path: "articles",
  dialect: supabaseDialect({ apiKey }),
})`

const FASTAPI = `export default defineConfig({
  source: "http://localhost:8000/openapi.json",
  outDir: "src/api-schema",
})`

const FASTAPI_RESOURCE = `import type { components } from "./api-schema"

// One Pydantic model, one schema — named after the class.
type Item = components["schemas"]["Item"] & { "@id": string }

const items = createViewResource<Item>("items", {
  path: "items",
  dialect: fastapiDialect(),
})`

const MAKEFILE = `api-schema:
	pnpm run api-schema`

const CHECK = `# Writes nothing; exits 1 when the committed files are out of date.
pnpm exec api-dumper --check`

function OpenApiTypes() {
  return (
    <DocArticle
      toc={[
        { id: "why", title: "Why" },
        { id: "pipeline", title: "From schema to types" },
        { id: "wiring", title: "Wiring the types in" },
        { id: "backends", title: "Per backend" },
        { id: "when", title: "When to regenerate" },
      ]}
    >
      <H2 id="why">One schema, one source of truth</H2>

      <P>
        Every <Term id="resource">resource</Term> is typed —{" "}
        <C>createViewResource&lt;Article&gt;</C> — and the type has to come from
        somewhere. Written by hand, it is a copy of what the API returns, and a copy
        drifts: a field is renamed on the back, the interface still compiles, and the
        bug surfaces in a table cell.
      </P>

      <CodeBlock>{HANDWRITTEN}</CodeBlock>

      <P>
        Any API that publishes an <A href="https://www.openapis.org">OpenAPI</A>{" "}
        schema already describes those types, field by field. The back describes the
        API; the front derives its types from that description, with{" "}
        <A href="https://github.com/hermez-agency/api-dumper">api-dumper</A> — which
        runs <A href="https://openapi-ts.dev">openapi-typescript</A> under the hood —
        and a field renamed on the back becomes a compile error on the front.
      </P>

      <P>
        The recipe is the same for any backend; only the URL of the schema changes.{" "}
        <A href="https://api-platform.com">API Platform</A> is the first example below,
        not a requirement.
      </P>

      <H2 id="pipeline">From schema to types</H2>

      <P>
        One dev dependency, one config file, one command. api-dumper downloads the
        schema, cleans it if asked, and generates the types and the enums from it:
      </P>

      <CodeBlock lang="bash">{INSTALL}</CodeBlock>

      <CodeBlock lang="ts" filename="api-dumper.config.ts">
        {CONFIG}
      </CodeBlock>

      <CodeBlock lang="json" filename="package.json">
        {PACKAGE_JSON}
      </CodeBlock>

      <P>
        <C>pnpm run api-schema</C> then leaves this behind, all of it to commit:
      </P>

      <CodeBlock lang="bash">{TREE}</CodeBlock>

      <P>
        Commit <C>openapi.json</C> alongside the generated types. It is what the
        types were built from, a pull request that changes the API shows up as a diff
        in it, and the front builds without the API running. A file whose content
        has not changed is not rewritten, so a run against an unchanged API leaves
        the working tree clean.
      </P>

      <H3 id="clean">Clean it, if needed</H3>

      <P>
        A schema describes every representation an operation can answer with — and
        openapi-typescript faithfully turns each of them into a member of a union.
        An API Platform collection that also exports to CSV answers{" "}
        <C>application/ld+json</C> <em>or</em> <C>text/csv</C>, and the typed
        response becomes a union of the two:
      </P>

      <CodeBlock>{UNION}</CodeBlock>

      <P>
        If the CSV is downloaded by a plain <C>fetch</C> rather than through the
        typed client — which is what react-resource-view's export button does — that
        content type is noise. Deleting it from the schema, before generating, keeps
        every response a single shape. <C>strip.contentTypes</C> removes it wherever
        it appears:
      </P>

      <CodeBlock lang="ts" filename="api-dumper.config.ts">
        {STRIP}
      </CodeBlock>

      <H3 id="generate">What api-schema.ts exports</H3>

      <P>
        <C>api-schema.ts</C> exports three interfaces you will use:
      </P>

      <PropsTable
        rows={[
          {
            name: "paths",
            type: "interface",
            description:
              "Every route, its parameters and its responses — what a typed client is built on.",
          },
          {
            name: "components",
            type: "interface",
            description: (
              <>
                The reusable schemas, under <C>components["schemas"]</C> — the types
                your resources are.
              </>
            ),
          },
          {
            name: "operations",
            type: "interface",
            description: (
              <>
                Each operation by its <C>operationId</C> — handy to type a filter{" "}
                <Term id="form">form</Term> from a collection's query parameters.
              </>
            ),
          },
        ]}
      />

      <Callout kind="warning" title="OpenAPI 3.0 or 3.1">
        <P>
          api-dumper reads OpenAPI 3.0 and 3.1, and refuses a Swagger 2.0 document
          with an explicit error rather than generating broken types.
        </P>
      </Callout>

      <H2 id="wiring">Wiring the types in</H2>

      <H3 id="client">On the client: paths</H3>

      <P>
        <C>paths</C> is what an OpenAPI-typed client takes —{" "}
        <A href="https://openapi-ts.dev/openapi-fetch/">openapi-fetch</A>, from the
        same authors, or one built on it:
      </P>

      <CodeBlock filename="client.ts">{CLIENT}</CodeBlock>

      <H3 id="resources">On the resources: components</H3>

      <P>
        A resource's type parameter is the shape of one item. The schema has it,
        under <C>components["schemas"]</C>:
      </P>

      <CodeBlock filename="resources/articles.ts">{RESOURCE}</CodeBlock>

      <Callout kind="note" title='Why the "@id"'>
        <P>
          The item type of <C>createViewResource</C> has to carry an <C>@id</C> key —
          the library grew up on JSON-LD, where every item has one. API Platform's{" "}
          <C>.jsonld</C> schemas already include it, so there the generated type is
          used as is (see <A href="#api-platform">below</A>). On a backend that sends
          no <C>@id</C>, add it to the type: it only satisfies the compiler, the{" "}
          <Term id="dialect">dialect</Term> still addresses a row by its{" "}
          <C>documentId</C> or its primary key.
        </P>
      </Callout>

      <P>
        Next to the hand-written version, the declaration does not change — only
        where its type comes from:
      </P>

      <CodeBlock>{SIDE_BY_SIDE}</CodeBlock>

      <Callout kind="tip" title="A one-line alias">
        <P>
          <C>components["schemas"]["…"]</C> gets long by the third resource. Two
          aliases keep the autocompletion and drop the noise:
        </P>
        <CodeBlock filename="api-schema/schema.ts">{ALIAS}</CodeBlock>
        <CodeBlock>{ALIAS_USE}</CodeBlock>
      </Callout>

      <H2 id="backends">Per backend</H2>

      <P>
        What changes from one backend to the next is where the schema lives — and,
        sometimes, what the generated names look like.
      </P>

      <H3 id="api-platform">API Platform</H3>

      <P>
        API Platform publishes an OpenAPI 3 document at{" "}
        <C>/api/docs.jsonopenapi</C> — the <C>source</C> the config above already
        points at. Add the <C>api-platform</C> preset:
      </P>

      <CodeBlock lang="ts" filename="api-dumper.config.ts">
        {API_PLATFORM_CONFIG}
      </CodeBlock>

      <P>
        On top of the content type, the preset removes the schemas API Platform
        derives per format: stripping <C>text/csv</C> also drops <C>Article.csv</C>,{" "}
        <C>Article.csv-read</C>… which nothing references any more.
      </P>

      <Ul>
        <Li>
          <strong>The client.</strong> The JSON-LD dialect goes through the client of{" "}
          <C>jsonld-api-client</C> (see{" "}
          <A href="/docs/resource-view/installation">installation</A>). Build it once
          with <C>paths</C>, and every call your own code makes through it is typed
          too:
        </Li>
      </Ul>

      <CodeBlock filename="client.ts">{API_PLATFORM_CLIENT}</CodeBlock>

      <Ul>
        <Li>
          <strong>The schema names.</strong> API Platform emits one schema per format
          and per serialization group: <C>Article</C>, <C>Article.jsonld</C>,{" "}
          <C>Article.jsonld-read</C>, <C>Article.jsonMergePatch</C>… The item a JSON-LD{" "}
          <Term id="view">view</Term> receives is the <C>.jsonld</C> one, which
          carries <C>@id</C> and <C>@type</C>:
        </Li>
      </Ul>

      <CodeBlock>{API_PLATFORM_RESOURCE}</CodeBlock>

      <H3 id="enums">Exporting enums</H3>

      <P>
        OpenAPI types a field as an IRI string, but not the list of values it may
        take. API Platform can expose a PHP enum as a resource, and its collection
        then <em>is</em> that list:
      </P>

      <CodeBlock lang="ts" filename="src/Entity/Gender.php">
        {ENUM_PHP}
      </CodeBlock>

      <P>
        The document does not carry those values: a relation to an enum is a plain{" "}
        <C>iri-reference</C>. Two ways to hand them to api-dumper:
      </P>

      <P>
        <strong>1. From the document — recommended.</strong> Decorate API Platform's{" "}
        <C>OpenApiFactory</C> so that it adds, for each backed enum, a schema with{" "}
        <C>enum</C>, <C>x-enum-name</C> and <C>x-enum-iris</C>. Generation then works
        offline, from the exported file:
      </P>

      <CodeBlock lang="json" filename="components.schemas">
        {ENUM_X_IRIS}
      </CodeBlock>

      <P>
        <strong>2. From the Hydra collections</strong>, fetched at generation time —{" "}
        <C>member</C> for the cases, <C>@context</C> for the name, <C>@id</C> for each
        case's IRI:
      </P>

      <CodeBlock lang="ts" filename="api-dumper.config.ts">
        {ENUM_COLLECTIONS}
      </CodeBlock>

      <P>
        Either way, each enum lands in its own file, under{" "}
        <C>src/api-schema/enums/</C>, and exports the cases, and three ways to name
        them:
      </P>

      <PropsTable
        rows={[
          {
            name: "XEnum",
            type: "Record<case, value>",
            description: "The enum's values, by case — for comparing, or a switch.",
          },
          {
            name: "XApiEnum",
            type: "Record<case, IRI>",
            description:
              "Each case's IRI — what a relation field holds, and what a select sends back.",
          },
          {
            name: "XValues",
            type: "type",
            description: "The union of the cases, to type a prop or a map.",
          },
        ]}
      />

      <CodeBlock>{ENUM_OUTPUT}</CodeBlock>

      <Callout kind="note" title="Only the IRIs are specific to API Platform">
        <P>
          A named schema carrying the standard <C>enum</C> keyword becomes a file
          the same way, whatever the API — <C>XEnum</C> and <C>XValues</C> included.
          Only <C>XApiEnum</C> needs IRIs, from <C>x-enum-iris</C> or from the Hydra
          collections:
        </P>
        <CodeBlock lang="yaml">{ENUM_STANDARD}</CodeBlock>
      </Callout>

      <H3 id="strapi">Strapi</H3>

      <P>
        Strapi 5 generates an OpenAPI 3.1 document from the command line, from the
        root of the Strapi project — no plugin needed:
      </P>

      <CodeBlock lang="bash">{STRAPI}</CodeBlock>

      <P>
        Point <C>source</C> at that file, or let api-dumper download it: Strapi does
        not serve it over HTTP by default, so opt in, and the document answers at{" "}
        <C>/api/openapi.json</C>:
      </P>

      <CodeBlock filename="config/server.js">{STRAPI_HTTP}</CodeBlock>

      <Callout kind="warning" title="A public schema shows the whole Content API">
        <P>
          Including the content types that are not publicly readable. If that is a
          concern, leave the endpoint off and copy the file the CLI generates into
          the front instead. Strapi 4 had no such command — the older Documentation
          plugin filled that role. See{" "}
          <A href="https://docs.strapi.io/cms/api/openapi">Strapi's OpenAPI page</A>.
        </P>
      </Callout>

      <H3 id="supabase">Supabase</H3>

      <P>
        Supabase's Data API — PostgREST — describes itself at the root,{" "}
        <C>https://&lt;project-ref&gt;.supabase.co/rest/v1/</C>, but two things keep
        it out of this recipe:
      </P>

      <Ul>
        <Li>
          the document is Swagger 2.0, which openapi-typescript 7 no longer reads;
        </Li>
        <Li>
          it only answers a secret key — <C>sb_secret_…</C> or the legacy{" "}
          <C>service_role</C> — and refuses the anon key.
        </Li>
      </Ul>

      <P>
        Supabase's own generator reads the database instead, and is the documented
        way to type a Supabase project:
      </P>

      <CodeBlock lang="bash">{SUPABASE}</CodeBlock>

      <CodeBlock>{SUPABASE_RESOURCE}</CodeBlock>

      <Callout kind="note" title="Same idea, different tool">
        <P>
          The types still come from the backend, still land in a committed file, and
          still get regenerated when the schema moves — only the command differs.
          See{" "}
          <A href="https://supabase.com/docs/guides/api/rest/generating-types">
            generating types
          </A>{" "}
          in Supabase's documentation.
        </P>
      </Callout>

      <H3 id="fastapi">FastAPI</H3>

      <P>
        FastAPI publishes an OpenAPI 3.1 document at <C>/openapi.json</C>, generated
        from the routes and their Pydantic models — point <C>source</C> at it, on the
        running server or on a copy of the file:
      </P>

      <CodeBlock lang="ts" filename="api-dumper.config.ts">
        {FASTAPI}
      </CodeBlock>

      <P>
        Every Pydantic model becomes an entry of <C>components["schemas"]</C>, named
        after its class — <C>Item</C>, <C>ItemCreate</C>, <C>ItemUpdate</C>. The
        records carry no <C>@id</C>, so intersect the schema with one:
      </P>

      <CodeBlock>{FASTAPI_RESOURCE}</CodeBlock>

      <Callout kind="note" title="Item-Input and Item-Output">
        <P>
          When one model reads differently than it writes — a computed field, a
          default — Pydantic 2 publishes it twice, as <C>Item-Input</C> and{" "}
          <C>Item-Output</C>. Type the resource with the output one: it is what the
          list and the detail receive. The document only exists while{" "}
          <C>openapi_url</C> is left on; an application that turns it off in
          production can still generate from a local server.
        </P>
      </Callout>

      <H3 id="other">Any other OpenAPI API</H3>

      <P>
        NestJS, Laravel, Spring, a hand-written spec: if it serves an
        OpenAPI 3.0 or 3.1 document, change <C>source</C> and nothing else. Keep{" "}
        <C>strip</C> if some content type turns responses into unions, drop it
        otherwise; the enums the schema declares come out without a preset.
      </P>

      <H2 id="when">When to regenerate</H2>

      <P>
        Every time the API changes — a field, a route, a serialization group. Make it
        one command the whole team knows, whatever runs it:
      </P>

      <CodeBlock lang="bash" filename="Makefile">
        {MAKEFILE}
      </CodeBlock>

      <Ul>
        <Li>run it against an API that has the change;</Li>
        <Li>
          commit <C>openapi.json</C>, <C>api-schema.ts</C> and <C>enums/</C> with the
          change that needed them;
        </Li>
        <Li>
          read the diff in review — it is the API's change, spelled out, and the
          compile errors it causes are the places the front has to follow.
        </Li>
      </Ul>

      <P>
        And let the CI catch the regeneration someone forgot. <C>--check</C> writes
        nothing and exits with 1 when a generated file differs from what is
        committed:
      </P>

      <CodeBlock lang="bash">{CHECK}</CodeBlock>

      <P>
        It reads <C>source</C> like any run, so point the CI at a schema it can
        reach — a file exported by the back and committed, with{" "}
        <C>bin/console api:openapi:export</C> on API Platform, or an API started in
        the job. Enums taken from the Hydra collections need that API too; enums
        carried by <C>x-enum-iris</C> do not.
      </P>

      <Callout kind="warning" title="A stale cache exports a stale schema">
        <P>
          The schema is whatever the running API describes. On API Platform, its
          metadata cache can outlive a deploy and drop properties from the export
          without an error — clear the cache pools before exporting.
        </P>
      </Callout>
    </DocArticle>
  )
}

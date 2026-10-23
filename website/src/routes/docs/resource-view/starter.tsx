import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, P, Term, Ul } from "@/components/prose"
import { backend, starterCommand } from "@/lib/backends"

export const Route = createFileRoute("/docs/resource-view/starter")({
  head: () => ({
    meta: [
      { title: "Start a project on your API — react-resource-view" },
      {
        name: "description",
        content:
          "One command starts a back office on your API — API Platform, Spring Boot, Supabase, Strapi, FastAPI, Django or any REST API — with the dialect wired and the commands that dump its OpenAPI schema into TypeScript.",
      },
    ],
  }),
  component: Starter,
})

const COMMAND = `npx react-resource-view init my-admin`

const SESSION = `$ npx react-resource-view init my-admin
Which API does it talk to?
  1. API Platform (JSON-LD / Hydra)
  2. Spring Boot (springdoc-openapi)
  3. Another REST API (OpenAPI)
  4. Supabase (PostgREST)
  5. Strapi v4 / v5
  6. FastAPI
  7. Django REST Framework (drf-spectacular)
Choice [1] 2
URL of the API? [http://localhost:8080]
URL of its OpenAPI schema? [http://localhost:8080/v3/api-docs]

Created my-admin — a back office on Spring Boot (springdoc-openapi).

  cd my-admin
  npm install
  npm run api-schema   # dumps http://localhost:8080/v3/api-docs into src/api-schema/
  npm run dev`

const NON_INTERACTIVE = `npx react-resource-view init my-admin \\
  --backend spring-boot \\
  --api-url https://api.example.com \\
  --schema-url https://api.example.com/v3/api-docs \\
  --yes`

const TREE = `my-admin/
├── api-dumper.config.ts   # where the schema is, where the types go
├── Makefile               # make dev, make api-schema, make api-schema-check
├── .env                   # VITE_API_URL — the API the views talk to
└── src/
    ├── setup.ts           # the router, the API URL, the token, the dialect
    ├── scope.ts           # the back office: its resources and its menu
    ├── resources/
    │   └── books.ts       # one resource — copy it for the next
    ├── App.tsx            # reads the URL, renders the view it names
    └── main.tsx`

const SETUP = `// src/setup.ts — Spring Boot
configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: springDialect(),
})`

const DUMP = `npm run api-schema         # reads the schema, writes src/api-schema/
npm run api-schema:check   # in the CI: fails when src/api-schema is stale`

const MAKE = `make api-schema
make api-schema-check`

const TYPED = `import type { components } from "@/api-schema/api-schema"

type Book = components["schemas"]["Book"] & { "@id": string }

export const books = createViewResource<Book>("books", { … })`

const SUPABASE = `# .env
VITE_SUPABASE_ANON_KEY=…
SUPABASE_PROJECT_REF=abcdefghijklmnop

# reads .env, then runs supabase gen types typescript
make api-schema`


/**
 * One starter per backend: the command, the setup it writes, and the backend
 * side. The commands come from the list the landing page shows its logos from.
 */
const TECH = {
  apiPlatform: {
    command: starterCommand(backend("api-platform")),
    setup: `import { configureClient } from "jsonld-api-client"

configureClient({ baseUrl: import.meta.env.VITE_API_URL, getAuthToken })
configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: jsonLdDialect(),
})`,
    config: `export default defineConfig({
  source: "https://localhost/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform",
  strip: { contentTypes: ["text/csv"] },
})`,
    backend: `# config/packages/nelmio_cors.yaml — the API Platform distribution ships it
nelmio_cors:
  defaults:
    allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']

# .env of the API
CORS_ALLOW_ORIGIN='^https?://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?$'`,
  },
  spring: {
    command: starterCommand(backend("spring-boot")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: springDialect(),
})`,
    config: `export default defineConfig({
  source: "http://localhost:8080/v3/api-docs",
  outDir: "src/api-schema",
})`,
    backend: `<!-- pom.xml — publishes /v3/api-docs -->
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.8.0</version>
</dependency>

// The back office runs on another origin while developing.
@Configuration
class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE");
    }
}`,
  },
  rest: {
    command: starterCommand(backend("rest")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  // Plain JSON, ?page=&size=, /items/{id}. Another shape: a dialect of your own.
  dialect: fastapiDialect({ pagination: "page-size" }),
})`,
    config: `export default defineConfig({
  source: "http://localhost:3000/docs/openapi.json",
  outDir: "src/api-schema",
})`,
  },
  jsonServer: {
    command: starterCommand(backend("json-server")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: jsonServerDialect(),
})`,
  },
  supabase: {
    command: starterCommand(backend("supabase")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: supabaseDialect({ apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY }),
})`,
    config: `{
  "scripts": {
    "api-schema": "mkdir -p src/api-schema && npx supabase gen types typescript --project-id \\"$SUPABASE_PROJECT_REF\\" --schema public > src/api-schema/database.types.ts"
  }
}`,
  },
  strapi: {
    command: starterCommand(backend("strapi")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: strapiDialect(),
})`,
    config: `export default defineConfig({
  source: "http://localhost:1337/api/openapi.json",
  outDir: "src/api-schema",
})`,
    backend: `// config/server.js of the Strapi project — opt in to GET /api/openapi.json
module.exports = {
  openapi: {
    "content-api": { access: "public" },
  },
}

# or generate it as a file, and point --schema-url at it
npm run strapi openapi generate -- --output ./openapi.json`,
  },
  django: {
    command: starterCommand(backend("django")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: djangoDialect(),
})`,
    config: `export default defineConfig({
  source: "http://localhost:8000/api/schema/?format=json",
  outDir: "src/api-schema",
})`,
    backend: `# pip install djangorestframework drf-spectacular django-cors-headers django-filter

# settings.py
INSTALLED_APPS += ["rest_framework", "drf_spectacular", "corsheaders", "django_filters"]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # before CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    # …
]

CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "core.pagination.PageSizePagination",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
}

# core/pagination.py
from rest_framework.pagination import PageNumberPagination

class PageSizePagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"  # what the dialect sends

# urls.py
from drf_spectacular.views import SpectacularAPIView

urlpatterns += [path("api/schema/", SpectacularAPIView.as_view())]`,
  },
  fastapi: {
    command: starterCommand(backend("fastapi")),
    setup: `configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: fastapiDialect(),
})`,
    config: `export default defineConfig({
  source: "http://localhost:8000/openapi.json",
  outDir: "src/api-schema",
})`,
    backend: `from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)`,
  },
}

function Starter() {
  return (
    <DocArticle
      toc={[
        { id: "command", title: "One command" },
        { id: "backends", title: "The backends" },
        { id: "per-backend", title: "Per technology" },
        { id: "what", title: "What it writes" },
        { id: "dump", title: "Dumping the API" },
        { id: "options", title: "Options" },
      ]}
    >
      <H2 id="command">One command</H2>

      <P>
        The fastest way to see your API as a back office is to let the package write
        the application around it. Give it a directory, and it asks for the rest:
      </P>

      <CodeBlock lang="bash">{COMMAND}</CodeBlock>

      <P>
        It asks which API the back office talks to, where that API runs, and where
        it publishes its OpenAPI schema — the last guessed from the backend, so
        pressing Enter is usually enough:
      </P>

      <CodeBlock lang="bash">{SESSION}</CodeBlock>

      <P>
        With <C>pnpm dlx</C>, <C>yarn dlx</C> or <C>bunx</C> instead of{" "}
        <C>npx</C>, the commands it prints — and those it writes in the README and
        the Makefile — use that package manager.
      </P>

      <H2 id="backends">The backends</H2>

      <PropsTable
        rows={[
          {
            name: "api-platform",
            type: "jsonLdDialect()",
            default: "/api/docs.jsonopenapi",
            description: (
              <>
                API Platform. Also configures <C>jsonld-api-client</C>, and dumps
                with api-dumper's <C>api-platform</C> preset, CSV stripped.
              </>
            ),
          },
          {
            name: "spring-boot",
            type: "springDialect()",
            default: "/v3/api-docs",
            description: (
              <>
                Spring Boot with{" "}
                <A href="https://springdoc.org">springdoc-openapi</A>: a{" "}
                <C>Page</C>, a <C>PagedModel</C> or Spring Data REST's HAL.
              </>
            ),
          },
          {
            name: "rest",
            type: 'fastapiDialect({ pagination: "page-size" })',
            default: "/openapi.json",
            description: (
              <>
                Any REST API answering plain JSON, paged with <C>?page=&amp;size=</C>.
                If yours spells things otherwise,{" "}
                <A href="/docs/resource-view/backends">a dialect is one object</A>.
              </>
            ),
          },
          {
            name: "supabase",
            type: "supabaseDialect({ apiKey })",
            default: "—",
            description: (
              <>
                Supabase. Its schema is Swagger 2.0, which api-dumper refuses: the
                types come from <C>supabase gen types</C> instead.
              </>
            ),
          },
          {
            name: "strapi",
            type: "strapiDialect()",
            default: "/api/openapi.json",
            description: "Strapi v4 or v5.",
          },
          {
            name: "fastapi",
            type: "fastapiDialect()",
            default: "/openapi.json",
            description: "FastAPI — the Pydantic models become the schemas.",
          },
          {
            name: "django",
            type: "djangoDialect()",
            default: "/api/schema/?format=json",
            description: (
              <>
                Django REST Framework with{" "}
                <A href="https://drf-spectacular.readthedocs.io">drf-spectacular</A>:
                the serializers become the schemas.
              </>
            ),
          },
        ]}
      />

      <P>
        The type column is the <Term id="dialect">dialect</Term> <C>src/setup.ts</C>{" "}
        is written with; the default column is the schema's path, appended to the
        API's URL.
      </P>

      <H2 id="per-backend">Per technology</H2>

      <P>
        One command per backend, ready to paste. Each writes the same project; what
        changes is <C>src/setup.ts</C>, where the schema is read from, and what the
        backend itself has to allow.
      </P>

      <H3 id="starter-api-platform">API Platform</H3>

      <CodeBlock lang="bash">{TECH.apiPlatform.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.apiPlatform.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.apiPlatform.config}</CodeBlock>
      <P>
        The schema is served by API Platform itself; the enums come out of it too
        (<A href="/docs/resource-view/openapi-types">see Types from OpenAPI</A>).
        On the API, let the back office's origin through:
      </P>
      <CodeBlock lang="yaml">{TECH.apiPlatform.backend}</CodeBlock>

      <H3 id="starter-spring-boot">Spring Boot</H3>

      <CodeBlock lang="bash">{TECH.spring.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.spring.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.spring.config}</CodeBlock>
      <P>
        springdoc-openapi publishes the schema at <C>/v3/api-docs</C>; a controller
        returning a <C>Page</C> is read as it stands — see{" "}
        <A href="/docs/resource-view/backends#spring">the Spring Boot dialect</A>. On
        the API:
      </P>
      <CodeBlock filename="pom.xml · CorsConfig.java">{TECH.spring.backend}</CodeBlock>

      <H3 id="starter-rest">Another REST API</H3>

      <CodeBlock lang="bash">{TECH.rest.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.rest.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.rest.config}</CodeBlock>
      <P>
        Express, NestJS, Laravel, Go… anything that publishes
        an OpenAPI 3 document. Pass its URL with <C>--schema-url</C>, since there is
        no convention to guess it from. If the API pages, sorts or nests its lists
        differently, replace the dialect with{" "}
        <A href="/docs/resource-view/backends#custom">one of your own</A> — the rest
        of the project stays.
      </P>

      <H3 id="starter-json-server">json-server</H3>

      <CodeBlock lang="bash">{TECH.jsonServer.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.jsonServer.setup}</CodeBlock>
      <P>
        json-server publishes no OpenAPI document, so there is no <C>api-schema</C>{" "}
        step: the types of the resources are written by hand. Its CORS headers are
        open by default. See{" "}
        <A href="/docs/resource-view/backends#rest">the REST dialect</A> for what
        the preset reads and sends.
      </P>

      <H3 id="starter-supabase">Supabase</H3>

      <CodeBlock lang="bash">{TECH.supabase.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.supabase.setup}</CodeBlock>
      <CodeBlock lang="json" filename="package.json">
        {TECH.supabase.config}
      </CodeBlock>
      <P>
        No api-dumper here: Supabase serves Swagger 2.0, so the types come from its
        own CLI. Fill <C>VITE_SUPABASE_ANON_KEY</C> and <C>SUPABASE_PROJECT_REF</C>{" "}
        in <C>.env</C>; the rows the back office can read are the ones your Row
        Level Security policies allow.
      </P>

      <H3 id="starter-strapi">Strapi</H3>

      <CodeBlock lang="bash">{TECH.strapi.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.strapi.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.strapi.config}</CodeBlock>
      <P>
        Strapi 5 publishes its schema only when asked to — over HTTP, or as a file:
      </P>
      <CodeBlock filename="config/server.js">{TECH.strapi.backend}</CodeBlock>
      <P>
        Give the role the back office signs in with the <C>find</C>,{" "}
        <C>findOne</C>, <C>create</C>, <C>update</C> and <C>delete</C> permissions
        on each collection type.
      </P>

      <H3 id="starter-fastapi">FastAPI</H3>

      <CodeBlock lang="bash">{TECH.fastapi.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.fastapi.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.fastapi.config}</CodeBlock>
      <P>
        FastAPI serves <C>/openapi.json</C> out of the box, the Pydantic models as
        its schemas. On the API:
      </P>
      <CodeBlock filename="main.py">{TECH.fastapi.backend}</CodeBlock>
      <P>
        Writing Python on both sides? <A href="/docs/resource-view/python">The Python
        guide</A> sets FastAPI and Django side by side.
      </P>

      <H3 id="starter-django">Django</H3>

      <CodeBlock lang="bash">{TECH.django.command}</CodeBlock>
      <CodeBlock filename="src/setup.ts">{TECH.django.setup}</CodeBlock>
      <CodeBlock filename="api-dumper.config.ts">{TECH.django.config}</CodeBlock>
      <P>
        Django REST Framework publishes no schema by itself:{" "}
        <A href="https://drf-spectacular.readthedocs.io">drf-spectacular</A> serves
        it at <C>/api/schema/?format=json</C>, the serializers as its schemas. The
        browser calls the API from another origin, so{" "}
        <C>django-cors-headers</C> has to let it through. On the API:
      </P>
      <CodeBlock filename="settings.py · pagination.py · urls.py">
        {TECH.django.backend}
      </CodeBlock>
      <P>
        See <A href="/docs/resource-view/backends#django">the Django dialect</A> for
        what it reads and sends, and{" "}
        <A href="/docs/resource-view/python">the Python guide</A> for FastAPI and
        Django together.
      </P>

      <H2 id="what">What it writes</H2>

      <P>
        A Vite, React, TypeScript and Tailwind project, with TanStack Router for the
        navigation and <A href="/docs/resource-view/admin-layout">AdminLayout</A>{" "}
        around one example <Term id="resource">resource</Term>:
      </P>

      <CodeBlock lang="bash">{TREE}</CodeBlock>

      <P>
        Everything that depends on the backend is in <C>src/setup.ts</C> — the rest
        of the project reads the same whichever you picked:
      </P>

      <CodeBlock filename="src/setup.ts">{SETUP}</CodeBlock>

      <Callout kind="note" title="The browser calls the API">
        <P>
          The <Term id="view">views</Term> fetch from the reader's browser, so the
          API has to allow the origin the back office is served from —{" "}
          <C>http://localhost:5173</C> while developing. Without CORS, the list stays
          empty and the console says why.
        </P>
      </Callout>

      <H2 id="dump">Dumping the API</H2>

      <P>
        The starter comes with the commands that turn the API's schema into
        TypeScript, through{" "}
        <A href="https://github.com/hermez-agency/api-dumper">api-dumper</A>. The
        API has to be running:
      </P>

      <CodeBlock lang="bash">{DUMP}</CodeBlock>

      <P>The same, through the Makefile, which reads <C>.env</C> first:</P>

      <CodeBlock lang="bash">{MAKE}</CodeBlock>

      <P>
        The example resource is typed by hand, so the project compiles before the
        API answers. Once the types are there, take them from the schema:
      </P>

      <CodeBlock filename="src/resources/books.ts">{TYPED}</CodeBlock>

      <P>
        <A href="/docs/resource-view/openapi-types">Types from OpenAPI</A> goes
        through the rest: the enums, the API Platform preset, and when to regenerate.
      </P>

      <H3 id="supabase">On Supabase</H3>

      <CodeBlock lang="bash">{SUPABASE}</CodeBlock>

      <H2 id="options">Options</H2>

      <P>Every question has a flag, so the starter also runs in a script:</P>

      <CodeBlock lang="bash">{NON_INTERACTIVE}</CodeBlock>

      <Ul>
        <Li>
          <C>-b, --backend</C> — <C>api-platform</C>, <C>spring-boot</C>,{" "}
          <C>rest</C>, <C>supabase</C>, <C>strapi</C>, <C>fastapi</C> or <C>django</C>.
        </Li>
        <Li>
          <C>-u, --api-url</C> — the API's URL, written to <C>.env</C>.
        </Li>
        <Li>
          <C>-s, --schema-url</C> — the OpenAPI schema, URL or file; guessed when
          left out.
        </Li>
        <Li>
          <C>--pm</C> — <C>pnpm</C>, <C>npm</C>, <C>yarn</C> or <C>bun</C>, when the
          guess is wrong.
        </Li>
        <Li>
          <C>--dry-run</C> lists the files, <C>--force</C> writes into a directory
          that is not empty, <C>--yes</C> never asks.
        </Li>
      </Ul>
    </DocArticle>
  )
}

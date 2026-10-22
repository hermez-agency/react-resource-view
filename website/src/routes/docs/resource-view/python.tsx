import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { A, C, H2, H3, Li, P, Term, Ul } from "@/components/prose"
import { backend, starterCommand } from "@/lib/backends"

export const Route = createFileRoute("/docs/resource-view/python")({
  head: () => ({
    meta: [
      { title: "react-resource-view for Python developers" },
      {
        name: "description",
        content:
          "A back office on your FastAPI or Django REST Framework API: the starter in one command, the OpenAPI schema, types generated from Pydantic models and serializers, pagination, CORS and token authentication.",
      },
    ],
  }),
  component: Python,
})

const FASTAPI_COMMAND = starterCommand(backend("fastapi"))
const DJANGO_COMMAND = starterCommand(backend("django"))

const FASTAPI_SCHEMA = `# main.py — nothing to add: GET /openapi.json is already there
from fastapi import FastAPI
from pydantic import BaseModel

class Item(BaseModel):
    id: int
    title: str
    status: Literal["draft", "published"]

app = FastAPI()`

const DJANGO_SCHEMA = `# pip install drf-spectacular
# settings.py
INSTALLED_APPS += ["drf_spectacular"]
REST_FRAMEWORK = {"DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema"}

# urls.py — GET /api/schema/?format=json
from drf_spectacular.views import SpectacularAPIView
urlpatterns += [path("api/schema/", SpectacularAPIView.as_view())]`

const TYPES = `npm run api-schema         # api-dumper reads the schema, writes src/api-schema/
npm run api-schema:check   # in the CI: fails when the models changed and the types did not`

const TYPED = `import type { components } from "@/api-schema/api-schema"

// FastAPI: the Pydantic model Item. Django: the serializer ArticleSerializer → Article.
type Item = components["schemas"]["Item"] & { "@id": string }

export const items = createViewResource<Item>("items", { … })`

const FASTAPI_PAGINATION = `from fastapi_pagination import Page, add_pagination, paginate

@app.get("/items", response_model=Page[Item])
def list_items():
    return paginate(repository.all())  # → { items, total, page, size, pages }

add_pagination(app)

# front: dialect: fastapiDialect({ pagination: "page-size" })`

const DJANGO_PAGINATION = `from rest_framework.pagination import PageNumberPagination

class PageSizePagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"  # ?page=2&page_size=10

REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"] = "core.pagination.PageSizePagination"
# → { count, next, previous, results }

# front: dialect: djangoDialect()  (LimitOffsetPagination: { pagination: "limit-offset" })`

const FASTAPI_CORS = `from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],  # Authorization included
)`

const DJANGO_CORS = `# pip install django-cors-headers
INSTALLED_APPS += ["corsheaders"]
MIDDLEWARE.insert(0, "corsheaders.middleware.CorsMiddleware")  # before CommonMiddleware

CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]`

const FASTAPI_AUTH = `# POST /token { username, password } → { access_token, token_type }
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2 = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/items", response_model=Page[Item])
def list_items(token: str = Depends(oauth2)):  # decode the JWT with PyJWT
    ...`

const DJANGO_AUTH = `# pip install djangorestframework-simplejwt
# POST /api/token/ { username, password } → { access, refresh }
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
    "rest_framework_simplejwt.authentication.JWTAuthentication",
]
REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "rest_framework.permissions.IsAuthenticated",
]

urlpatterns += [path("api/token/", TokenObtainPairView.as_view())]`

const TOKEN = `// src/setup.ts — the same for both
function getAuthToken(): string | undefined {
  return localStorage.getItem("token") ?? undefined // sent as Authorization: Bearer …
}

configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: djangoDialect(), // or fastapiDialect()
})`

const ROWS: { topic: string; fastapi: string; django: string }[] = [
  {
    topic: "Dialect",
    fastapi: "fastapiDialect()",
    django: "djangoDialect()",
  },
  {
    topic: "Schema",
    fastapi: "/openapi.json — built in",
    django: "/api/schema/?format=json — drf-spectacular",
  },
  {
    topic: "Types come from",
    fastapi: "Pydantic models",
    django: "Serializers",
  },
  {
    topic: "Page",
    fastapi: "skip / limit, or page / size with fastapi-pagination",
    django: "page / page_size (PageNumberPagination), or limit / offset",
  },
  {
    topic: "Total",
    fastapi: "{ items, total }; a bare array has none",
    django: "{ count, results }; a bare array has none",
  },
  { topic: "Sort", fastapi: "order_by=-created_at", django: "ordering=-created_at" },
  {
    topic: "Record",
    fastapi: "/items/{id}",
    django: "/articles/{id}/ — the trailing slash is DRF's",
  },
  {
    topic: "Validation error",
    fastapi: "422 { detail: [{ loc, msg }] }",
    django: '400 { field: ["message"] }, { detail }',
  },
  { topic: "CORS", fastapi: "CORSMiddleware", django: "django-cors-headers" },
  {
    topic: "Token",
    fastapi: "OAuth2PasswordBearer + PyJWT",
    django: "djangorestframework-simplejwt",
  },
]

function Python() {
  return (
    <DocArticle
      toc={[
        { id: "overview", title: "Side by side" },
        { id: "command", title: "One command" },
        { id: "schema", title: "The OpenAPI schema" },
        { id: "types", title: "Types from your models" },
        { id: "pagination", title: "Pagination" },
        { id: "cors", title: "CORS" },
        { id: "auth", title: "Token authentication" },
      ]}
    >
      <H2 id="overview">Side by side</H2>

      <P>
        You write the API in Python; the back office is React. react-resource-view
        sits between the two: it reads the OpenAPI schema your framework already
        publishes, types the front end from your Pydantic models or serializers,
        and draws the list, detail, create, edit and delete screens of each{" "}
        <Term id="resource">resource</Term> from one declaration. FastAPI and Django
        REST Framework each have a <Term id="dialect">dialect</Term>:
      </P>

      <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium" />
              <th className="px-4 py-2.5 font-medium">FastAPI</th>
              <th className="px-4 py-2.5 font-medium">Django REST Framework</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ topic, fastapi, django }) => (
              <tr
                key={topic}
                className="border-b border-border/60 align-top last:border-0"
              >
                <th className="whitespace-nowrap px-4 py-3 font-medium">{topic}</th>
                <td className="px-4 py-3 font-mono text-[13px]">{fastapi}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{django}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        Each is detailed in{" "}
        <A href="/docs/resource-view/backends#fastapi">Backends &amp; dialects</A>.
      </P>

      <H2 id="command">One command</H2>

      <P>
        <A href="/docs/resource-view/starter">The starter</A> writes a Vite and React
        project with the dialect wired, the API's URL in <C>.env</C> and the commands
        that dump the schema:
      </P>

      <H3 id="command-fastapi">FastAPI</H3>
      <CodeBlock lang="bash">{FASTAPI_COMMAND}</CodeBlock>

      <H3 id="command-django">Django</H3>
      <CodeBlock lang="bash">{DJANGO_COMMAND}</CodeBlock>

      <P>
        The per-technology setups are in{" "}
        <A href="/docs/resource-view/starter#starter-fastapi">Start a project</A>:{" "}
        <A href="/docs/resource-view/starter#starter-fastapi">FastAPI</A> and{" "}
        <A href="/docs/resource-view/starter#starter-django">Django</A>.
      </P>

      <H2 id="schema">The OpenAPI schema</H2>

      <H3 id="schema-fastapi">FastAPI</H3>
      <P>
        FastAPI serves <C>/openapi.json</C> out of the box, generated from your
        routes and Pydantic models.
      </P>
      <CodeBlock filename="main.py">{FASTAPI_SCHEMA}</CodeBlock>

      <H3 id="schema-django">Django</H3>
      <P>
        DRF publishes nothing by itself.{" "}
        <A href="https://drf-spectacular.readthedocs.io">drf-spectacular</A> reads
        the viewsets and serializers and serves the schema as JSON:
      </P>
      <CodeBlock filename="settings.py · urls.py">{DJANGO_SCHEMA}</CodeBlock>

      <H2 id="types">Types from your models</H2>

      <P>
        The starter adds two scripts that run{" "}
        <A href="https://github.com/hermez-agency/api-dumper">api-dumper</A> on the
        schema. A Pydantic model or a serializer becomes an entry of{" "}
        <C>components["schemas"]</C>, named after its class, and the API stays the
        single source of truth:
      </P>
      <CodeBlock lang="bash">{TYPES}</CodeBlock>
      <CodeBlock filename="src/resources/items.ts">{TYPED}</CodeBlock>
      <P>
        The records carry no <C>@id</C>, so the resource intersects the schema with
        one. <A href="/docs/resource-view/openapi-types">Types from OpenAPI</A> has
        the rest, the enums and the Pydantic <C>-Input</C> / <C>-Output</C> pairs
        included.
      </P>

      <H2 id="pagination">Pagination</H2>

      <P>
        A bare list has no total, so the pagination hides itself. Use a paginator
        that counts:
      </P>

      <H3 id="pagination-fastapi">FastAPI — fastapi-pagination</H3>
      <CodeBlock filename="main.py">{FASTAPI_PAGINATION}</CodeBlock>

      <H3 id="pagination-django">Django — PageNumberPagination</H3>
      <CodeBlock filename="settings.py">{DJANGO_PAGINATION}</CodeBlock>

      <Callout kind="note" title="page_size_query_param">
        <P>
          DRF ignores <C>?page_size=</C> unless the paginator sets{" "}
          <C>page_size_query_param</C>. Without it the list keeps the server's page
          size, and the view's rows-per-page choice has no effect.
        </P>
      </Callout>

      <H2 id="cors">CORS</H2>

      <P>
        The views fetch from the browser, on another origin while you develop
        (<C>http://localhost:5173</C>). Without CORS the list stays empty and the
        console says why.
      </P>

      <H3 id="cors-fastapi">FastAPI</H3>
      <CodeBlock filename="main.py">{FASTAPI_CORS}</CodeBlock>

      <H3 id="cors-django">Django</H3>
      <CodeBlock filename="settings.py">{DJANGO_CORS}</CodeBlock>

      <H2 id="auth">Token authentication</H2>

      <P>
        Both frameworks hand out a JWT in exchange for credentials. The front end
        keeps it and gives it to <C>getAuthToken</C>, which the library sends as{" "}
        <C>Authorization: Bearer …</C> with every request:
      </P>

      <H3 id="auth-fastapi">FastAPI</H3>
      <CodeBlock filename="main.py">{FASTAPI_AUTH}</CodeBlock>

      <H3 id="auth-django">Django</H3>
      <CodeBlock filename="settings.py · urls.py">{DJANGO_AUTH}</CodeBlock>

      <H3 id="auth-front">On the React side</H3>
      <CodeBlock filename="src/setup.ts">{TOKEN}</CodeBlock>

      <Ul>
        <Li>
          A <C>401</C> is the API saying the token is missing or expired:{" "}
          <A href="/docs/resource-view/authentication">Authentication</A> shows how a
          scope sends the reader to a sign-in page.
        </Li>
        <Li>
          The sign-in itself — storing the token, refreshing it — is yours, or{" "}
          <A href="/docs/resource-view/authentication-jwt">react-jwt-session</A>'s.
          The starter reads <C>localStorage</C> until you add one.
        </Li>
      </Ul>
    </DocArticle>
  )
}

import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, P, Term, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/resource-view/backends")({
  head: () => ({
    meta: [
      { title: "Backends & dialects — react-resource-view" },
      {
        name: "description",
        content:
          "One declared resource, six backends: API Platform, Spring Boot, Supabase, Strapi, FastAPI and Django, or any REST API, json-server included. What a dialect knows, and how to write your own.",
      },
    ],
  }),
  component: Backends,
})

const CONFIGURE = `import { configureApi, strapiDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://cms.example.com",
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
  dialect: strapiDialect(),
})`

const STRAPI = `import { configureApi, createViewResource, strapiDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://cms.example.com",
  getAuthToken: () => getApiToken(),
  dialect: strapiDialect(),
})

const articles = createViewResource("articles", {
  path: "articles", // → /api/articles
  name: "Articles",
  form: { inputs: { title: { label: "Title" }, body: { label: "Body" } } },
  views: { list: { pageSize: 25 } },
})`

const SUPABASE = `import { configureApi, createViewResource, supabaseDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://xyzcompany.supabase.co",
  getAuthToken: () => getSession()?.access_token,
  dialect: supabaseDialect({ apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY }),
})

const articles = createViewResource("articles", {
  path: "articles", // → /rest/v1/articles
  name: "Articles",
  form: { inputs: { title: { label: "Title" } } },
})`

const FASTAPI = `import { configureApi, createViewResource, fastapiDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => getAccessToken(),
  dialect: fastapiDialect(),
})

const items = createViewResource("items", {
  path: "items", // → /items, /items/{id}
  name: "Items",
  form: { inputs: { title: { label: "Title" } } },
})`

const SPRING = `import { configureApi, createViewResource, springDialect } from "react-resource-view"

configureApi({
  baseUrl: "http://localhost:8080",
  getAuthToken: () => getAccessToken(),
  dialect: springDialect(),
})

const books = createViewResource("books", {
  path: "/api/books", // → /api/books?page=0&size=20, /api/books/{id}
  name: "Books",
  form: { inputs: { title: { label: "Title" } } },
})`

const REST = `import {
  configureApi,
  drfCursorDialect,
  jsonServerDialect,
  restDialect,
} from "react-resource-view"

// json-server: _page, _limit, _sort + _order, the total in X-Total-Count
configureApi({ baseUrl: "http://localhost:3000", dialect: jsonServerDialect() })

// DRF's CursorPagination: ?cursor=…&page_size=…, no total
configureApi({ baseUrl: "http://localhost:8000", dialect: drfCursorDialect() })

// Any other plain REST API, described rather than written
configureApi({
  baseUrl: "https://api.example.com",
  dialect: restDialect({
    pageParam: "page",
    sizeParam: "per_page",
    sortParam: "sort_by", // sort_by=-title,id
    totalHeader: "X-Total-Count",
  }),
})`

const REST_LINK = `// A GitHub-style API: no page number, the next page is the Link header's URL
restDialect({ pageParam: false, linkHeader: true, sizeParam: "per_page" })

// A cursor in a query parameter, found in the Link header or in the body
restDialect({ cursorParam: "after", linkHeader: true })
restDialect({ cursorParam: "cursor", itemsKey: "results", nextKey: "next" })`

const DJANGO = `import { configureApi, createViewResource, djangoDialect } from "react-resource-view"

configureApi({
  baseUrl: "http://localhost:8000",
  getAuthToken: () => getAccessToken(),
  dialect: djangoDialect(),
})

const articles = createViewResource("articles", {
  path: "/api/articles", // → /api/articles/?page=1&page_size=30, /api/articles/{id}/
  name: "Articles",
  form: { inputs: { title: { label: "Title" } } },
})`

const DJANGO_VIEWSET = `class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "author"]   # ?status=published
    ordering_fields = ["created_at", "title"] # ?ordering=-created_at

class ArticlePagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"        # ?page_size=10

router = DefaultRouter()                       # /api/articles/, /api/articles/{id}/
router.register("articles", ArticleViewSet)`

const DJANGO_ERROR = `// What DRF answers with a 400…
{ "title": ["This field is required."], "address": { "city": ["Too short."] } }

// …lands under the inputs named "title" and "address.city".
// { "non_field_errors": [...] } blames the form, { "detail": "..." } explains the error.`

const SPRING_CONTROLLER = `@RestController
@RequestMapping("/api/books")
class BookController {
    @GetMapping
    Page<Book> list(@RequestParam(required = false) String title, Pageable pageable) { … }

    @GetMapping("/{id}") Book read(@PathVariable Long id) { … }
    @PostMapping Book create(@Valid @RequestBody Book book) { … }
    @PutMapping("/{id}") Book update(@PathVariable Long id, @Valid @RequestBody Book book) { … }
    @DeleteMapping("/{id}") void delete(@PathVariable Long id) { … }
}`

const FASTAPI_ROUTES = `@app.get("/items", response_model=list[Item])
def list_items(skip: int = 0, limit: int = 30, order_by: str | None = None):
    return repository.list(offset=skip, limit=limit, order_by=order_by)

@app.get("/items/{item_id}", response_model=Item)
def read_item(item_id: int): ...

@app.post("/items", response_model=Item)
def create_item(item: ItemCreate): ...

@app.patch("/items/{item_id}", response_model=Item)
def update_item(item_id: int, item: ItemUpdate): ...

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int): ...`

const FASTAPI_PAGINATION = `from fastapi_pagination import Page, add_pagination, paginate

@app.get("/items", response_model=Page[Item])
def list_items():
    return paginate(repository.all())

add_pagination(app)

# and on the React side:
# dialect: fastapiDialect({ pagination: "page-size" })`

const FASTAPI_ERROR = `// What FastAPI answers with a 422…
{ "detail": [{ "loc": ["body", "address", "city"], "msg": "Field required" }] }

// …lands under the input named "address.city".`

const PER_RESOURCE = `// Most of the application is on Strapi…
configureApi({ baseUrl, dialect: strapiDialect() })

// …and this one table is not.
const invoices = createViewResource("invoices", {
  path: "invoices",
  dialect: supabaseDialect({ apiKey }),
})`

const FILTERS = `views: {
  list: {
    // → itemsPerPage
    pageSize: 25,
    // → order
    sort: { fields: ["createdAt", "title"], initial: { createdAt: "desc" } },
    // → a field of the resource
    filters: {
      inputs: { title: { label: "Title" } },
      initial: { status: "published" },
    },
  },
}`

const OPERATORS = `// Strapi — any operator the REST API accepts
filters: { initial: { title: { $containsi: "hello" } } }

// Supabase — any PostgREST operator
filters: { initial: { createdAt: { gte: "2024-01-01" } } }`

const CUSTOM = `import type { ApiDialectInterface } from "react-resource-view"

const myDialect: ApiDialectInterface = {
  name: "my-api",
  buildRequest: ({ name, path, id, filter, item }) => ({ url: "…", method: "GET" }),
  readCollection: (payload) => ({ items: payload.rows, totalItems: payload.count }),
  readItem: (payload) => payload.row,
  getId: (item) => item?.uuid,
  getIdentifier: (item) => item?.uuid,
  normalizeError: (payload, status) => ({ status, detail: payload.message }),
  referencesAreIris: false,
}`

function Backends() {
  return (
    <DocArticle
      toc={[
        { id: "dialects", title: "What a dialect knows" },
        { id: "strapi", title: "Strapi" },
        { id: "supabase", title: "Supabase" },
        { id: "fastapi", title: "FastAPI" },
        { id: "spring", title: "Spring Boot" },
        { id: "django", title: "Django" },
        { id: "rest", title: "Any REST API, json-server" },
        { id: "several", title: "Two backends at once" },
        { id: "filters", title: "Filters, pages and sorts" },
        { id: "custom", title: "Another API entirely" },
      ]}
    >
      <H2 id="dialects">What a dialect knows</H2>

      <P>
        The <Term id="view">views</Term> know a <Term id="resource">resource</Term>{" "}
        has rows, pages and filters. How a given backend spells those — the URL an
        item lives at, the query string a filter becomes, the envelope a collection
        arrives in, where the validation errors hide — is a{" "}
        <Term id="dialect">dialect</Term>, set once at startup.
      </P>

      <CodeBlock filename="setup.ts">{CONFIGURE}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "jsonLdDialect()",
            type: "ApiDialectInterface",
            default: "the default",
            description: (
              <>
                <A href="https://api-platform.com">API Platform</A> and Hydra.{" "}
                <C>member</C> / <C>totalItems</C>, IRIs, <C>page</C> and{" "}
                <C>itemsPerPage</C>, Hydra <C>violations</C>, Mercure, CSV export.
              </>
            ),
          },
          {
            name: "strapiDialect()",
            type: "ApiDialectInterface",
            default: "—",
            description: (
              <>
                <A href="https://strapi.io">Strapi</A> v4 and v5.{" "}
                <C>pagination[page]</C>, <C>filters[field][$eq]</C>, <C>sort[0]</C>,{" "}
                <C>populate</C>, writes wrapped in <C>data</C>, <C>documentId</C>.
              </>
            ),
          },
          {
            name: "supabaseDialect()",
            type: "ApiDialectInterface",
            default: "—",
            description: (
              <>
                <A href="https://supabase.com">Supabase</A>, over PostgREST.{" "}
                <C>limit</C> / <C>offset</C>, <C>field=eq.value</C>, <C>order</C>, the
                count read from <C>Content-Range</C>, rows addressed by their primary
                key.
              </>
            ),
          },
          {
            name: "fastapiDialect()",
            type: "ApiDialectInterface",
            default: "—",
            description: (
              <>
                <A href="https://fastapi.tiangolo.com">FastAPI</A>. <C>skip</C> /{" "}
                <C>limit</C> or <C>page</C> / <C>size</C>, plain query filters,{" "}
                <C>order_by=-field</C>, a bare array or <C>{`{ items, total }`}</C>,
                422 <C>detail</C> pinned on its field.
              </>
            ),
          },
          {
            name: "springDialect()",
            type: "ApiDialectInterface",
            default: "—",
            description: (
              <>
                <A href="https://spring.io/projects/spring-boot">Spring Boot</A>.{" "}
                <C>page</C> (from 0) and <C>size</C>, <C>sort=field,desc</C>, a{" "}
                <C>Page</C>, a <C>PagedModel</C> or Spring Data REST's HAL, Bean
                Validation errors pinned on their field.
              </>
            ),
          },
          {
            name: "djangoDialect()",
            type: "ApiDialectInterface",
            default: "—",
            description: (
              <>
                <A href="https://www.django-rest-framework.org">
                  Django REST Framework
                </A>
                . <C>page</C> / <C>page_size</C> or <C>limit</C> / <C>offset</C>,
                django-filter query filters, <C>ordering=-field</C>, a{" "}
                <C>{`{ count, results }`}</C> page or a bare array, field errors
                pinned on their input.
              </>
            ),
          },
        ]}
      />

      <Callout kind="note" title="An API Platform application changes nothing">
        <P>
          JSON-LD is the default, and it still goes through the client configured
          with <C>configureClient</C> — middleware, scope header and{" "}
          <A href="/docs/resource-view/openapi-types">typed paths</A> included.{" "}
          <C>configureApi</C> falls back to that client's settings when it is given
          none of its own, so nothing has to move.
        </P>
      </Callout>

      <H2 id="strapi">Strapi</H2>

      <CodeBlock filename="setup.ts">{STRAPI}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "apiPath",
            type: "string",
            default: `"/api"`,
            description: (
              <>
                Prefix of the REST routes. A <C>path</C> that already carries it is
                left alone, so <C>"articles"</C> and <C>"/api/articles"</C> both work.
              </>
            ),
          },
          {
            name: "populate",
            type: `string | string[] | false`,
            default: `"*"`,
            description:
              "Which relations come back. Without it the relation columns of a list are empty.",
          },
          {
            name: "identifier",
            type: `"documentId" | "id"`,
            default: `"documentId"`,
            description: (
              <>
                How an entry is addressed: <C>documentId</C> on v5, <C>id</C> on v4. A
                record without the preferred one falls back to the other.
              </>
            ),
          },
          {
            name: "defaultOperator",
            type: "string",
            default: `"$eq"`,
            description: (
              <>
                What a plain filter value becomes. Pass <C>"$containsi"</C> to turn
                every text filter into a case-insensitive search.
              </>
            ),
          },
        ]}
      />

      <P>
        The v4 <C>{`{ id, attributes }`}</C> envelope — and the <C>{`{ data }`}</C>{" "}
        wrapper around each relation — is flattened on the way in, so{" "}
        <C>article.title</C> and <C>article.author.name</C> read the same on both
        versions and a resource declared once works against either.
      </P>

      <Callout kind="note" title="No CSV export">
        <P>
          Strapi serves no CSV endpoint, so the export button of a list hides itself
          rather than offering a download that would 404. Nothing to configure.
        </P>
      </Callout>

      <H2 id="supabase">Supabase</H2>

      <CodeBlock filename="setup.ts">{SUPABASE}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "apiKey",
            type: "string | (() => string | undefined)",
            default: "—",
            description: (
              <>
                The project's anon key, sent as <C>apikey</C> on every request
                alongside the signed-in user's token. A function is accepted, for a
                key that only exists once the environment is read.
              </>
            ),
          },
          {
            name: "primaryKey",
            type: "string",
            default: `"id"`,
            description:
              "How a row is addressed — PostgREST has no item route, so a single row is a filter on this column.",
          },
          {
            name: "select",
            type: "string",
            default: `"*"`,
            description: (
              <>
                Sent with every read. <C>"*,author(*)"</C> embeds a relation, the way
                Supabase joins.
              </>
            ),
          },
          {
            name: "schema",
            type: "string",
            default: "public",
            description: (
              <>
                Sent as <C>Accept-Profile</C> and <C>Content-Profile</C>, for a table
                outside <C>public</C>.
              </>
            ),
          },
          {
            name: "defaultTextOperator",
            type: `"eq" | "ilike" | "like"`,
            default: `"eq"`,
            description: (
              <>
                What a plain text filter becomes. <C>"ilike"</C> turns the filter bar
                into a case-insensitive search bar.
              </>
            ),
          },
          {
            name: "restPath",
            type: "string",
            default: `"/rest/v1"`,
            description: "Prefix of the REST routes.",
          },
        ]}
      />

      <Callout kind="note" title="The count comes from a header">
        <P>
          PostgREST counts only when asked, and answers in <C>Content-Range</C>. The
          dialect asks — <C>Prefer: count=exact</C> — and keeps the total in the
          collection it hands the views, since the header is long gone by the time the
          pagination renders. A list whose API reports no total renders no pagination
          rather than inventing a page count.
        </P>
      </Callout>

      <H2 id="fastapi">FastAPI</H2>

      <CodeBlock filename="setup.ts">{FASTAPI}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "primaryKey",
            type: "string",
            default: `"id"`,
            description: (
              <>
                The field a record is addressed by in <C>/items/{"{id}"}</C>. It is
                left out of the body of a write, since it travels in the URL.
              </>
            ),
          },
          {
            name: "pagination",
            type: `"skip-limit" | "page-size"`,
            default: `"skip-limit"`,
            description: (
              <>
                <C>?skip=20&amp;limit=10</C>, as in the FastAPI tutorial, or{" "}
                <C>?page=3&amp;size=10</C>, as{" "}
                <A href="https://github.com/uriyyo/fastapi-pagination">
                  fastapi-pagination
                </A>{" "}
                reads it.
              </>
            ),
          },
          {
            name: "defaultItemsPerPage",
            type: "number",
            default: "30",
            description: "Rows per page when a list asks for none.",
          },
          {
            name: "orderParam",
            type: "string",
            default: `"order_by"`,
            description: (
              <>
                The query parameter the sort travels in, as{" "}
                <C>-created_at,title</C>: a <C>-</C> in front of a descending field,
                several fields separated by commas.
              </>
            ),
          },
          {
            name: "trailingSlash",
            type: "boolean",
            default: "false",
            description: (
              <>
                Ends the collection route with a slash — <C>/items/</C> — when the API
                declares it so. FastAPI answers the other spelling with a 307 redirect.
              </>
            ),
          },
        ]}
      />

      <P>A CRUD router written as in the FastAPI tutorial needs nothing more:</P>

      <CodeBlock filename="main.py">{FASTAPI_ROUTES}</CodeBlock>

      <Callout kind="note" title="A bare array carries no total">
        <P>
          The tutorial's list answers a plain array, so the dialect knows the rows but
          not how many there are: the pagination hides itself rather than inventing a
          page count. Answer a <C>{`{ items, total }`}</C> page — what
          fastapi-pagination returns — and it counts its pages from <C>total</C>.
        </P>
      </Callout>

      <CodeBlock filename="main.py">{FASTAPI_PAGINATION}</CodeBlock>

      <P>
        A 422 lands under the field its <C>loc</C> names, the leading <C>body</C>,{" "}
        <C>query</C> or <C>path</C> dropped and the rest joined with dots. A{" "}
        <C>detail</C> spelled as a sentence — <C>raise HTTPException(404, "Item not
        found")</C> — becomes the explanation of the error.
      </P>

      <CodeBlock>{FASTAPI_ERROR}</CodeBlock>

      <H2 id="spring">Spring Boot</H2>

      <CodeBlock filename="setup.ts">{SPRING}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "primaryKey",
            type: "string",
            default: `"id"`,
            description: (
              <>
                The field a record is addressed by in <C>/books/{"{id}"}</C>. When
                Spring Data REST keeps it out of the body, it is read from the
                record's <C>_links.self.href</C>.
              </>
            ),
          },
          {
            name: "defaultItemsPerPage",
            type: "number",
            default: "20",
            description: "Rows per page when a list asks for none — Spring's own default.",
          },
          {
            name: "updateMethod",
            type: `"PUT" | "PATCH"`,
            default: `"PUT"`,
            description: (
              <>
                The verb an edit goes out with. <C>PUT</C> is what a{" "}
                <C>@PutMapping</C> answers; Spring Data REST takes both.
              </>
            ),
          },
        ]}
      />

      <P>
        A controller taking a <C>Pageable</C> and returning a <C>Page</C> needs
        nothing more — the dialect reads <C>content</C> and <C>totalElements</C>,
        or the <C>page</C> block of a <C>PagedModel</C> and of HAL:
      </P>

      <CodeBlock filename="BookController.java">{SPRING_CONTROLLER}</CodeBlock>

      <P>
        A failed <C>@Valid</C> lands each <C>errors[].field</C> on its input; a{" "}
        <C>ProblemDetail</C> gives the error its title and explanation.{" "}
        <A href="https://springdoc.org">springdoc-openapi</A> publishes the schema at{" "}
        <C>/v3/api-docs</C>, which is what{" "}
        <A href="/docs/resource-view/starter">the starter</A> dumps.
      </P>

      <H2 id="django">Django</H2>

      <CodeBlock filename="setup.ts">{DJANGO}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "primaryKey",
            type: "string",
            default: `"id"`,
            description: (
              <>
                The field a record is addressed by in <C>/articles/{"{id}"}/</C>. It
                is left out of the body of a write, since it travels in the URL.
              </>
            ),
          },
          {
            name: "pagination",
            type: `"page-number" | "limit-offset"`,
            default: `"page-number"`,
            description: (
              <>
                <C>?page=3&amp;page_size=10</C>, DRF's <C>PageNumberPagination</C>,
                or <C>?limit=10&amp;offset=20</C>, its <C>LimitOffsetPagination</C>.
              </>
            ),
          },
          {
            name: "pageSizeParam",
            type: "string",
            default: `"page_size"`,
            description: (
              <>
                The page size parameter of <C>page-number</C>. DRF only reads one
                when the paginator sets <C>page_size_query_param</C>.
              </>
            ),
          },
          {
            name: "defaultItemsPerPage",
            type: "number",
            default: "30",
            description: "Rows per page when a list asks for none.",
          },
          {
            name: "orderParam",
            type: "string",
            default: `"ordering"`,
            description: (
              <>
                The query parameter the sort travels in, as <C>-created_at,title</C>:
                the one of DRF's <C>OrderingFilter</C>.
              </>
            ),
          },
          {
            name: "trailingSlash",
            type: "boolean",
            default: "true",
            description: (
              <>
                Ends every route with a slash — <C>/articles/</C>,{" "}
                <C>/articles/1/</C> — as DRF's routers declare them. Django redirects
                the other spelling, and a redirect loses the body of a POST. Pass{" "}
                <C>false</C> for a router built with <C>trailing_slash=False</C>.
              </>
            ),
          },
        ]}
      />

      <P>
        A <C>ModelViewSet</C> with django-filter and <C>OrderingFilter</C> needs
        nothing more:
      </P>

      <CodeBlock filename="views.py">{DJANGO_VIEWSET}</CodeBlock>

      <Callout kind="note" title="Without pagination, no total">
        <P>
          A view with no paginator answers a bare array: the dialect knows the rows
          but not how many there are, so the pagination hides itself. A paginated one
          answers <C>{`{ count, next, previous, results }`}</C> and the page count
          comes from <C>count</C>. <C>CursorPagination</C> has no count either.
        </P>
      </Callout>

      <P>
        A 400 maps each field to its messages: a nested serializer gives{" "}
        <C>address.city</C>, a list of them <C>lines.1.qty</C>, and{" "}
        <C>non_field_errors</C> the form itself. A <C>detail</C> — a 401, a 403, a
        404 — becomes the explanation of the error. The schema comes from{" "}
        <A href="https://drf-spectacular.readthedocs.io">drf-spectacular</A>, at{" "}
        <C>/api/schema/?format=json</C>, and{" "}
        <A href="/docs/resource-view/starter#starter-django">the starter</A> dumps
        it. Writing Python on both sides?{" "}
        <A href="/docs/resource-view/python">The Python guide</A> sets FastAPI and
        Django side by side.
      </P>

      <CodeBlock>{DJANGO_ERROR}</CodeBlock>

      <H2 id="rest">Any REST API, json-server</H2>

      <P>
        For a JSON API with no dialect of its own, <C>restDialect</C> is configured
        rather than written: the names of its parameters, and where the total or the
        next page comes from. <C>jsonServerDialect()</C> and{" "}
        <C>drfCursorDialect()</C> are two ready-made configurations.
      </P>

      <CodeBlock filename="setup.ts">{REST}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "pageParam",
            type: "string | false",
            default: `"page"`,
            description: (
              <>
                The query parameter of the page number. <C>false</C> sends none: with{" "}
                <C>linkHeader</C>, the list follows the URL of the <C>next</C> link.
              </>
            ),
          },
          {
            name: "sizeParam",
            type: "string",
            default: `"limit"`,
            description: <>The query parameter of the page size.</>,
          },
          {
            name: "sortParam",
            type: "string",
            default: `"sort"`,
            description: (
              <>
                A sort as <C>-created,title</C>: one field per column, a <C>-</C> in
                front of a descending one.
              </>
            ),
          },
          {
            name: "directionParam",
            type: "string",
            description: (
              <>
                Where the directions go when the API keeps them apart:{" "}
                <C>_sort=views,title&amp;_order=desc,asc</C> on json-server.
              </>
            ),
          },
          {
            name: "totalHeader",
            type: "string",
            description: (
              <>
                The response header counting the rows across every page, such as{" "}
                <C>X-Total-Count</C>. Without a total the pagination offers Previous
                and Next only.
              </>
            ),
          },
          {
            name: "linkHeader",
            type: "boolean",
            default: "false",
            description: (
              <>
                Reads <C>Link: &lt;…&gt;; rel="next"</C> for the next page.
              </>
            ),
          },
          {
            name: "cursorParam",
            type: "string",
            description: (
              <>
                Pages by cursor: the list sends the cursor the previous page pointed
                to in this parameter, taken from the <C>next</C> link or from{" "}
                <C>nextKey</C>. The last page is the one with no <C>next</C>.
              </>
            ),
          },
          {
            name: "itemsKey · totalKey · nextKey",
            type: "string",
            description: (
              <>
                When the body is an object: the key of the rows (<C>results</C>), of
                the total, of the next page's URL (<C>next</C>). A bare array
                otherwise.
              </>
            ),
          },
          {
            name: "primaryKey · trailingSlash",
            type: "string · boolean",
            default: `"id" · false`,
            description: (
              <>
                The field a record is addressed by in <C>/posts/{"{id}"}</C>, and
                whether routes end with a slash.
              </>
            ),
          },
        ]}
      />

      <CodeBlock filename="setup.ts">{REST_LINK}</CodeBlock>

      <P>
        A page read this way carries a <C>nextCursor</C>: a string to ask for the
        next page, <C>null</C> on the last one. The list and the export both follow
        it, so a cursor-paged API is walked page after page without a total.{" "}
        <A href="/docs/resource-view/starter#starter-json-server">The starter</A>{" "}
        wires json-server in one command.
      </P>

      <H2 id="several">Two backends at once</H2>

      <P>
        A resource may carry a <C>dialect</C> of its own, which wins over the
        configured one:
      </P>

      <CodeBlock>{PER_RESOURCE}</CodeBlock>

      <Callout kind="warning" title="The dialect is read when the resource is built">
        <P>
          <C>createViewResource</C> builds the resource's{" "}
          <Term id="repository">repository</Term> as it runs, so <C>configureApi</C>{" "}
          has to come first — in a file your entry point imports before it declares
          any resource.
        </P>
      </Callout>

      <H2 id="filters">Filters, pages and sorts</H2>

      <P>
        They are written once, in the package's own vocabulary, and the dialect
        translates them. Three keys are reserved; everything else in a filter is a
        field of the resource.
      </P>

      <CodeBlock>{FILTERS}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "page",
            type: "number",
            default: "1",
            description: (
              <>
                1-based page. <C>pagination[page]</C> on Strapi, an <C>offset</C> on
                Supabase, <C>skip</C> (or <C>page</C>) on FastAPI, <C>page</C> on API
                Platform and Django.
              </>
            ),
          },
          {
            name: "itemsPerPage",
            type: "number",
            default: "views.list.pageSize",
            description: (
              <>
                Rows per page. <C>pagination[pageSize]</C> on Strapi, <C>limit</C> on
                Supabase, <C>limit</C> (or <C>size</C>) on FastAPI, <C>page_size</C> on Django. The page size a list declares travels with the request, so
                the pagination counts the rows the API actually returned.
              </>
            ),
          },
          {
            name: "order",
            type: `Record<string, "asc" | "desc">`,
            default: "—",
            description: (
              <>
                The sort, field by field. <C>sort[0]=title:asc</C> on Strapi,{" "}
                <C>order=title.asc</C> on Supabase, <C>order_by=title</C> (<C>-title</C>{" "}
                descending) on FastAPI, <C>ordering=-title</C> on Django.
              </>
            ),
          },
        ]}
      />

      <P>A field filter takes the shape its value has:</P>

      <Ul>
        <Li>
          a scalar is an equality — <C>filters[title][$eq]</C>, <C>title=eq.hello</C>,{" "}
          <C>title=hello</C>;
        </Li>
        <Li>
          an array is “any of” — <C>filters[status][$in]</C>,{" "}
          <C>status=in.(draft,published)</C>, <C>status=draft&amp;status=published</C>;
        </Li>
        <Li>
          an object carries its own operator through untouched — on Strapi and
          Supabase; FastAPI reads flat query parameters, so its filters stay scalars
          and arrays.
        </Li>
      </Ul>

      <CodeBlock>{OPERATORS}</CodeBlock>

      <P>
        An empty value is left out of the request entirely: an empty search box widens
        the list rather than filtering it down to rows whose field is the empty
        string.
      </P>

      <H3>Errors</H3>

      <P>
        Whatever the backend called it — Hydra <C>violations</C>, a Strapi{" "}
        <C>error.details.errors</C>, a PostgREST message, a FastAPI 422{" "}
        <C>detail</C>, a DRF field list — the dialect reads it into one shape, and the{" "}
        <Term id="form">form</Term> pins each message on the field that caused it. A
        failure with no field to blame, such as a unique constraint, becomes the
        toast's description instead. See{" "}
        <A href="/docs/form/validation">validation &amp; API errors</A>.
      </P>

      <H2 id="custom">Another API entirely</H2>

      <P>
        A dialect is one object, and <C>ApiDialectInterface</C> is exported to
        implement it:
      </P>

      <CodeBlock filename="myDialect.ts">{CUSTOM}</CodeBlock>

      <P>
        <C>buildRequest</C> is called with one of six operations —{" "}
        <C>getCollection</C>, <C>getItem</C>, <C>createItem</C>, <C>updateItem</C>,{" "}
        <C>replaceItem</C>, <C>removeItem</C> — and describes the request rather than
        sending it; the package's own repository sends it, carrying the base URL, the
        token and the headers. Two optional members go further: <C>exportRequest</C>{" "}
        lights up the CSV button, and <C>realtimeTopic</C> subscribes a list to a push
        channel.
      </P>

      <P>
        A resource that brings its own <C>repository: {"{"} getCollection, getItem,
        … {"}"}</C> still bypasses all of this, as it always could — see{" "}
        <A href="/docs/resource-view/resources">declaring a resource</A>.
      </P>
    </DocArticle>
  )
}

import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { configureApi, resetApiConfig } from "@/api/apiConfig"
import { strapiDialect } from "@/api/dialect/strapiDialect"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"
import { fastapiDialect } from "@/api/dialect/fastapiDialect"
import { layout } from "@/layout/layout"

/**
 * The same declared resource, rendered against backends that agree on
 * nothing: not the URL of a page, not the envelope of a collection, not the
 * name of an identifier. What the reader sees must be the same list.
 */

const requests: string[] = []

function respondWith(body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async (url: string) => {
    requests.push(String(url))
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json", ...headers },
    })
  }) as unknown as typeof fetch
}

const declaration = {
  form: { inputs: { title: { label: "Title" } } },
  views: { list: { pageSize: 25, layouts: [layout.table()] } },
}

afterEach(() => {
  resetApiConfig()
  requests.length = 0
  localStorage.clear()
})

describe("a resource declared once, rendered against Strapi", () => {
  it("lists the entries of a v5 collection", async () => {
    configureApi({
      baseUrl: "https://cms.example.com",
      fetch: respondWith({
        data: [
          { id: 1, documentId: "kx8f2", title: "Hello from Strapi" },
          { id: 2, documentId: "m91ab", title: "Second entry" },
        ],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 4, total: 84 } },
      }),
    })

    const articles = createViewResource("strapi_articles", {
      path: "articles",
      name: "Articles",
      dialect: strapiDialect(),
      ...declaration,
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "strapi",
          resourceId: "strapi_articles",
        }}
        configuration={{ resources: [articles], defaultScope: "strapi" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Hello from Strapi")).toBeInTheDocument()
    })
    expect(screen.getByText("Second entry")).toBeInTheDocument()

    // The page size the view declares travels with the request, so the
    // pagination on screen counts the same rows the API returned.
    expect(requests[0]).toContain("https://cms.example.com/api/articles")
    expect(requests[0]).toContain("pagination%5BpageSize%5D=25")
    // The count Strapi reported drives the pagination, not the rows on screen.
    expect(screen.getAllByText(/of 84$/).length).toBeGreaterThan(0)
  })
})

describe("a resource declared once, rendered against Supabase", () => {
  it("lists the rows of a table, and counts them from the response headers", async () => {
    configureApi({
      baseUrl: "https://project.supabase.co",
      fetch: respondWith(
        [
          { id: 1, title: "Hello from Supabase" },
          { id: 2, title: "Second row" },
        ],
        { "content-range": "0-1/84" }
      ),
    })

    const articles = createViewResource("supabase_articles", {
      path: "articles",
      name: "Articles",
      dialect: supabaseDialect({ apiKey: "anon-key" }),
      ...declaration,
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "supabase",
          resourceId: "supabase_articles",
        }}
        configuration={{ resources: [articles], defaultScope: "supabase" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Hello from Supabase")).toBeInTheDocument()
    })
    expect(screen.getByText("Second row")).toBeInTheDocument()

    expect(requests[0]).toContain("https://project.supabase.co/rest/v1/articles")
    expect(requests[0]).toContain("limit=25")
    // The count arrived in Content-Range and survived into the envelope.
    expect(screen.getAllByText(/of 84$/).length).toBeGreaterThan(0)
  })
})

describe("a resource declared once, rendered against FastAPI", () => {
  it("lists a fastapi-pagination page, and counts it from its total", async () => {
    configureApi({
      baseUrl: "https://api.example.com",
      fetch: respondWith({
        items: [
          { id: 1, title: "Hello from FastAPI" },
          { id: 2, title: "Second item" },
        ],
        total: 84,
        page: 1,
        size: 25,
        pages: 4,
      }),
    })

    const articles = createViewResource("fastapi_articles", {
      path: "articles",
      name: "Articles",
      dialect: fastapiDialect({ pagination: "page-size" }),
      ...declaration,
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "fastapi",
          resourceId: "fastapi_articles",
        }}
        configuration={{ resources: [articles], defaultScope: "fastapi" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Hello from FastAPI")).toBeInTheDocument()
    })
    expect(screen.getByText("Second item")).toBeInTheDocument()

    expect(requests[0]).toContain("https://api.example.com/articles?")
    expect(requests[0]).toContain("size=25")
    // The total fastapi-pagination reported drives the pagination.
    expect(screen.getAllByText(/of 84$/).length).toBeGreaterThan(0)
  })

  it("lists the bare array of the tutorial, paged by skip and limit", async () => {
    configureApi({
      baseUrl: "https://api.example.com",
      fetch: respondWith([
        { id: 1, title: "Hello from FastAPI" },
        { id: 2, title: "Second item" },
      ]),
    })

    const articles = createViewResource("fastapi_plain_articles", {
      path: "articles",
      name: "Articles",
      dialect: fastapiDialect(),
      ...declaration,
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "fastapi_plain",
          resourceId: "fastapi_plain_articles",
        }}
        configuration={{ resources: [articles], defaultScope: "fastapi_plain" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Hello from FastAPI")).toBeInTheDocument()
    })
    expect(screen.getByText("Second item")).toBeInTheDocument()

    expect(requests[0]).toContain("skip=0")
    expect(requests[0]).toContain("limit=25")
  })
})

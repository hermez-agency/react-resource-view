import { afterEach, describe, expect, it, vi } from "vitest"
import { restRepository } from "@/api/restRepository"
import { configureApi, resetApiConfig } from "@/api/apiConfig"
import { strapiDialect } from "@/api/dialect/strapiDialect"
import { fastapiDialect } from "@/api/dialect/fastapiDialect"
import { djangoDialect } from "@/api/dialect/djangoDialect"
import { springDialect } from "@/api/dialect/springDialect"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"
import { ApiRequestError } from "@/api/apiRequestError"

interface FakeResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
}

/** A fetch answering one canned response, and recording what it was asked. */
function fakeFetch(...responses: FakeResponse[]) {
  const calls: { url: string; init: RequestInit }[] = []
  let index = 0

  const implementation = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    const { status = 200, body, headers = {} } = responses[index++] ?? {}
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    })
  })

  return { implementation: implementation as unknown as typeof fetch, calls }
}

afterEach(() => {
  resetApiConfig()
})

describe("the repository, against Strapi", () => {
  const dialect = strapiDialect()

  it("reads a list into the envelope every view reads", async () => {
    const { implementation, calls } = fakeFetch({
      body: {
        data: [
          { id: 1, documentId: "kx8f2", title: "First" },
          { id: 2, documentId: "m91ab", title: "Second" },
        ],
        meta: { pagination: { page: 1, pageSize: 25, total: 57 } },
      },
    })
    configureApi({ baseUrl: "https://cms.example.com", fetch: implementation })

    const repository = restRepository({ path: "articles", dialect })
    const { data } = await repository.getCollection({ page: 1 })

    expect(calls[0].url).toContain("https://cms.example.com/api/articles")
    expect(calls[0].url).toContain("pagination%5Bpage%5D=1")
    expect(data.totalItems).toBe(57)
    // `items` is what the views read; `member` keeps it a JSON-LD collection,
    // so anything written against the old shape still reads it.
    expect(data.items).toHaveLength(2)
    expect(data.member).toBe(data.items)
    expect(data.items[0].title).toBe("First")
  })

  it("flattens the v4 envelope on the way in", async () => {
    const { implementation } = fakeFetch({
      body: {
        data: [{ id: 1, attributes: { title: "First" } }],
        meta: { pagination: { total: 1 } },
      },
    })
    configureApi({ fetch: implementation })

    const { data } = await restRepository({
      path: "articles",
      dialect,
    }).getCollection()

    expect(data.items[0]).toEqual({ id: 1, title: "First" })
  })

  it("carries the bearer token the application supplies", async () => {
    const { implementation, calls } = fakeFetch({ body: { data: [], meta: {} } })
    configureApi({ fetch: implementation, getAuthToken: () => "a-token" })

    await restRepository({ path: "articles", dialect }).getCollection()

    expect((calls[0].init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer a-token"
    )
  })

  it("creates an entry and reads back what Strapi stored", async () => {
    const { implementation, calls } = fakeFetch({
      status: 201,
      body: { data: { id: 3, documentId: "zz1", title: "Draft" } },
    })
    configureApi({ fetch: implementation })

    const { data } = await restRepository({ path: "articles", dialect }).createItem({
      title: "Draft",
    })

    expect(calls[0].init.method).toBe("POST")
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      data: { title: "Draft" },
    })
    expect(data).toEqual({ id: 3, documentId: "zz1", title: "Draft" })
  })

  it("updates the entry the record's own identifier points at", async () => {
    const { implementation, calls } = fakeFetch({
      body: { data: { id: 1, documentId: "kx8f2", title: "New" } },
    })
    configureApi({ fetch: implementation })

    await restRepository({ path: "articles", dialect }).updateItem({
      documentId: "kx8f2",
      title: "New",
    })

    expect(calls[0].init.method).toBe("PUT")
    expect(calls[0].url).toContain("/api/articles/kx8f2")
  })

  it("throws a failure the forms can read, rather than a bare status", async () => {
    const { implementation } = fakeFetch({
      status: 400,
      body: {
        error: {
          status: 400,
          name: "ValidationError",
          message: "1 error occurred",
          details: { errors: [{ path: ["title"], message: "title is required" }] },
        },
      },
    })
    configureApi({ fetch: implementation })

    const promise = restRepository({ path: "articles", dialect }).createItem({})

    await expect(promise).rejects.toBeInstanceOf(ApiRequestError)
    await expect(promise).rejects.toMatchObject({ status: 400 })
  })
})

describe("the repository, against Supabase", () => {
  const dialect = supabaseDialect({ apiKey: "anon-key" })

  it("reads the bare array and the count out of the response headers", async () => {
    const { implementation, calls } = fakeFetch({
      body: [{ id: 1, title: "First" }],
      headers: { "content-range": "0-0/573" },
    })
    configureApi({ baseUrl: "https://project.supabase.co", fetch: implementation })

    const { data } = await restRepository({
      path: "articles",
      dialect,
    }).getCollection({
      page: 2,
      itemsPerPage: 25,
    })

    expect(calls[0].url).toContain("https://project.supabase.co/rest/v1/articles")
    expect(calls[0].url).toContain("offset=25")
    expect(data.items).toEqual([{ id: 1, title: "First" }])
    // The header is gone by the time a view reads the collection again, so the
    // total is kept in the envelope rather than re-read.
    expect(data.totalItems).toBe(573)
  })

  it("carries the project key alongside the user's token", async () => {
    const { implementation, calls } = fakeFetch({ body: [] })
    configureApi({ fetch: implementation, getAuthToken: () => "user-jwt" })

    await restRepository({ path: "articles", dialect }).getCollection()

    const headers = calls[0].init.headers as Record<string, string>
    expect(headers["apikey"]).toBe("anon-key")
    expect(headers["Authorization"]).toBe("Bearer user-jwt")
  })

  it("reads one row rather than the array it would otherwise be wrapped in", async () => {
    const { implementation } = fakeFetch({ body: { id: 42, title: "First" } })
    configureApi({ fetch: implementation })

    const { data } = await restRepository({ path: "articles", dialect }).getItem({
      id: "42",
    })

    expect(data).toEqual({ id: 42, title: "First" })
  })

  it("answers a delete that returns no content", async () => {
    const { implementation, calls } = fakeFetch({ status: 204 })
    configureApi({ fetch: implementation })

    await restRepository({ path: "articles", dialect }).removeItem({ id: "42" })

    expect(calls[0].init.method).toBe("DELETE")
    expect(calls[0].url).toContain("id=eq.42")
  })

  it("reports the constraint the database refused on", async () => {
    const { implementation } = fakeFetch({
      status: 409,
      body: { code: "23505", message: "duplicate key", details: "already exists" },
    })
    configureApi({ fetch: implementation })

    await expect(
      restRepository({ path: "articles", dialect }).createItem({ slug: "hello" })
    ).rejects.toMatchObject({ status: 409 })
  })
})

describe("opening a record by the id of the URL, with a custom primary key", () => {
  const cases = [
    {
      name: "FastAPI",
      dialect: fastapiDialect({ primaryKey: "slug" }),
      url: "/articles/hello",
    },
    {
      name: "Django",
      dialect: djangoDialect({ primaryKey: "slug" }),
      url: "/articles/hello/",
    },
    {
      name: "Spring",
      dialect: springDialect({ primaryKey: "slug" }),
      url: "/articles/hello",
    },
  ]

  it.each(cases)("$name asks for the record, not the collection", async (c) => {
    const { implementation, calls } = fakeFetch({ body: { slug: "hello" } })
    configureApi({ baseUrl: "http://x", fetch: implementation })

    await restRepository({ path: "articles", dialect: c.dialect }).getItem({
      id: "hello",
    })

    expect(calls[0].url).toBe(`http://x${c.url}`)
  })
})

describe("a list answer that is not what the dialect reads", () => {
  const htmlFetch = () =>
    vi.fn(
      async () =>
        new Response("<!doctype html><html><body>SPA</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })
    ) as unknown as typeof fetch

  it("throws an ApiRequestError when the 200 is not JSON, instead of an empty list", async () => {
    configureApi({ baseUrl: "https://app.example.com", fetch: htmlFetch() })

    const repository = restRepository({ path: "tasks", dialect: fastapiDialect() })
    const error = await repository.getCollection({}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error.status).toBe(200)
    expect(error.message).toContain("Réponse non JSON")
    expect(error.message).toContain("baseUrl")
  })

  it("warns in development when the envelope holds rows the dialect did not find", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { implementation } = fakeFetch({ body: { data: [{ id: 1 }] } })
    configureApi({ baseUrl: "https://api.example.com", fetch: implementation })

    const repository = restRepository({ path: "tasks", dialect: fastapiDialect() })
    const { data } = await repository.getCollection({})

    expect(data.items).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain("Enveloppe")
    warn.mockRestore()
  })

  it("does not warn for a genuinely empty list", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { implementation } = fakeFetch({ body: { items: [], total: 0 } })
    configureApi({ baseUrl: "https://api.example.com", fetch: implementation })

    const repository = restRepository({ path: "tasks", dialect: fastapiDialect() })
    await repository.getCollection({})

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe("the signal of a read", () => {
  it("reaches fetch, so that a request nobody waits for any more can be cut", async () => {
    const { implementation, calls } = fakeFetch(
      { body: { data: [], meta: {} } },
      { body: { data: {} } }
    )
    configureApi({ baseUrl: "https://api.test", fetch: implementation })
    const repository = restRepository({
      path: "/api/tasks",
      dialect: strapiDialect(),
    }) as any
    const controller = new AbortController()

    await repository.getCollection({}, { signal: controller.signal })
    await repository.getItem({ id: "1" }, { signal: controller.signal })

    expect(calls.map((call) => call.init.signal)).toEqual([
      controller.signal,
      controller.signal,
    ])
  })
})

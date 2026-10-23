import { describe, expect, it } from "vitest"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"

const dialect = supabaseDialect({ apiKey: "anon-key" })

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("the Supabase dialect", () => {
  describe("addressing", () => {
    it("puts the table under the REST prefix", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(url.split("?")[0]).toBe("/rest/v1/articles")
    })

    it("leaves a path that already carries the prefix", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "/rest/v1/articles",
      })

      expect(url.split("?")[0]).toBe("/rest/v1/articles")
    })

    it("addresses a row by a filter on its key, PostgREST having no item route", () => {
      const request = dialect.buildRequest({
        name: "getItem",
        path: "articles",
        id: "42",
      })

      expect(request.url.split("?")[0]).toBe("/rest/v1/articles")
      expect(queryOf(request.url).get("id")).toBe("eq.42")
      // Without this PostgREST answers a one-element array rather than the row.
      expect(request.headers?.["Accept"]).toBe("application/vnd.pgrst.object+json")
    })

    it("addresses it by the primary key the table actually uses", () => {
      const bySlug = supabaseDialect({ primaryKey: "slug" })
      const { url } = bySlug.buildRequest({
        name: "getItem",
        path: "articles",
        id: "hello-world",
      })

      expect(queryOf(url).get("slug")).toBe("eq.hello-world")
    })
  })

  describe("the query a list sends", () => {
    it("turns a page into a limit and an offset", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("limit")).toBe("10")
      expect(queryOf(url).get("offset")).toBe("20")
    })

    it("asks for the count, without which the list cannot be paged through", () => {
      const request = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(request.headers?.["Prefer"]).toBe("count=exact")
    })

    it("writes a plain value as an equality", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { status: "published" },
      })

      expect(queryOf(url).get("status")).toBe("eq.published")
    })

    it("keeps the operator the caller chose", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { createdAt: { gte: "2024-01-01" } },
      })

      expect(queryOf(url).get("createdAt")).toBe("gte.2024-01-01")
    })

    it("matches any of the values of an array", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { status: ["draft", "published"] },
      })

      expect(queryOf(url).get("status")).toBe("in.(draft,published)")
    })

    it("quotes a value carrying a character PostgREST reserves", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: "Hello, world" },
      })

      expect(queryOf(url).get("title")).toBe('eq."Hello, world"')
    })

    it("searches rather than matches when the application asked it to", () => {
      const searching = supabaseDialect({ defaultTextOperator: "ilike" })
      const { url } = searching.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: "hell" },
      })

      expect(queryOf(url).get("title")).toBe("ilike.*hell*")
    })

    it("sorts on several columns at once", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { order: { created_at: "desc", title: "asc" } },
      })

      expect(queryOf(url).get("order")).toBe("created_at.desc,title.asc")
    })
  })

  describe("writing", () => {
    it("asks for the stored row back, defaults and triggers included", () => {
      const request = dialect.buildRequest({
        name: "createItem",
        path: "articles",
        item: { title: "Draft" },
      })

      expect(request.method).toBe("POST")
      expect(request.body).toEqual({ title: "Draft" })
      expect(request.headers?.["Prefer"]).toBe("return=representation")
    })

    it("patches the row its key points at, and leaves that key alone", () => {
      const request = dialect.buildRequest({
        name: "updateItem",
        path: "articles",
        id: "42",
        item: { id: "42", title: "New title" },
      })

      expect(request.method).toBe("PATCH")
      expect(queryOf(request.url).get("id")).toBe("eq.42")
      expect(request.body).toEqual({ title: "New title" })
    })

    it("deletes the row its key points at", () => {
      const request = dialect.buildRequest({
        name: "removeItem",
        path: "articles",
        id: "42",
      })

      expect(request.method).toBe("DELETE")
      expect(queryOf(request.url).get("id")).toBe("eq.42")
    })
  })

  describe("credentials", () => {
    it("carries the project key on every request", () => {
      expect(
        dialect.buildRequest({ name: "getCollection", path: "articles" }).headers?.[
          "apikey"
        ]
      ).toBe("anon-key")
    })

    it("reads a key that only exists once the environment is", () => {
      let key: string | undefined
      const late = supabaseDialect({ apiKey: () => key })

      key = "resolved-later"

      expect(
        late.buildRequest({ name: "getCollection", path: "articles" }).headers?.[
          "apikey"
        ]
      ).toBe("resolved-later")
    })

    it("names the schema when the table is not in public", () => {
      const other = supabaseDialect({ schema: "billing" })

      expect(
        other.buildRequest({ name: "getCollection", path: "invoices" }).headers?.[
          "Accept-Profile"
        ]
      ).toBe("billing")
    })
  })

  describe("reading", () => {
    it("reads the bare array a table answers with", () => {
      expect(dialect.readCollection([{ id: 1 }, { id: 2 }]).items).toHaveLength(2)
    })

    it("takes the total out of Content-Range", () => {
      const page = dialect.readCollection([{ id: 1 }], {
        headers: new Headers({ "content-range": "0-24/573" }),
      })

      expect(page.totalItems).toBe(573)
    })

    it("reports no total when the API counted nothing", () => {
      const page = dialect.readCollection([{ id: 1 }], {
        headers: new Headers({ "content-range": "0-24/*" }),
      })

      expect(page.totalItems).toBeUndefined()
    })

    it("unwraps the one-element array a write can answer with", () => {
      expect(dialect.readItem([{ id: 1, title: "First" }])).toEqual({
        id: 1,
        title: "First",
      })
    })
  })

  describe("errors", () => {
    it("gathers what PostgREST said into one explanation", () => {
      const error = dialect.normalizeError(
        {
          code: "23505",
          message: "duplicate key value violates unique constraint",
          details: "Key (slug)=(hello) already exists.",
          hint: null,
        },
        409
      )

      expect(error?.status).toBe(409)
      expect(error?.detail).toBe(
        "duplicate key value violates unique constraint — Key (slug)=(hello) already exists."
      )
      // A constraint is not a field: there is no input to pin it on.
      expect(error?.violations).toEqual([])
    })
  })

  describe("exporting", () => {
    it("exports every filtered row rather than the page on screen", () => {
      const request = dialect.exportRequest?.("articles", {
        status: "published",
        page: 2,
        itemsPerPage: 10,
      })

      expect(request?.headers?.["Accept"]).toBe("text/csv")
      expect(queryOf(request?.url ?? "").get("status")).toBe("eq.published")
      expect(queryOf(request?.url ?? "").get("limit")).toBeNull()
      expect(queryOf(request?.url ?? "").get("offset")).toBeNull()
    })
  })
})

import { describe, expect, it } from "vitest"
import { djangoDialect } from "@/api/dialect/djangoDialect"

const dialect = djangoDialect()

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("the Django REST Framework dialect", () => {
  describe("addressing", () => {
    it("lists a collection at its path, with DRF's trailing slash", () => {
      const request = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(request.method).toBe("GET")
      expect(request.url.split("?")[0]).toBe("/articles/")
    })

    it("reads a record at /articles/{id}/", () => {
      expect(
        dialect.buildRequest({ name: "getItem", path: "/articles/", id: "42" })
      ).toEqual({ url: "/articles/42/", method: "GET" })
    })

    it("creates on the collection", () => {
      const request = dialect.buildRequest({
        name: "createItem",
        path: "articles",
        item: { title: "Draft" },
      })

      expect(request).toEqual({
        url: "/articles/",
        method: "POST",
        body: { title: "Draft" },
      })
    })

    it("patches, replaces and deletes the record its key points at", () => {
      const update = dialect.buildRequest({
        name: "updateItem",
        path: "articles",
        id: "42",
        item: { id: 42, "@id": "/articles/42/", title: "New title" },
      })
      const replace = dialect.buildRequest({
        name: "replaceItem",
        path: "articles",
        id: "42",
        item: { id: 42, title: "New title" },
      })
      const remove = dialect.buildRequest({
        name: "removeItem",
        path: "articles",
        id: "42",
      })

      expect(update).toMatchObject({ url: "/articles/42/", method: "PATCH" })
      // The key travels in the URL, not in the serializer's payload.
      expect(update.body).toEqual({ title: "New title" })
      expect(replace).toMatchObject({ url: "/articles/42/", method: "PUT" })
      expect(replace.body).toEqual({ title: "New title" })
      expect(remove).toEqual({ url: "/articles/42/", method: "DELETE" })
    })

    it("drops the slash for an API that routes without it", () => {
      const bare = djangoDialect({ trailingSlash: false })

      expect(
        bare
          .buildRequest({ name: "getCollection", path: "articles/" })
          .url.split("?")[0]
      ).toBe("/articles")
      expect(
        bare.buildRequest({ name: "getItem", path: "articles", id: "42" }).url
      ).toBe("/articles/42")
    })

    it("addresses a record by the primary key the model actually uses", () => {
      const bySlug = djangoDialect({ primaryKey: "slug" })

      expect(bySlug.getIdentifier({ id: 1, slug: "hello-world" })).toBe(
        "hello-world"
      )
      expect(
        bySlug.buildRequest({
          name: "updateItem",
          path: "articles",
          id: "hello-world",
          item: { slug: "hello-world", title: "Hello" },
        }).body
      ).toEqual({ title: "Hello" })
    })
  })

  describe("the query a list sends", () => {
    it("turns a page into PageNumberPagination's page and page_size", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("page")).toBe("3")
      expect(queryOf(url).get("page_size")).toBe("10")
      expect(queryOf(url).get("offset")).toBeNull()
    })

    it("asks for the first page of the default size when the list names none", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(queryOf(url).get("page")).toBe("1")
      expect(queryOf(url).get("page_size")).toBe("30")
    })

    it("sends the page size under the parameter the paginator reads", () => {
      const sized = djangoDialect({ pageSizeParam: "per_page" })
      const { url } = sized.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { itemsPerPage: 5 },
      })

      expect(queryOf(url).get("per_page")).toBe("5")
      expect(queryOf(url).has("page_size")).toBe(false)
    })

    it("turns a page into LimitOffsetPagination's limit and offset", () => {
      const paged = djangoDialect({ pagination: "limit-offset" })
      const { url } = paged.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("limit")).toBe("10")
      expect(queryOf(url).get("offset")).toBe("20")
      expect(queryOf(url).get("page")).toBeNull()
    })

    it("sorts on several fields, a minus in front of a descending one", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { order: { created_at: "desc", title: "asc" } },
      })

      expect(queryOf(url).get("ordering")).toBe("-created_at,title")
    })

    it("sends the sort under the parameter the API reads", () => {
      const sorted = djangoDialect({ orderParam: "sort" })
      const { url } = sorted.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { order: { title: "asc" } },
      })

      expect(queryOf(url).get("sort")).toBe("title")
      expect(queryOf(url).get("ordering")).toBeNull()
    })

    it("writes a filter as a plain query parameter", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { status: "published", published: true },
      })

      expect(queryOf(url).get("status")).toBe("published")
      expect(queryOf(url).get("published")).toBe("true")
    })

    it("repeats the parameter for each value of an array", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { tag: ["news", "tech"] },
      })

      expect(queryOf(url).getAll("tag")).toEqual(["news", "tech"])
    })

    it("writes a date in ISO", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { since: new Date("2024-01-01T00:00:00.000Z") },
      })

      expect(queryOf(url).get("since")).toBe("2024-01-01T00:00:00.000Z")
    })

    it("leaves out an empty value rather than filter on it", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: "", tag: [], status: null, author: undefined },
      })

      for (const key of ["title", "tag", "status", "author"]) {
        expect(queryOf(url).has(key)).toBe(false)
      }
    })
  })

  describe("reading", () => {
    it("reads DRF's page and takes the total out of count", () => {
      const page = dialect.readCollection({
        count: 84,
        next: "http://api/articles/?page=2",
        previous: null,
        results: [{ id: 1 }, { id: 2 }],
      })

      expect(page.items).toEqual([{ id: 1 }, { id: 2 }])
      expect(page.totalItems).toBe(84)
    })

    it("reads the bare array of an unpaginated view, which reports no total", () => {
      const page = dialect.readCollection([{ id: 1 }, { id: 2 }])

      expect(page.items).toHaveLength(2)
      expect(page.totalItems).toBeUndefined()
    })

    it("reads a cursor page, which has no count", () => {
      const page = dialect.readCollection({
        next: null,
        previous: null,
        results: [{ id: 1 }],
      })

      expect(page.items).toEqual([{ id: 1 }])
      expect(page.totalItems).toBeUndefined()
    })

    it("reads nothing out of a payload that is not a list", () => {
      expect(dialect.readCollection(null)).toEqual({ items: [] })
    })

    it("reads a record as it came, and names it by its key as a string", () => {
      expect(dialect.readItem({ id: 1, title: "First" })).toEqual({
        id: 1,
        title: "First",
      })
      expect(dialect.getId({ id: 42 })).toBe("42")
      expect(dialect.getIdentifier({ id: 42 })).toBe("42")
      expect(dialect.getId(undefined)).toBeUndefined()
    })
  })

  describe("errors", () => {
    it("pins each message of a 400 on its field", () => {
      const error = dialect.normalizeError(
        { title: ["This field is required."], slug: ["Too short.", "Not unique."] },
        400
      )

      expect(error?.status).toBe(400)
      expect(error?.violations).toEqual([
        { propertyPath: "title", message: "This field is required." },
        { propertyPath: "slug", message: "Too short." },
        { propertyPath: "slug", message: "Not unique." },
      ])
    })

    it("joins the path of a nested serializer with dots", () => {
      const error = dialect.normalizeError(
        {
          address: { city: ["Too short."] },
          lines: [{}, { qty: ["Must be positive."] }],
        },
        400
      )

      expect(error?.violations).toEqual([
        { propertyPath: "address.city", message: "Too short." },
        { propertyPath: "lines.1.qty", message: "Must be positive." },
      ])
    })

    it("leaves non_field_errors to the form itself", () => {
      const error = dialect.normalizeError(
        { non_field_errors: ["Passwords do not match."] },
        400
      )

      expect(error?.violations).toEqual([
        { propertyPath: "", message: "Passwords do not match." },
      ])
    })

    it("reads a detail as the explanation", () => {
      expect(
        dialect.normalizeError(
          { detail: "Authentication credentials were not provided." },
          401
        )
      ).toEqual({
        status: 401,
        detail: "Authentication credentials were not provided.",
      })
    })

    it("keeps only the status of a body it does not recognise", () => {
      expect(dialect.normalizeError({ error: "boom" }, 500)).toEqual({ status: 500 })
      expect(dialect.normalizeError("Internal Server Error", 500)).toEqual({
        status: 500,
      })
    })
  })

  it("treats a relation as a value, not as an IRI to resolve", () => {
    expect(dialect.referencesAreIris).toBe(false)
    expect(dialect.exportRequest).toBeUndefined()
    expect(dialect.realtimeTopic).toBeUndefined()
  })
})

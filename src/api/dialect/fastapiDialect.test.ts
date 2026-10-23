import { describe, expect, it } from "vitest"
import { fastapiDialect } from "@/api/dialect/fastapiDialect"

const dialect = fastapiDialect()

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("the FastAPI dialect", () => {
  describe("addressing", () => {
    it("lists a collection at its path", () => {
      const request = dialect.buildRequest({ name: "getCollection", path: "items" })

      expect(request.method).toBe("GET")
      expect(request.url.split("?")[0]).toBe("/items")
    })

    it("reads a record at its own path segment", () => {
      const request = dialect.buildRequest({
        name: "getItem",
        path: "/items",
        id: "42",
      })

      expect(request).toEqual({ url: "/items/42", method: "GET" })
    })

    it("creates on the collection", () => {
      const request = dialect.buildRequest({
        name: "createItem",
        path: "items",
        item: { title: "Draft" },
      })

      expect(request.method).toBe("POST")
      expect(request.url).toBe("/items")
      expect(request.body).toEqual({ title: "Draft" })
    })

    it("patches, replaces and deletes the record its key points at", () => {
      const update = dialect.buildRequest({
        name: "updateItem",
        path: "items",
        id: "42",
        item: { id: 42, "@id": "/items/42", title: "New title" },
      })
      const replace = dialect.buildRequest({
        name: "replaceItem",
        path: "items",
        id: "42",
        item: { id: 42, title: "New title" },
      })
      const remove = dialect.buildRequest({
        name: "removeItem",
        path: "items",
        id: "42",
      })

      expect(update).toMatchObject({ url: "/items/42", method: "PATCH" })
      // The key travels in the URL, not in the Pydantic model.
      expect(update.body).toEqual({ title: "New title" })
      expect(replace).toMatchObject({ url: "/items/42", method: "PUT" })
      expect(replace.body).toEqual({ title: "New title" })
      expect(remove).toEqual({ url: "/items/42", method: "DELETE" })
    })

    it("ends the collection route with a slash when the API declares it so", () => {
      const slashed = fastapiDialect({ trailingSlash: true })

      expect(
        slashed
          .buildRequest({ name: "getCollection", path: "items" })
          .url.split("?")[0]
      ).toBe("/items/")
      expect(slashed.buildRequest({ name: "createItem", path: "items" }).url).toBe(
        "/items/"
      )
      expect(
        slashed.buildRequest({ name: "getItem", path: "items", id: "42" }).url
      ).toBe("/items/42")
    })

    it("leaves the slash off by default, even when the path carries one", () => {
      expect(
        dialect
          .buildRequest({ name: "getCollection", path: "/items/" })
          .url.split("?")[0]
      ).toBe("/items")
    })

    it("addresses a record by the primary key the model actually uses", () => {
      const bySlug = fastapiDialect({ primaryKey: "slug" })

      expect(bySlug.getIdentifier({ id: 1, slug: "hello-world" })).toBe(
        "hello-world"
      )
      expect(
        bySlug.buildRequest({
          name: "updateItem",
          path: "items",
          id: "hello-world",
          item: { slug: "hello-world", title: "Hello" },
        }).body
      ).toEqual({ title: "Hello" })
    })
  })

  describe("the query a list sends", () => {
    it("turns a page into the tutorial's skip and limit", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("skip")).toBe("20")
      expect(queryOf(url).get("limit")).toBe("10")
      expect(queryOf(url).get("page")).toBeNull()
    })

    it("asks for the first page of the default size when the list names none", () => {
      const { url } = dialect.buildRequest({ name: "getCollection", path: "items" })

      expect(queryOf(url).get("skip")).toBe("0")
      expect(queryOf(url).get("limit")).toBe("30")
    })

    it("turns a page into fastapi-pagination's page and size", () => {
      const paged = fastapiDialect({ pagination: "page-size" })
      const { url } = paged.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("page")).toBe("3")
      expect(queryOf(url).get("size")).toBe("10")
      expect(queryOf(url).get("skip")).toBeNull()
    })

    it("sorts on several fields, a minus in front of a descending one", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { order: { created_at: "desc", title: "asc" } },
      })

      expect(queryOf(url).get("order_by")).toBe("-created_at,title")
    })

    it("sends the sort under the parameter the API reads", () => {
      const sorted = fastapiDialect({ orderParam: "sort" })
      const { url } = sorted.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { order: { title: "asc" } },
      })

      expect(queryOf(url).get("sort")).toBe("title")
      expect(queryOf(url).get("order_by")).toBeNull()
    })

    it("writes a filter as a plain query parameter", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { status: "published", published: true },
      })

      expect(queryOf(url).get("status")).toBe("published")
      expect(queryOf(url).get("published")).toBe("true")
    })

    it("repeats the parameter for each value of an array", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { tag: ["news", "tech"] },
      })

      expect(queryOf(url).getAll("tag")).toEqual(["news", "tech"])
    })

    it("writes a date in ISO", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { since: new Date("2024-01-01T00:00:00.000Z") },
      })

      expect(queryOf(url).get("since")).toBe("2024-01-01T00:00:00.000Z")
    })

    it("leaves out an empty value rather than filter on it", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "items",
        filter: { title: "", tag: [], status: null, author: undefined },
      })

      expect(queryOf(url).has("title")).toBe(false)
      expect(queryOf(url).has("tag")).toBe(false)
      expect(queryOf(url).has("status")).toBe(false)
      expect(queryOf(url).has("author")).toBe(false)
    })
  })

  describe("reading", () => {
    it("reads the bare array of the tutorial, which reports no total", () => {
      const page = dialect.readCollection([{ id: 1 }, { id: 2 }])

      expect(page.items).toHaveLength(2)
      expect(page.totalItems).toBeUndefined()
    })

    it("takes the total out of a fastapi-pagination page", () => {
      const page = dialect.readCollection({
        items: [{ id: 1 }],
        total: 84,
        page: 1,
        size: 1,
        pages: 84,
      })

      expect(page.items).toEqual([{ id: 1 }])
      expect(page.totalItems).toBe(84)
    })

    it("reads a record as it came", () => {
      expect(dialect.readItem({ id: 1, title: "First" })).toEqual({
        id: 1,
        title: "First",
      })
    })

    it("names a record by its key, as a string", () => {
      expect(dialect.getId({ id: 42 })).toBe("42")
      expect(dialect.getIdentifier({ id: 42 })).toBe("42")
      expect(dialect.getId(undefined)).toBeUndefined()
    })
  })

  describe("errors", () => {
    it("pins a 422 on the field its loc names", () => {
      const error = dialect.normalizeError(
        {
          detail: [
            {
              type: "missing",
              loc: ["body", "title"],
              msg: "Field required",
              input: {},
            },
          ],
        },
        422
      )

      expect(error?.status).toBe(422)
      expect(error?.violations).toEqual([
        { propertyPath: "title", message: "Field required" },
      ])
    })

    it("joins the loc of a nested field with dots", () => {
      const error = dialect.normalizeError(
        {
          detail: [
            {
              type: "string_too_short",
              loc: ["body", "address", "city"],
              msg: "String should have at least 2 characters",
            },
          ],
        },
        422
      )

      expect(error?.violations).toEqual([
        {
          propertyPath: "address.city",
          message: "String should have at least 2 characters",
        },
      ])
    })

    it("leaves an error on the whole body to the form itself", () => {
      const error = dialect.normalizeError(
        { detail: [{ loc: ["body"], msg: "Input should be a valid dictionary" }] },
        422
      )

      expect(error?.violations).toEqual([
        { propertyPath: "", message: "Input should be a valid dictionary" },
      ])
    })

    it("reads a detail spelled as a sentence as the explanation", () => {
      const error = dialect.normalizeError({ detail: "Item not found" }, 404)

      expect(error).toEqual({ status: 404, detail: "Item not found" })
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

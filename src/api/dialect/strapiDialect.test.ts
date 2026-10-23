import { describe, expect, it } from "vitest"
import { flattenStrapiRecord, strapiDialect } from "@/api/dialect/strapiDialect"

const dialect = strapiDialect()

/** The query string of a built request, as a lookup. */
function queryOf(url: string): Record<string, string[]> {
  const params = new URLSearchParams(url.split("?")[1] ?? "")
  const result: Record<string, string[]> = {}
  params.forEach((value, key) => {
    result[key] = [...(result[key] ?? []), value]
  })
  return result
}

describe("the Strapi dialect", () => {
  describe("addressing", () => {
    it("prefixes the REST routes, and leaves a path that already carries it", () => {
      expect(
        dialect.buildRequest({ name: "getCollection", path: "articles" }).url
      ).toMatch(/^\/api\/articles/)

      expect(
        dialect.buildRequest({ name: "getCollection", path: "/api/articles" }).url
      ).toMatch(/^\/api\/articles/)
    })

    it("addresses one entry by the identifier Strapi gave it", () => {
      const request = dialect.buildRequest({
        name: "getItem",
        path: "articles",
        id: "kx8f2",
      })

      expect(request.method).toBe("GET")
      expect(request.url.split("?")[0]).toBe("/api/articles/kx8f2")
    })
  })

  describe("the query a list sends", () => {
    it("spells the page the way Strapi paginates", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url)["pagination[page]"]).toEqual(["3"])
      expect(queryOf(url)["pagination[pageSize]"]).toEqual(["10"])
    })

    it("turns a plain value into an equality filter", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: "hello" },
      })

      expect(queryOf(url)["filters[title][$eq]"]).toEqual(["hello"])
    })

    it("keeps the operator when the caller spelled one out", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: { $containsi: "hell" } },
      })

      expect(queryOf(url)["filters[title][$containsi]"]).toEqual(["hell"])
    })

    it("matches any of the values of an array", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { status: ["draft", "published"] },
      })

      expect(queryOf(url)["filters[status][$in][]"]).toEqual(["draft", "published"])
    })

    it("sorts field by field, in the order given", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { order: { publishedAt: "desc", title: "asc" } },
      })

      expect(queryOf(url)["sort[0]"]).toEqual(["publishedAt:desc"])
      expect(queryOf(url)["sort[1]"]).toEqual(["title:asc"])
    })

    it("populates the relations, without which the list shows empty columns", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(queryOf(url)["populate"]).toEqual(["*"])
    })

    it("leaves an empty filter out, so an empty search box widens the list", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { title: "", tags: [] },
      })

      expect(Object.keys(queryOf(url))).toEqual(["populate"])
    })
  })

  describe("writing", () => {
    it("wraps the payload in `data`, and updates with PUT", () => {
      const request = dialect.buildRequest({
        name: "updateItem",
        path: "articles",
        id: "kx8f2",
        item: { documentId: "kx8f2", title: "New title" },
      })

      expect(request.method).toBe("PUT")
      expect(request.url).toBe("/api/articles/kx8f2")
      // The identifier travels in the URL; sending it again would rewrite it.
      expect(request.body).toEqual({ data: { title: "New title" } })
    })

    it("creates against the collection", () => {
      const request = dialect.buildRequest({
        name: "createItem",
        path: "articles",
        item: { title: "Draft" },
      })

      expect(request.method).toBe("POST")
      expect(request.url).toBe("/api/articles")
      expect(request.body).toEqual({ data: { title: "Draft" } })
    })
  })

  describe("reading", () => {
    it("reads a v5 collection, total included", () => {
      const page = dialect.readCollection({
        data: [{ id: 1, documentId: "kx8f2", title: "First" }],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 3, total: 57 } },
      })

      expect(page.items).toEqual([{ id: 1, documentId: "kx8f2", title: "First" }])
      expect(page.totalItems).toBe(57)
    })

    it("flattens the v4 envelope, so both versions read alike", () => {
      const page = dialect.readCollection({
        data: [
          {
            id: 1,
            attributes: {
              title: "First",
              author: { data: { id: 7, attributes: { name: "Ada" } } },
            },
          },
        ],
        meta: { pagination: { total: 1 } },
      })

      expect(page.items).toEqual([
        { id: 1, title: "First", author: { id: 7, name: "Ada" } },
      ])
    })

    it("reads a single entry out of its envelope", () => {
      expect(
        dialect.readItem({ data: { id: 1, attributes: { title: "First" } } })
      ).toEqual({ id: 1, title: "First" })
    })
  })

  describe("identity", () => {
    it("addresses an entry by its documentId on v5", () => {
      expect(dialect.getId({ id: 1, documentId: "kx8f2" })).toBe("kx8f2")
    })

    it("falls back to the numeric id of v4", () => {
      expect(dialect.getId({ id: 12 })).toBe("12")
    })

    it("takes the numeric id when the application asked for it", () => {
      expect(
        strapiDialect({ identifier: "id" }).getId({ id: 12, documentId: "k" })
      ).toBe("12")
    })
  })

  describe("errors", () => {
    it("reads a validation failure field by field", () => {
      const error = dialect.normalizeError(
        {
          error: {
            status: 400,
            name: "ValidationError",
            message: "2 errors occurred",
            details: {
              errors: [
                { path: ["title"], message: "title must be defined" },
                { path: ["author", "name"], message: "name is too short" },
              ],
            },
          },
        },
        400
      )

      expect(error?.status).toBe(400)
      expect(error?.detail).toBe("2 errors occurred")
      expect(error?.violations).toEqual([
        { propertyPath: "title", message: "title must be defined" },
        { propertyPath: "author.name", message: "name is too short" },
      ])
    })
  })

  describe("relations", () => {
    it("does not take a string for an IRI worth dereferencing", () => {
      expect(dialect.referencesAreIris).toBe(false)
    })

    it("offers no CSV export, Strapi serving none", () => {
      expect(dialect.exportRequest).toBeUndefined()
    })

    it("names no realtime channel, so no hub is subscribed to", () => {
      expect(dialect.realtimeTopic).toBeUndefined()
    })
  })

  describe("flattenStrapiRecord", () => {
    it("unwraps an empty relation to nothing at all", () => {
      expect(
        flattenStrapiRecord({ id: 1, attributes: { author: { data: null } } })
      ).toEqual({ id: 1, author: null })
    })

    it("unwraps a list relation", () => {
      expect(
        flattenStrapiRecord({
          id: 1,
          attributes: {
            tags: { data: [{ id: 2, attributes: { label: "news" } }] },
          },
        })
      ).toEqual({ id: 1, tags: [{ id: 2, label: "news" }] })
    })

    it("leaves a record that is already flat alone", () => {
      expect(flattenStrapiRecord({ id: 1, title: "First" })).toEqual({
        id: 1,
        title: "First",
      })
    })
  })
})

describe("a record that holds a column of its own called data", () => {
  it("keeps it, rather than mistaking it for a relation envelope", () => {
    expect(
      flattenStrapiRecord({
        id: 1,
        attributes: { data: { rows: 3 }, title: "First" },
      })
    ).toEqual({ id: 1, data: { rows: 3 }, title: "First" })
  })
})

import { describe, expect, it } from "vitest"
import { springDialect } from "@/api/dialect/springDialect"

const dialect = springDialect()

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("the Spring Boot dialect", () => {
  describe("addressing", () => {
    it("lists a collection at its path", () => {
      const request = dialect.buildRequest({
        name: "getCollection",
        path: "api/articles",
      })

      expect(request.method).toBe("GET")
      expect(request.url.split("?")[0]).toBe("/api/articles")
    })

    it("creates on the collection, and edits with PUT by default", () => {
      const create = dialect.buildRequest({
        name: "createItem",
        path: "/api/articles",
        item: { title: "Draft" },
      })
      const update = dialect.buildRequest({
        name: "updateItem",
        path: "/api/articles",
        id: "42",
        item: {
          id: 42,
          title: "New title",
          _links: { self: { href: "http://localhost/api/articles/42" } },
        },
      })
      const remove = dialect.buildRequest({
        name: "removeItem",
        path: "/api/articles",
        id: "42",
      })

      expect(create).toEqual({
        url: "/api/articles",
        method: "POST",
        body: { title: "Draft" },
      })
      expect(update).toMatchObject({ url: "/api/articles/42", method: "PUT" })
      // Neither the key nor the HAL links go back to the server.
      expect(update.body).toEqual({ title: "New title" })
      expect(remove).toEqual({ url: "/api/articles/42", method: "DELETE" })
    })

    it("patches instead when told to", () => {
      const patching = springDialect({ updateMethod: "PATCH" })

      expect(
        patching.buildRequest({ name: "updateItem", path: "articles", id: "1" })
          .method
      ).toBe("PATCH")
    })

    it("reads the id off the self link when Spring Data REST hides it", () => {
      const record = {
        title: "Hello",
        _links: { self: { href: "http://localhost:8080/articles/7{?projection}" } },
      }

      expect(dialect.getIdentifier({ id: 3 })).toBe("3")
      expect(
        dialect.getIdentifier({
          title: "Hello",
          _links: { self: { href: "http://localhost:8080/articles/7" } },
        })
      ).toBe("7")
      expect(dialect.getId(record)).toBe("7")
    })
  })

  describe("the query a list sends", () => {
    it("counts its pages from 0, the way Spring does", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { page: 3, itemsPerPage: 10 },
      })

      expect(queryOf(url).get("page")).toBe("2")
      expect(queryOf(url).get("size")).toBe("10")
    })

    it("asks for the first page of 20 when the list names none", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
      })

      expect(queryOf(url).get("page")).toBe("0")
      expect(queryOf(url).get("size")).toBe("20")
    })

    it("sends one sort parameter per column, and plain filters", () => {
      const { url } = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: {
          order: { createdAt: "DESC", title: "asc" },
          status: ["draft", "published"],
          author: "ada",
          empty: "",
        },
      })
      const query = queryOf(url)

      expect(query.getAll("sort")).toEqual(["createdAt,desc", "title,asc"])
      expect(query.getAll("status")).toEqual(["draft", "published"])
      expect(query.get("author")).toBe("ada")
      expect(query.has("empty")).toBe(false)
    })
  })

  describe("reading what comes back", () => {
    it("reads a bare array, with no total", () => {
      expect(dialect.readCollection([{ id: 1 }])).toEqual({ items: [{ id: 1 }] })
    })

    it("reads a serialized Page", () => {
      expect(
        dialect.readCollection({
          content: [{ id: 1 }],
          totalElements: 41,
          number: 0,
          size: 20,
        })
      ).toEqual({ items: [{ id: 1 }], totalItems: 41 })
    })

    it("reads a PagedModel", () => {
      expect(
        dialect.readCollection({
          content: [{ id: 1 }],
          page: { size: 20, number: 0, totalElements: 41, totalPages: 3 },
        })
      ).toEqual({ items: [{ id: 1 }], totalItems: 41 })
    })

    it("reads Spring Data REST's HAL, whatever the relation is called", () => {
      expect(
        dialect.readCollection({
          _embedded: { blogPosts: [{ title: "Hello" }] },
          _links: {},
          page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
        })
      ).toEqual({ items: [{ title: "Hello" }], totalItems: 1 })
    })

    it("reads an empty HAL page, which has no _embedded at all", () => {
      expect(
        dialect.readCollection({ page: { totalElements: 0, number: 0, size: 20 } })
      ).toEqual({ items: [], totalItems: 0 })
    })
  })

  describe("errors", () => {
    it("reads a ProblemDetail", () => {
      expect(
        dialect.normalizeError(
          {
            type: "about:blank",
            title: "Not Found",
            status: 404,
            detail: "No article 9",
          },
          404
        )
      ).toEqual({ status: 404, title: "Not Found", detail: "No article 9" })
    })

    it("puts Bean Validation's field errors under their field", () => {
      expect(
        dialect.normalizeError(
          {
            status: 400,
            error: "Bad Request",
            errors: [{ field: "title", defaultMessage: "must not be blank" }],
          },
          400
        )
      ).toEqual({
        status: 400,
        title: "Bad Request",
        detail: undefined,
        violations: [{ propertyPath: "title", message: "must not be blank" }],
      })
    })

    it("reads Spring Data REST's validation errors", () => {
      expect(
        dialect.normalizeError(
          {
            errors: [
              { entity: "Article", property: "title", message: "must not be blank" },
            ],
          },
          400
        )?.violations
      ).toEqual([{ propertyPath: "title", message: "must not be blank" }])
    })

    it("keeps the status of a response with no body", () => {
      expect(dialect.normalizeError(undefined, 500)).toEqual({ status: 500 })
    })
  })
})

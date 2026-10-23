import { describe, expect, it } from "vitest"
import {
  drfCursorDialect,
  jsonServerDialect,
  restDialect,
} from "@/api/dialect/restDialect"

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("the configurable REST dialect", () => {
  describe("addressing and writing", () => {
    const dialect = restDialect()

    it("addresses a record at /posts/{id}", () => {
      expect(
        dialect.buildRequest({ name: "getItem", path: "posts", id: "4" })
      ).toEqual({
        url: "/posts/4",
        method: "GET",
      })
      expect(
        dialect.buildRequest({ name: "removeItem", path: "/posts/", id: "4" }).url
      ).toBe("/posts/4")
    })

    it("writes without the key that travels in the URL", () => {
      expect(
        dialect.buildRequest({
          name: "updateItem",
          path: "posts",
          id: "4",
          item: { id: 4, title: "Hi" },
        })
      ).toEqual({ url: "/posts/4", method: "PATCH", body: { title: "Hi" } })
    })
  })

  describe("the query", () => {
    it("names the page, size and sort parameters as configured", () => {
      const dialect = restDialect({
        pageParam: "p",
        sizeParam: "per",
        sortParam: "order_by",
      })
      const query = queryOf(
        dialect.buildRequest({
          name: "getCollection",
          path: "posts",
          filter: {
            page: 3,
            itemsPerPage: 10,
            order: { title: "desc", id: "asc" },
            status: "open",
            tag: ["a", "b"],
            empty: "",
          },
        }).url
      )

      expect(query.get("p")).toBe("3")
      expect(query.get("per")).toBe("10")
      expect(query.get("order_by")).toBe("-title,id")
      expect(query.get("status")).toBe("open")
      expect(query.getAll("tag")).toEqual(["a", "b"])
      expect(query.has("empty")).toBe(false)
    })

    it("sends no cursor parameter for the first page, the cursor for the next", () => {
      const dialect = restDialect({ cursorParam: "after" })
      const first = queryOf(
        dialect.buildRequest({ name: "getCollection", path: "posts", filter: {} })
          .url
      )
      const next = queryOf(
        dialect.buildRequest({
          name: "getCollection",
          path: "posts",
          filter: { page: 2, cursor: "abc" },
        }).url
      )

      expect(first.has("after")).toBe(false)
      expect(first.has("page")).toBe(false)
      expect(next.get("after")).toBe("abc")
      expect(next.has("cursor")).toBe(false)
    })
  })

  describe("json-server", () => {
    const dialect = jsonServerDialect()

    it("asks with _page, _limit, _sort and _order", () => {
      const query = queryOf(
        dialect.buildRequest({
          name: "getCollection",
          path: "/posts",
          filter: {
            page: 2,
            itemsPerPage: 5,
            order: { views: "desc", title: "asc" },
            author: "ann",
          },
        }).url
      )

      expect(query.get("_page")).toBe("2")
      expect(query.get("_limit")).toBe("5")
      expect(query.get("_sort")).toBe("views,title")
      expect(query.get("_order")).toBe("desc,asc")
      expect(query.get("author")).toBe("ann")
    })

    it("reads the total from X-Total-Count", () => {
      const page = dialect.readCollection([{ id: 1 }, { id: 2 }], {
        headers: new Headers({ "X-Total-Count": "57" }),
      })

      expect(page).toEqual({ items: [{ id: 1 }, { id: 2 }], totalItems: 57 })
    })

    it("leaves the total unknown without the header", () => {
      expect(dialect.readCollection([{ id: 1 }]).totalItems).toBeUndefined()
    })
  })

  describe("the Link header", () => {
    const dialect = restDialect({ pageParam: false, linkHeader: true })
    const link = (value: string) => ({ headers: new Headers({ Link: value }) })

    it("hands over the URL of the next page as the cursor", () => {
      const page = dialect.readCollection([{ id: 1 }], {
        ...link(
          '<https://api.test/posts?page=3>; rel="next", <https://api.test/posts?page=9>; rel="last"'
        ),
      })

      expect(page.nextCursor).toBe("https://api.test/posts?page=3")
    })

    it("says it is the last page when no link points on", () => {
      const page = dialect.readCollection([{ id: 1 }], {
        ...link('<https://api.test/posts?page=1>; rel="prev"'),
      })

      expect(page.nextCursor).toBeNull()
    })

    it("asks for the next page at the URL it was given", () => {
      expect(
        dialect.buildRequest({
          name: "getCollection",
          path: "posts",
          filter: { page: 2, cursor: "https://api.test/posts?page=2&q=a" },
        })
      ).toEqual({ url: "https://api.test/posts?page=2&q=a", method: "GET" })
    })

    it("takes the cursor out of the link when a cursor parameter is named", () => {
      const withParam = restDialect({ cursorParam: "since", linkHeader: true })
      const page = withParam.readCollection([], {
        ...link('</posts?since=xyz&limit=10>; rel="next"'),
      })

      expect(page.nextCursor).toBe("xyz")
    })
  })

  describe("DRF cursor pagination", () => {
    const dialect = drfCursorDialect()

    it("reads the rows and the cursor of the next page out of the body", () => {
      const page = dialect.readCollection({
        next: "http://api.test/articles/?cursor=cD0yMDI0&page_size=10",
        previous: null,
        results: [{ id: 1 }],
      })

      expect(page).toEqual({
        items: [{ id: 1 }],
        totalItems: undefined,
        nextCursor: "cD0yMDI0",
      })
    })

    it("knows the last page when next is null", () => {
      expect(
        dialect.readCollection({ next: null, previous: null, results: [] })
          .nextCursor
      ).toBeNull()
    })

    it("asks with cursor, page_size and ordering on a slashed route", () => {
      const request = dialect.buildRequest({
        name: "getCollection",
        path: "articles",
        filter: { cursor: "cD0y", order: { created: "desc" } },
      })

      expect(request.url.split("?")[0]).toBe("/articles/")
      const query = queryOf(request.url)
      expect(query.get("cursor")).toBe("cD0y")
      expect(query.get("page_size")).toBe("30")
      expect(query.get("ordering")).toBe("-created")
    })
  })

  it("reads a total from the body when asked to", () => {
    const dialect = restDialect({ itemsKey: "data", totalKey: "total" })

    expect(dialect.readCollection({ data: [{ id: 1 }], total: 9 })).toEqual({
      items: [{ id: 1 }],
      totalItems: 9,
    })
  })

  it("reads an error message", () => {
    expect(restDialect().normalizeError({ message: "Nope" }, 422)).toEqual({
      status: 422,
      detail: "Nope",
    })
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionList } from "react-data-form"
import { createViewResource } from "@/utils/createViewResource"
import { processViewResourceContext } from "@/utils/processViewResourceContext"
import { configureApi, resetApiConfig } from "@/api/apiConfig"
import { springDialect } from "@/api/dialect/springDialect"
import { strapiDialect } from "@/api/dialect/strapiDialect"

const requests: string[] = []

function respondWith(body: unknown) {
  return vi.fn(async (url: string) => {
    requests.push(String(url))
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch
}

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "")
}

afterEach(() => {
  resetApiConfig()
  requests.length = 0
})

describe("processViewResourceContext", () => {
  // ListPagination counts by 30 when the view declares no pageSize: the request
  // must ask for the same size, or the API pages by its own default (20 for
  // Spring, 25 for Strapi) and the last rows never show.
  it("asks Spring for 30 rows when the list declares no pageSize", async () => {
    configureApi({
      baseUrl: "https://api.example.com",
      fetch: respondWith({ content: [], totalElements: 0 }),
    })
    const articles = createViewResource("spring_default_size", {
      path: "articles",
      dialect: springDialect(),
    })

    await processViewResourceContext({
      resource: articles,
      resourceAction: ActionList.list,
      filter: { page: 2 },
    })

    expect(queryOf(requests[0]).get("size")).toBe("30")
    expect(queryOf(requests[0]).get("page")).toBe("1")
  })

  it("asks Strapi for 30 rows when the list declares no pageSize", async () => {
    configureApi({
      baseUrl: "https://cms.example.com",
      fetch: respondWith({ data: [], meta: { pagination: { total: 0 } } }),
    })
    const articles = createViewResource("strapi_default_size", {
      path: "articles",
      dialect: strapiDialect(),
    })

    await processViewResourceContext({
      resource: articles,
      resourceAction: ActionList.list,
      filter: { page: 2 },
    })

    expect(queryOf(requests[0]).get("pagination[pageSize]")).toBe("30")
    expect(queryOf(requests[0]).get("pagination[page]")).toBe("2")
  })

  it("keeps the declared pageSize over the default", async () => {
    configureApi({
      baseUrl: "https://cms.example.com",
      fetch: respondWith({ data: [], meta: { pagination: { total: 0 } } }),
    })
    const articles = createViewResource("strapi_declared_size", {
      path: "articles",
      dialect: strapiDialect(),
      views: { list: { pageSize: 10 } },
    })

    await processViewResourceContext({
      resource: articles,
      resourceAction: ActionList.list,
    })

    expect(queryOf(requests[0]).get("pagination[pageSize]")).toBe("10")
  })
})

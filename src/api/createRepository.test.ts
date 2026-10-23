import { afterEach, describe, expect, it, vi } from "vitest"
import { createRepository } from "@/api/createRepository"
import { createViewResource } from "@/utils/createViewResource"
import { configureApi, resetApiConfig } from "@/api/apiConfig"
import { strapiDialect } from "@/api/dialect/strapiDialect"

/** A fetch answering an empty Strapi list, and recording what it was asked. */
function strapiFetch() {
  return vi.fn(
    async (_url: string) =>
      new Response(
        JSON.stringify({
          data: [],
          meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
  )
}

afterEach(() => {
  resetApiConfig()
})

describe("a repository declared before configureApi", () => {
  it("sends its requests to the dialect configured afterwards", async () => {
    const repository = createRepository({ path: "articles" })
    const fetch = strapiFetch()

    configureApi({
      baseUrl: "https://cms.example.com",
      dialect: strapiDialect(),
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await repository.getCollection()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(fetch.mock.calls[0][0])).toContain(
      "https://cms.example.com/api/articles"
    )
  })

  it("does the same for a resource declared with createViewResource", async () => {
    const resource = createViewResource("articles-before-config", {
      path: "articles",
    })
    const fetch = strapiFetch()

    configureApi({
      baseUrl: "https://cms.example.com",
      dialect: strapiDialect(),
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await resource.getCollection({})

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { setInStorage } from "ssr-safe-storage"
import { createViewResource } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"

interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
}

const resource = createViewResource<Article>("edit_once_articles", {
  name: "Articles",
  storage: "local",
  form: { inputs: { title: { label: "Title" } } },
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe.each(["update", "read"] as const)("the %s view", (resourceAction) => {
  it("loads the record once", async () => {
    setInStorage("edit_once_articles", {
      "@id": "edit_once_articles",
      "@type": "Collection",
      member: [
        { "@id": "/api/articles/1", "@type": "Article", id: "1", title: "First" },
      ],
      totalItems: 1,
    })
    const getItem = vi.spyOn(resource, "getItem")

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          resourceId: "edit_once_articles",
          resourceAction,
          id: "1",
          scope: "demo",
        }}
        configuration={{ resources: [resource], defaultScope: "demo" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("First")).toBeInTheDocument()
    })
    expect(getItem).toHaveBeenCalledTimes(1)
  })
})

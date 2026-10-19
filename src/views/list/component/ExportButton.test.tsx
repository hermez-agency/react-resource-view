import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { ActionList } from "react-data-form"

interface Article {
  "@id": string
  id: string
  title: string
}

const ALL: Article[] = Array.from({ length: 3 }, (_, i) => ({
  "@id": `/api/articles/${i + 1}`,
  id: String(i + 1),
  title: i === 0 ? 'Hello, "world"' : `Article ${i + 1}`,
}))

const getCollection = vi.fn(async (params?: Record<string, any>) => {
  const page = params?.page ?? 1
  return {
    data: {
      "@id": "export_articles",
      member: ALL.slice((page - 1) * 2, page * 2),
      totalItems: ALL.length,
    } as any,
  }
})

const resource = createViewResource<Article>("export_articles", {
  name: "Articles",
  storage: "local",
  repository: { getCollection },
  form: { inputs: { title: { label: "Title" } } },
  views: { list: { layouts: [layout.table()] } },
})

afterEach(() => vi.restoreAllMocks())

describe("the export button", () => {
  it("offers CSV and JSON, and exports every page", async () => {
    const blobs: Blob[] = []
    window.URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return "blob:export"
    })
    window.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "export",
          resourceId: "export_articles",
          resourceAction: ActionList.list,
        }}
        configuration={{ resources: [resource], defaultScope: "export" }}
      />
    )

    await userEvent.click(await screen.findByRole("button", { name: "Exporter" }))
    expect(await screen.findByRole("button", { name: "JSON" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "CSV" }))

    await waitFor(() => expect(blobs).toHaveLength(1))
    // `Blob.text()` decodes as UTF-8 and so drops the byte order mark.
    expect(await blobs[0].text()).toBe(
      'Title\r\n"Hello, ""world"""\r\nArticle 2\r\nArticle 3\r\n'
    )
  })
})

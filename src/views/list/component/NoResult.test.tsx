import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { Coffee } from "lucide-react"
import { createViewResource } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { ResourceDefinition } from "@/ResourceDefinition"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
}

let counter = 0

function renderEmptyList(definition: Partial<ResourceDefinition<Article>> = {}) {
  const id = `no_result_${++counter}`
  const getCollection = vi.fn(async () => ({
    data: {
      "@id": "/api/articles",
      "@type": "Collection",
      member: [],
      totalItems: 0,
    },
  })) as any
  const articles = createViewResource<Article>(id, {
    name: "Articles",
    icon: Coffee,
    storage: "local",
    repository: { getCollection },
    form: { inputs: { title: { label: "Title" } } },
    ...definition,
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [articles], defaultScope: id }}
    />
  )

  return { getCollection }
}

/** The card the empty state is drawn in, apart from the header's own buttons. */
const emptyCard = () => screen.getByRole("heading", { level: 3 }).parentElement!

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

describe("an empty list without filter", () => {
  it("says there is nothing yet, under the resource's name, and offers to create", async () => {
    renderEmptyList()

    expect(await screen.findByText("No Articles yet")).toBeInTheDocument()
    expect(screen.getByText("Nothing has been added yet.")).toBeInTheDocument()
    expect(screen.queryByText("Nothing matched", { exact: false })).toBeNull()
    expect(screen.queryByRole("button", { name: "Clear the filters" })).toBeNull()
    expect(
      within(emptyCard()).getByRole("link", { name: /create/i })
    ).toBeInTheDocument()
  })

  it("draws the declared icon, title and body", async () => {
    renderEmptyList({
      views: {
        list: { empty: { title: "No article", body: "Write the first one." } },
      },
    })

    expect(await screen.findByText("No article")).toBeInTheDocument()
    expect(screen.getByText("Write the first one.")).toBeInTheDocument()
  })

  it("offers no create button when create is not allowed", async () => {
    renderEmptyList({ permissions: { create: false } })

    expect(await screen.findByText("No Articles yet")).toBeInTheDocument()
    expect(within(emptyCard()).queryByRole("link", { name: /create/i })).toBeNull()
  })
})

describe("an empty list with a filter", () => {
  it("says nothing matched, and clears the filters on request", async () => {
    renderEmptyList({
      views: {
        list: {
          filters: { inputs: { title: { label: "Search" } } },
          empty: { filteredTitle: "Nothing for this search" },
        },
      },
    })

    fireEvent.change(await screen.findByLabelText("Search"), {
      target: { value: "zzz" },
    })
    expect(await screen.findByText("Nothing for this search")).toBeInTheDocument()
    expect(screen.queryByText("No Articles yet")).toBeNull()
    expect(
      screen.getByText(
        "Nothing matched your search. Try different criteria, or come back later."
      )
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear the filters" }))

    expect(await screen.findByText("No Articles yet")).toBeInTheDocument()
  })
})

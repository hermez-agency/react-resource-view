import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { createResourceCollection } from "@/api/collectionShape"
import { ActionList } from "react-data-form"

/**
 * A selection belongs to the page and the filter it was made on: a reader who
 * pages away or filters has left it, and must not find it back — nor run a
 * bulk action on it — on return.
 */
const PAGE_SIZE = 10
const ROWS = 15

let counter = 0

function renderList() {
  const id = `selection_scope_${++counter}`
  const all = Array.from({ length: ROWS }, (_, i) => ({
    "@id": `/api/items/${i}`,
    id: i,
    title: `Item ${i}`,
  }))
  const getCollection = vi.fn(async (query?: { page?: number; title?: string }) => {
    const page = Number(query?.page ?? 1)
    const matching = all.filter((item) =>
      query?.title ? item.title.includes(query.title) : true
    )
    return {
      data: createResourceCollection({
        id: "/api/items",
        items: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      }) as any,
    }
  })
  const items = createViewResource<any>(id, {
    name: "Items",
    form: { inputs: { title: { label: "Title" } } },
    storage: "local",
    repository: { getCollection },
    views: {
      list: {
        pageSize: PAGE_SIZE,
        layouts: [layout.table()],
        bulkActions: ["delete"],
        filters: { inputs: { title: { label: "Search" } } },
      },
    },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceAction: ActionList.list,
        resourceId: id,
      }}
      configuration={{ resources: [items], defaultScope: id }}
    />
  )

  return { getCollection }
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

describe("the selection of a list", () => {
  it("is emptied by a change of page, and does not come back with page 1", async () => {
    const { getCollection } = renderList()

    await screen.findByText("Item 0")
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select" })[0])
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")

    const [pagination] = screen.getAllByRole("navigation", { name: "Pagination" })
    fireEvent.click(within(pagination).getByRole("button", { name: /next/i }))
    await waitFor(() =>
      expect(getCollection.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 })
    )
    await screen.findByText("Item 10")
    expect(screen.queryByRole("toolbar")).toBeNull()

    fireEvent.click(within(pagination).getByRole("button", { name: /previous/i }))
    await screen.findByText("Item 0")
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("is emptied by a change of filter, and does not come back with it", async () => {
    renderList()

    await screen.findByText("Item 0")
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select" })[0])
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")

    const search = screen.getByRole("textbox", { name: "Search" })
    fireEvent.change(search, { target: { value: "Item 1" } })
    await waitFor(() => expect(screen.queryByText("Item 0")).toBeNull())
    expect(screen.queryByRole("toolbar")).toBeNull()

    fireEvent.change(search, { target: { value: "" } })
    await screen.findByText("Item 0")
    expect(screen.queryByRole("toolbar")).toBeNull()
  })
})

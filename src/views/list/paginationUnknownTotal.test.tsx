import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createViewResource } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { createResourceCollection } from "@/api/collectionShape"
import { ActionList } from "react-data-form"

/**
 * An API that sends a bare array (FastAPI, Spring, Django) or a cursor says
 * nothing of the total: the list used to take the rows on screen for all of
 * them, hide its pagination and leave the rows past the first page out of reach.
 */
const PAGE_SIZE = 10
const ROWS = 15

let counter = 0

function renderList() {
  const id = `unknown_total_${++counter}`
  const all = Array.from({ length: ROWS }, (_, i) => ({
    "@id": `/api/items/${i}`,
    id: i,
    title: `Item ${i}`,
  }))
  const getCollection = vi.fn(async (query?: { page?: number }) => {
    const page = Number(query?.page ?? 1)
    return {
      data: createResourceCollection({
        id: "/api/items",
        items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      }) as any,
    }
  })
  const items = createViewResource<any>(id, {
    name: "Items",
    form: { inputs: { title: { label: "Title" } } },
    storage: "local",
    repository: { getCollection },
    views: { list: { pageSize: PAGE_SIZE } },
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

describe("the pagination of a list whose total is unknown", () => {
  it("offers Previous and Next, Next enabled while the page is full", async () => {
    const { getCollection } = renderList()

    // The table shows its pagination above and below the rows.
    const [pagination] = await screen.findAllByRole("navigation", {
      name: "Pagination",
    })
    const previous = () =>
      within(pagination).getByRole("button", { name: /previous/i })
    const next = () => within(pagination).getByRole("button", { name: /next/i })

    expect(previous().hasAttribute("disabled")).toBe(true)
    expect(next().hasAttribute("disabled")).toBe(false)

    fireEvent.click(next())

    await waitFor(() => {
      expect(getCollection.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 })
    })
    await waitFor(() => {
      expect(next().hasAttribute("disabled")).toBe(true)
    })
    expect(previous().hasAttribute("disabled")).toBe(false)
  })
})

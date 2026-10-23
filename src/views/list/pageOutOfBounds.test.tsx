import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { ListComponentPropsInterface } from "@/ViewResource"
import { ActionList } from "react-data-form"

/**
 * A page beyond the last one — a link to `page: 50`, the last row of the last
 * page deleted — goes back to the last page that exists.
 */
const TOTAL = 100
const PAGE_SIZE = 10

let counter = 0

function Rows({ rows = [] }: ListComponentPropsInterface) {
  return <div data-testid="rows">{rows.length}</div>
}

function renderList(total: () => number) {
  const id = `out_of_bounds_${++counter}`
  const getCollection = vi.fn(async (query?: { page?: number }) => {
    const page = Number(query?.page ?? 1)
    const count = Math.max(0, Math.min(PAGE_SIZE, total() - (page - 1) * PAGE_SIZE))
    return {
      data: {
        "@id": "/api/items",
        "@type": "Collection",
        member: Array.from({ length: count }, (_, i) => ({
          "@id": `/api/items/${page}-${i}`,
          "@type": "Item",
          id: `${page}-${i}`,
        })),
        totalItems: total(),
      } as any,
    }
  })
  const items = createViewResource<{ "@id": string; id: string }>(id, {
    name: "Items",
    storage: "local",
    repository: { getCollection },
    views: {
      list: {
        pageSize: PAGE_SIZE,
        layouts: [layout.table({ components: { list: Rows } })],
      },
    },
  })

  const view = (
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [items], defaultScope: id }}
    />
  )

  return { ...render(view), getCollection }
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

describe("a page out of bounds", () => {
  it("goes back to the last page when a link asks for one beyond it", async () => {
    window.history.replaceState(null, "", '/?filter={"page":50}')
    const { getCollection } = renderList(() => TOTAL)

    await waitFor(() => {
      expect(getCollection.mock.calls.at(-1)?.[0]).toMatchObject({ page: 10 })
    })
    expect(await screen.findByTestId("rows")).toHaveTextContent("10")
  })

  // What a deletion leaves behind: the page the user was on, one past the end.
  it("goes back to the previous page when the last row of the last page is gone", async () => {
    window.history.replaceState(null, "", '/?filter={"page":11}')
    const { getCollection } = renderList(() => 100)
    await waitFor(() => {
      expect(getCollection.mock.calls.at(-1)?.[0]).toMatchObject({ page: 10 })
    })
    expect(await screen.findByTestId("rows")).toHaveTextContent("10")
  })
})

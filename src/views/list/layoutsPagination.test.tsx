import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { RowComponentPropsInterface } from "@/ViewResource"
import { ActionList } from "react-data-form"

/**
 * Board, calendar, timeline and split got the current page and nothing to reach
 * the others: with 100 records and a page size of 10, the 11th never showed up.
 */
const TOTAL = 100
const PAGE_SIZE = 10

function Row({ row }: RowComponentPropsInterface) {
  return <span>{row?.data?.title}</span>
}

const layouts = {
  board: () =>
    layout.board({
      groupBy: "status",
      columns: [{ value: "todo", label: "To do" }],
      components: { row: Row },
    }),
  calendar: () => layout.calendar({ dateField: "dueDate" }),
  timeline: () => layout.timeline({ startField: "dueDate" } as any),
  split: () => layout.split({ components: { row: Row } }),
}

let counter = 0

function renderList(name: keyof typeof layouts) {
  const id = `layout_pagination_${++counter}`
  const getCollection = vi.fn(async (query?: { page?: number }) => {
    const page = Number(query?.page ?? 1)
    return {
      data: {
        "@id": "/api/items",
        "@type": "Collection",
        member: Array.from({ length: PAGE_SIZE }, (_, i) => ({
          "@id": `/api/items/${page}-${i}`,
          "@type": "Item",
          id: `${page}-${i}`,
          title: `Item ${page}-${i}`,
          status: "todo",
          dueDate: new Date().toISOString(),
        })),
        totalItems: TOTAL,
      } as any,
    }
  })
  const items = createViewResource<any>(id, {
    name: "Items",
    storage: "local",
    repository: { getCollection },
    views: { list: { pageSize: PAGE_SIZE, layouts: [layouts[name]()] } },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [items], defaultScope: id }}
    />
  )

  return { getCollection }
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

describe.each(Object.keys(layouts) as (keyof typeof layouts)[])(
  "the %s layout with more records than a page",
  (name) => {
    it("offers a pagination, which loads the next page", async () => {
      const { getCollection } = renderList(name)

      const pagination = await screen.findByRole("navigation", {
        name: "Pagination",
      })
      fireEvent.click(
        Array.from(pagination.querySelectorAll("button")).find(
          (button) => button.textContent === "2"
        )!
      )

      await waitFor(() => {
        expect(getCollection.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 })
      })
    })
  }
)

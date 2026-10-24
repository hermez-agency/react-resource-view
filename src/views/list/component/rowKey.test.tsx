import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { useState } from "react"

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))

vi.mock("@/views/list/component/DefaultRowComponent", () => ({
  DefaultRowComponent: ({ row }: { row: { data: { title?: string } } }) => {
    const [typed] = useState(() => row.data.title)
    return <div data-testid="row" data-typed={typed} />
  },
}))

vi.mock("@/action/ListResourceViewButton", () => ({
  default: () => null,
}))

const { ListItem } = await import("@/views/list/component/item/ListItem")
const { rowKey } = await import("@/views/list/component/rowKey")

describe("rowKey", () => {
  it("is built from the record's identity, not from its values", () => {
    const before = rowKey({ data: { "@id": "/a/1", title: "A" } }, 0)
    const after = rowKey({ data: { "@id": "/a/1", title: "B" } }, 3)

    expect(after).toBe(before)
  })

  it("falls back to a draft key for a record the API has not created yet", () => {
    expect(rowKey({ data: { title: "A" }, pending: "create" }, 0)).toBe("draft-0")
  })
})

describe("stable row keys", () => {
  it("keeps the DOM node of a row whose values change", () => {
    const { getAllByTestId, rerender } = render(
      <ListItem rows={[{ data: { "@id": "/a/1", title: "A" } }]} />
    )
    const node = getAllByTestId("row")[0]

    rerender(
      <ListItem
        rows={[{ data: { "@id": "/a/1", title: "B" }, pending: "update" }]}
      />
    )

    expect(getAllByTestId("row")[0]).toBe(node)
  })

  it("keeps the local state of a row when a draft is inserted before it", () => {
    const { getAllByTestId, rerender } = render(
      <ListItem rows={[{ data: { "@id": "/a/1", title: "A" } }]} />
    )

    rerender(
      <ListItem
        rows={[
          { data: { title: "New" }, pending: "create" },
          { data: { "@id": "/a/1", title: "A" } },
        ]}
      />
    )

    expect(getAllByTestId("row")[1]).toHaveAttribute("data-typed", "A")
  })
})

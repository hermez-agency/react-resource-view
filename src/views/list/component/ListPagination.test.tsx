import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

const updateFilter = vi.fn()
let currentPage = 1

vi.mock("@/views/list/provider/useListViewContext", () => ({
  useListViewContext: () => ({
    originalData: {},
    filterContext: { filter: { page: currentPage }, updateFilter },
  }),
}))

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ view: { pageSize: 10, components: {} }, resource: {} }),
}))

vi.mock("@/api/collection", () => ({
  getCollectionTotal: () => 100,
  getCollectionItems: () => [],
}))

const { default: ListPagination } =
  await import("@/views/list/component/ListPagination")

describe("ListPagination", () => {
  beforeEach(() => {
    updateFilter.mockClear()
  })

  it("draws the ellipses as inert, hidden spans, not as page buttons", () => {
    currentPage = 5
    const { container } = render(<ListPagination />)

    const ellipses = [...container.querySelectorAll("span")].filter((span) =>
      span.textContent?.startsWith("...")
    )
    expect(ellipses).toHaveLength(2)
    for (const ellipsis of ellipses) {
      expect(ellipsis).toHaveAttribute("aria-hidden", "true")
    }
    expect(screen.queryByRole("button", { name: /\.\.\./ })).toBeNull()
  })

  it("only ever asks for a numeric page", () => {
    currentPage = 5
    render(<ListPagination />)

    for (const button of screen.getAllByRole("button")) {
      fireEvent.click(button)
    }

    expect(updateFilter).toHaveBeenCalled()
    for (const [filter] of updateFilter.mock.calls) {
      expect(typeof filter.page).toBe("number")
    }
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { setTranslation } from "react-mini-i18n"

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

  afterEach(() => {
    setTranslation({})
  })

  it("writes the range in English, through the dictionary, when nothing translates it", () => {
    currentPage = 6
    render(<ListPagination />)

    expect(screen.getByText("51–60 of 100")).toBeInTheDocument()
    expect(screen.queryByText(/Showing|sur/)).toBeNull()
  })

  it("hands the range to the dictionary under one key with variables", () => {
    currentPage = 6
    setTranslation({
      "{{start}}–{{end}} of {{total}}": "{{start}}–{{end}} sur {{total}}",
    })
    render(<ListPagination />)

    expect(screen.getByText("51–60 sur 100")).toBeInTheDocument()
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

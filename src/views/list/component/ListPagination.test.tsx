import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { setTranslation } from "react-mini-i18n"

const updateFilter = vi.fn()
let currentPage = 1
let total: number | undefined = 100
let rowCount = 0

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
  getCollectionTotal: () => total,
  getCollectionItems: () => Array.from({ length: rowCount }),
}))

const { default: ListPagination } =
  await import("@/views/list/component/ListPagination")

describe("ListPagination", () => {
  beforeEach(() => {
    updateFilter.mockClear()
    total = 100
    rowCount = 0
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

  it("disables Previous on the first page, and Next on the last", () => {
    currentPage = 1
    const { unmount } = render(<ListPagination />)
    for (const name of ["previous", "next"]) {
      for (const button of screen.getAllByRole("button", { name })) {
        expect(button).toHaveProperty("disabled", name === "previous")
      }
    }
    unmount()

    currentPage = 10
    render(<ListPagination />)
    for (const name of ["previous", "next"]) {
      for (const button of screen.getAllByRole("button", { name })) {
        expect(button).toHaveProperty("disabled", name === "next")
      }
    }
    expect(screen.getByText("91–100 of 100")).toBeInTheDocument()
  })

  it("lists every page, without ellipses, when there are only a few", () => {
    total = 40
    currentPage = 2
    const { container } = render(<ListPagination />)

    for (const page of ["1", "2", "3", "4"]) {
      expect(screen.getByRole("button", { name: page })).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(container).not.toHaveTextContent("...")
  })

  it("draws nothing for a single page", () => {
    total = 10
    currentPage = 1
    const { container } = render(<ListPagination />)

    expect(container).toBeEmptyDOMElement()
  })

  describe("without a total from the API", () => {
    beforeEach(() => {
      total = undefined
    })

    it("offers Previous / Next and no page count, while the page comes back full", () => {
      currentPage = 3
      rowCount = 10
      render(<ListPagination />)

      expect(screen.getByRole("button", { name: "previous" })).toBeEnabled()
      fireEvent.click(screen.getByRole("button", { name: "next" }))
      expect(updateFilter).toHaveBeenCalledWith({ page: 4 })
      expect(screen.queryByRole("button", { name: "1" })).toBeNull()
      expect(screen.queryByText(/ of /)).toBeNull()
    })

    it("disables Next on a page that comes back short", () => {
      currentPage = 3
      rowCount = 4
      render(<ListPagination />)

      expect(screen.getByRole("button", { name: "next" })).toBeDisabled()
      fireEvent.click(screen.getByRole("button", { name: "previous" }))
      expect(updateFilter).toHaveBeenCalledWith({ page: 2 })
    })

    it("draws nothing for a first page that comes back short", () => {
      currentPage = 1
      rowCount = 4
      const { container } = render(<ListPagination />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))

const layoutOptions: Record<string, unknown> = {}

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ layout: { options: layoutOptions }, view: {} }),
}))

vi.mock("@/views/list/provider/useListViewContext", () => ({
  useListViewContext: () => ({ originalData: { totalItems: 10 } }),
}))

const { ListChart } = await import("@/views/list/component/chart/ListChart")

const rows = [
  { data: { "@id": "/o/1", status: "paid", total: 120 } },
  { data: { "@id": "/o/2", status: "paid", total: 80 } },
  { data: { "@id": "/o/3", status: "refunded", total: 40 } },
]

describe("ListChart", () => {
  it("draws a bar per group, labelled with its figure", () => {
    layoutOptions.groupBy = "status"
    render(<ListChart rows={rows} />)

    expect(screen.getByText("paid").closest("li")).toHaveTextContent("paid2")
    expect(screen.getByText("refunded").closest("li")).toHaveTextContent("refunded1")
  })

  it("adds a total and an average of the value field", () => {
    Object.assign(layoutOptions, {
      groupBy: "status",
      valueField: "total",
      valueLabel: "revenue",
      format: (n: number) => `${n} €`,
    })
    render(<ListChart rows={rows} />)
    for (const key of ["valueField", "valueLabel", "format"])
      delete layoutOptions[key]

    expect(screen.getAllByText("Total revenue").length).toBeGreaterThan(0)
    expect(screen.getByText("240 €")).toBeInTheDocument()
    expect(screen.getByText("80 €", { selector: "div" })).toBeInTheDocument()
  })

  it("says the figures are the page's when the API holds more", () => {
    render(<ListChart rows={rows} />)

    expect(
      screen.getByText("Figures over the 3 records of this page, out of 10")
    ).toBeInTheDocument()
  })
})

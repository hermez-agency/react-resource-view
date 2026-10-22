import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))

vi.mock("@/action/ListResourceViewButton", () => ({
  default: () => <div data-testid="actions" />,
}))

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ layout: { options: { parentField: "parent" } }, view: {} }),
}))

const { ListTree } = await import("@/views/list/component/tree/ListTree")

const rows = [
  { data: { "@id": "/api/teams/1", name: "Engineering" } },
  { data: { "@id": "/api/teams/2", name: "Frontend", parent: "/api/teams/1" } },
  { data: { "@id": "/api/teams/3", name: "Backend", parent: "/api/teams/1" } },
  { data: { "@id": "/api/teams/4", name: "Sales" } },
]

describe("ListTree", () => {
  it("draws each record under its parent, a level deeper", () => {
    render(<ListTree rows={rows} />)

    expect(screen.getByRole("tree")).toBeInTheDocument()
    expect(screen.getByRole("treeitem", { name: "Frontend" })).toHaveAttribute(
      "aria-level",
      "2"
    )
    expect(screen.getByRole("treeitem", { name: "Engineering" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    // Every record keeps the actions a table row has.
    expect(screen.getAllByTestId("actions")).toHaveLength(4)
  })

  it("folds a branch, and unfolds everything again", () => {
    render(<ListTree rows={rows} />)

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }))
    expect(screen.queryByRole("treeitem", { name: "Frontend" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))
    expect(screen.getByRole("treeitem", { name: "Frontend" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    expect(screen.queryByRole("treeitem", { name: "Backend" })).toBeNull()
    expect(screen.getByRole("treeitem", { name: "Sales" })).toBeInTheDocument()
  })

  it("says so when there is nothing to arrange", () => {
    render(<ListTree rows={[]} />)

    expect(screen.getByText("No data yet")).toBeInTheDocument()
    expect(screen.queryByRole("tree")).toBeNull()
  })
})

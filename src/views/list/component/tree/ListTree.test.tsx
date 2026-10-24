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

    const engineering = screen.getByText("Engineering").closest("li")!
    const frontend = screen.getByText("Frontend").closest("li")!
    expect(engineering).toContainElement(frontend)
    expect(frontend.parentElement).not.toBe(engineering.parentElement)
    expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    // A list that announces itself, not a tree that does not behave like one.
    expect(screen.queryByRole("tree")).toBeNull()
    expect(screen.queryByRole("treeitem")).toBeNull()
    // Every record keeps the actions a table row has.
    expect(screen.getAllByTestId("actions")).toHaveLength(4)
  })

  it("folds a branch, and unfolds everything again", () => {
    render(<ListTree rows={rows} />)

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }))
    expect(screen.queryByText("Frontend")).toBeNull()
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute(
      "aria-expanded",
      "false"
    )

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))
    expect(screen.getByText("Frontend")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    expect(screen.queryByText("Backend")).toBeNull()
    expect(screen.getByText("Sales")).toBeInTheDocument()
  })

  it("offers no action on a record still being created, as a table row does", () => {
    render(
      <ListTree
        rows={[
          { data: { "@id": "/api/teams/1", name: "Engineering" } },
          { data: { name: "Brouillon" }, pending: "create" },
        ]}
      />
    )

    expect(screen.getAllByTestId("actions")).toHaveLength(1)
  })

  it("says so when there is nothing to arrange", () => {
    render(<ListTree rows={[]} />)

    expect(screen.getByText("No data yet")).toBeInTheDocument()
    expect(screen.queryByRole("tree")).toBeNull()
  })
})

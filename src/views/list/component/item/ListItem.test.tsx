import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))

vi.mock("@/views/list/component/DefaultRowComponent", () => ({
  DefaultRowComponent: () => <div data-testid="row" />,
}))

vi.mock("@/action/ListResourceViewButton", () => ({
  default: () => <div data-testid="actions" />,
}))

const { ListItem } = await import("@/views/list/component/item/ListItem")

describe("ListItem", () => {
  it("sets no fixed height and caps the viewport height", () => {
    const { container } = render(<ListItem rows={[{ data: { "@id": "/a/1" } }]} />)

    const root = container.querySelector('[data-slot="scroll-area"]')!
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!

    // Une hauteur fixe réservait 300px même pour un seul item, ce qui
    // repoussait le bouton « Continuer » hors de l'écran sur mobile.
    expect(root.className).not.toMatch(/(^|\s)h-\[/)
    expect(viewport).toHaveClass("max-h-[26rem]")
  })

  it("gives every record an action group, as a table row has", () => {
    const { getAllByTestId } = render(
      <ListItem rows={[{ data: { "@id": "/a/1" } }, { data: { "@id": "/a/2" } }]} />
    )

    expect(getAllByTestId("actions")).toHaveLength(2)
  })

  it("offers no action on a record still being created, as a table row does", () => {
    const { getAllByTestId } = render(
      <ListItem
        rows={[
          { data: { "@id": "/a/1" } },
          { data: { name: "Brouillon" }, pending: "create" },
        ]}
      />
    )

    expect(getAllByTestId("actions")).toHaveLength(1)
  })

  it("says so when there is nothing to list, rather than drawing an empty frame", () => {
    const { container, getByText } = render(<ListItem rows={[]} />)

    expect(getByText("No data yet")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeNull()
  })
})

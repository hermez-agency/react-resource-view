import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))

const layoutOptions: Record<string, unknown> = {}

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ layout: { options: layoutOptions }, view: {} }),
}))

const { ListMap } = await import("@/views/list/component/map/ListMap")

const rows = [
  {
    data: {
      "@id": "/api/shops/1",
      name: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
    },
  },
  {
    data: {
      "@id": "/api/shops/2",
      name: "Lyon",
      latitude: "45.764",
      longitude: "4.8357",
    },
  },
  { data: { "@id": "/api/shops/3", name: "Nowhere" } },
]

describe("ListMap", () => {
  it("puts a marker on every record with a position", () => {
    render(<ListMap rows={rows} />)

    expect(screen.getByRole("button", { name: "Paris" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Lyon" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nowhere" })).toBeNull()
    // …and says how many it could not place, rather than dropping them quietly.
    expect(
      screen.getByText("1 records have no position and are not on the map")
    ).toBeInTheDocument()
  })

  it("draws the tiles of the server it is given, and credits it", () => {
    layoutOptions.tileUrl = "https://tiles.example/{z}/{x}/{y}.png"
    layoutOptions.attribution = "© Example"
    const { container } = render(<ListMap rows={rows} />)
    delete layoutOptions.tileUrl
    delete layoutOptions.attribution

    const tiles = container.querySelectorAll("img")
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles[0].getAttribute("src")).toMatch(/^https:\/\/tiles\.example\//)
    expect(screen.getByText("© Example")).toBeInTheDocument()
  })

  it("reads positions through getPosition when the resource declares it", () => {
    layoutOptions.getPosition = (item: { location?: [number, number] }) =>
      item.location ? { lng: item.location[0], lat: item.location[1] } : undefined
    render(
      <ListMap
        rows={[{ data: { "@id": "/a/1", name: "Here", location: [2.35, 48.85] } }]}
      />
    )
    delete layoutOptions.getPosition

    expect(screen.getByRole("button", { name: "Here" })).toBeInTheDocument()
  })
})

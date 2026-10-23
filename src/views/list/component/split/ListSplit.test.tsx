import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { configurePorts, getPorts } from "@/ports"

const layoutOptions: Record<string, unknown> = {}
const current = vi.hoisted(() => ({
  value: { resource: { "@id": "/split_a", views: {} }, id: "1" } as Record<
    string,
    any
  >,
}))

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => current.value,
}))
vi.mock("@/layout/useLayout", () => ({
  useLayout: () => ({ options: layoutOptions }),
}))
vi.mock("@/provider/ViewResourceContextProvider", () => ({
  default: ({ id }: { id: string }) => <div>detail {id}</div>,
}))
vi.mock("@/views/list/component/ListPagination", () => ({ default: () => null }))

const { default: ListSplit } = await import("@/views/list/component/split/ListSplit")

const navigate = vi.fn()
const originalNavigation = getPorts().navigation

describe("ListSplit", () => {
  beforeEach(() => {
    navigate.mockReset()
    current.value = { resource: { "@id": "/split_a", views: {} }, id: "1" }
    configurePorts({
      navigation: { ...originalNavigation, useNavigate: () => navigate },
    })
  })

  afterEach(() => {
    configurePorts({ navigation: originalNavigation })
  })

  it("closes the detail on « Back to the list », without waiting for the router", async () => {
    render(<ListSplit rows={[]} />)
    expect(screen.getByText("detail 1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Back to the list/ }))

    expect(navigate).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText("detail 1")).not.toBeInTheDocument()
    })
  })

  it("follows the id of the URL, as the browser's Back button changes it", () => {
    const { rerender } = render(<ListSplit rows={[]} />)

    current.value = { ...current.value, id: undefined }
    rerender(<ListSplit rows={[]} />)
    expect(screen.queryByText("detail 1")).not.toBeInTheDocument()

    current.value = { ...current.value, id: "2" }
    rerender(<ListSplit rows={[]} />)
    expect(screen.getByText("detail 2")).toBeInTheDocument()
  })
})

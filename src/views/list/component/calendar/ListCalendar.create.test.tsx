import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { configurePorts, getPorts } from "@/ports"
import { decodeQuery } from "@/internal/url/urlEncoder"

const layoutOptions: Record<string, unknown> = { dateField: "dueDate" }
const resource = vi.hoisted(() => ({
  current: { "@id": "/cal_a", views: {} } as Record<string, any>,
}))

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({
    layout: { options: layoutOptions },
    view: {},
    resource: resource.current,
  }),
}))
vi.mock("@/layout/useLayout", () => ({
  useLayout: () => ({ options: layoutOptions }),
}))
vi.mock("@/utils/permissionResource", () => ({ usePermission: () => true }))

const { ListCalendar } = await import("@/views/list/component/calendar/ListCalendar")

const navigate = vi.fn()
const originalNavigation = getPorts().navigation

describe("ListCalendar creation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 15, 12))
    navigate.mockClear()
    resource.current = { "@id": "/cal_a", views: {} }
    configurePorts({
      navigation: { ...originalNavigation, useNavigate: () => navigate },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    configurePorts({ navigation: originalNavigation })
  })

  const clickDay = () => {
    render(<ListCalendar rows={[]} />)
    fireEvent.click(
      screen.getByText("20", { selector: "span" }).closest("div")!.parentElement!
    )
  }

  it("opens the creation straight away, with the day and without an id", () => {
    clickDay()

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(navigate).toHaveBeenCalledTimes(1)
    const to: string = navigate.mock.calls[0][0].to
    const [path, query] = to.split("?")
    expect(path).toBe("/public/cal_a/create")
    const defaultData = decodeQuery(query.replace("defaultData=", ""))
    expect(new Date(defaultData!.dueDate).getDate()).toBe(20)
  })

  it("writes the creation under the list when it opens in a dialog", () => {
    resource.current = {
      "@id": "/cal_a",
      views: { create: { open: { placement: "dialog" } } },
    }
    clickDay()

    const to: string = navigate.mock.calls[0][0].to
    expect(to).toContain("/cal_a")
    expect(to).toContain("create")
    expect(to).not.toMatch(/create\/cal_a/)
  })
})

describe("ListCalendar keyboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 15, 12))
    navigate.mockClear()
    resource.current = { "@id": "/cal_a", views: {} }
    configurePorts({
      navigation: { ...originalNavigation, useNavigate: () => navigate },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    configurePorts({ navigation: originalNavigation })
  })

  it("creates from a month cell with Enter and Space", () => {
    render(<ListCalendar rows={[]} />)
    const cell = screen.getByRole("button", { name: /Tuesday 20 October/ })

    expect(cell).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(cell, { key: "Enter" })
    fireEvent.keyDown(cell, { key: " " })
    fireEvent.keyDown(cell, { key: "a" })

    expect(navigate).toHaveBeenCalledTimes(2)
  })

  it("names the Day, Week and Month tabs without relying on the sm breakpoint", () => {
    render(<ListCalendar rows={[]} />)

    for (const name of ["Day", "Week", "Month"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument()
    }
  })
})

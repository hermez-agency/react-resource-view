import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"

const layoutOptions: Record<string, unknown> = {}

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ layout: { options: layoutOptions }, view: {}, resource: {} }),
}))
vi.mock("@/layout/useLayout", () => ({
  useLayout: () => ({ options: layoutOptions }),
}))
vi.mock("@/utils/permissionResource", () => ({ usePermission: () => false }))

const { ListCalendar } = await import("@/views/list/component/calendar/ListCalendar")

const rows = [
  { data: { "@id": "/api/tasks/1", title: "Release", dueDate: "2026-10-23" } },
  {
    data: {
      "@id": "/api/tasks/2",
      title: "Meeting",
      dueDate: "2026-10-23T10:30:00",
    },
  },
]

describe.each(["Europe/Paris", "America/New_York"])("ListCalendar in %s", (zone) => {
  const initialZone = process.env.TZ

  beforeEach(() => {
    process.env.TZ = zone
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 15, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    if (initialZone === undefined) delete process.env.TZ
    else process.env.TZ = initialZone
  })

  it("puts a date without a time on its own day", () => {
    render(<ListCalendar rows={rows} />)

    const day = screen.getByText("23", { selector: "span" }).closest("div")!
    const cell = day.parentElement!
    expect(within(cell).getByText("Release")).toBeInTheDocument()
  })

  it("shows no time for a date without a time, and one for a timestamp", () => {
    render(<ListCalendar rows={rows} />)

    const release = screen.getByText("Release").parentElement!
    const meeting = screen.getByText("Meeting").parentElement!
    expect(release).not.toHaveTextContent(/\d\d:\d\d/)
    expect(meeting).toHaveTextContent("10:30")
  })
})

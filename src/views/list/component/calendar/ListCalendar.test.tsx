import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { enUS, fr } from "date-fns/locale"
import { configurePorts } from "@/ports"

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

describe.each([
  [
    "en-US",
    enUS,
    ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  ],
  [
    "fr",
    fr,
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  ],
])("the weekday names of the month in %s", (_name, dateLocale, expected) => {
  afterEach(() => {
    configurePorts({ dateLocale: enUS })
  })

  it("follow the first day of the week of the locale", () => {
    configurePorts({ dateLocale })
    const { container } = render(<ListCalendar rows={[]} />)

    const header = container.querySelector(".grid.grid-cols-7")!
    const names = Array.from(header.children).map((cell) =>
      cell.textContent?.toLowerCase()
    )
    expect(names).toEqual(expected)
  })
})

describe("the month on a narrow screen", () => {
  const matchMedia = window.matchMedia

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 15, 12))
    window.matchMedia = ((query: string) => ({
      matches: query.includes("639px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    configurePorts({ dateLocale: fr })
  })

  afterEach(() => {
    vi.useRealTimers()
    window.matchMedia = matchMedia
    configurePorts({ dateLocale: enUS })
  })

  it("shortens the weekday names to their initial", () => {
    const { container } = render(<ListCalendar rows={[]} />)

    const header = container.querySelector(".grid.grid-cols-7")!
    const names = Array.from(header.children).map((cell) => cell.textContent)
    expect(names).toEqual(["L", "M", "M", "J", "V", "S", "D"])
  })

  it("lists the events of a day once it is tapped, and not before", () => {
    render(<ListCalendar rows={rows} />)

    expect(screen.queryByText("Release")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /23 octobre/ }))

    expect(screen.getByText("Release")).toBeInTheDocument()
    expect(screen.getByText("Meeting")).toBeInTheDocument()
  })
})

describe("the navigation of the calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 15, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    delete layoutOptions.mode
  })

  const title = () => screen.getByRole("heading", { level: 3 })
  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }))

  it("moves a month at a time, and Today comes back to the current one", () => {
    render(<ListCalendar rows={[]} />)
    expect(title()).toHaveTextContent("October 2026")

    click("Previous")
    expect(title()).toHaveTextContent("September 2026")

    click("Next")
    click("Next")
    expect(title()).toHaveTextContent("November 2026")

    click("Today")
    expect(title()).toHaveTextContent("October 2026")
  })

  it("moves a week at a time in the week mode", () => {
    layoutOptions.mode = "week"
    render(<ListCalendar rows={[]} />)
    expect(title()).toHaveTextContent("11 Oct - 17 Oct 2026")

    click("Next")
    expect(title()).toHaveTextContent("18 Oct - 24 Oct 2026")

    click("Previous")
    click("Previous")
    expect(title()).toHaveTextContent("4 Oct - 10 Oct 2026")
  })

  it("moves a day at a time in the day mode", () => {
    layoutOptions.mode = "day"
    render(<ListCalendar rows={[]} />)
    expect(title()).toHaveTextContent("Thursday 15 October 2026")

    click("Previous")
    expect(title()).toHaveTextContent("Wednesday 14 October 2026")

    click("Today")
    expect(title()).toHaveTextContent("Thursday 15 October 2026")
  })
})

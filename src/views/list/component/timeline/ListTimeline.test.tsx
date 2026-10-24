import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const layoutOptions: Record<string, unknown> = {
  startField: "startDate",
  endField: "endDate",
  daysToShow: 14,
}

vi.mock("@/views/list/component/ListPagination", () => ({
  default: () => null,
}))
vi.mock("@/layout/useLayout", () => ({
  useLayout: () => ({ options: layoutOptions }),
}))

const { default: ListTimeline } =
  await import("@/views/list/component/timeline/ListTimeline")

const rows = [
  {
    data: { "@id": "/api/tasks/1", title: "Release", startDate: "2026-10-23" },
  },
]

describe.each(["Europe/Paris", "America/New_York"])("ListTimeline in %s", (zone) => {
  const initialZone = process.env.TZ

  beforeEach(() => {
    process.env.TZ = zone
    vi.useFakeTimers({ toFake: ["Date"] })
    // A Friday; the 14 days shown start on Sunday 18 October.
    vi.setSystemTime(new Date(2026, 9, 23, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    if (initialZone === undefined) delete process.env.TZ
    else process.env.TZ = initialZone
  })

  it("puts a date without a time on its own day", () => {
    render(<ListTimeline rows={rows} />)

    const bar = screen.getByTitle("Release")
    // 23 October is the 6th of the 14 days: not the evening before.
    expect(parseFloat(bar.style.left)).toBeCloseTo((5 / 14) * 100, 1)
  })

  it("makes a group of a numeric or boolean groupBy value, 0 and false included", () => {
    layoutOptions.groupBy = "roomId"
    try {
      render(
        <ListTimeline
          rows={[
            {
              data: {
                "@id": "/api/t/1",
                title: "A",
                startDate: "2026-10-23",
                roomId: 3,
              },
            },
            {
              data: {
                "@id": "/api/t/2",
                title: "B",
                startDate: "2026-10-23",
                roomId: 0,
              },
            },
            {
              data: {
                "@id": "/api/t/3",
                title: "C",
                startDate: "2026-10-23",
                roomId: false,
              },
            },
          ]}
        />
      )

      expect(screen.getByText("3")).toBeTruthy()
      expect(screen.getByText("0")).toBeTruthy()
      expect(screen.getByText("false")).toBeTruthy()
      expect(screen.queryByText("Unassigned")).toBeNull()
    } finally {
      delete layoutOptions.groupBy
    }
  })
})

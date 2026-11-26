import { describe, expect, it } from "vitest"
import {
  actorName,
  dayKind,
  groupByDay,
  initialsOf,
  readDate,
} from "@/views/list/component/feed/feedData"

const at = (value: string) => readDate(value)

describe("feedData", () => {
  it("reads the dates an API sends, and nothing else", () => {
    expect(readDate("2026-03-02T10:00:00")).toBeInstanceOf(Date)
    expect(readDate(1_700_000_000_000)).toBeInstanceOf(Date)
    expect(readDate("not a date")).toBeUndefined()
    expect(readDate(null)).toBeUndefined()
    expect(readDate("")).toBeUndefined()
  })

  it("gathers by day, the most recent first, undated records last", () => {
    const rows = [
      { id: "a", d: "2026-03-01T09:00:00" },
      { id: "b", d: "2026-03-02T08:00:00" },
      { id: "c", d: "2026-03-02T18:00:00" },
      { id: "d", d: undefined },
    ]
    const days = groupByDay(rows, (row) => at(row.d as string))

    expect(days.map((day) => day.key)).toEqual([
      "2026-03-02",
      "2026-03-01",
      "undated",
    ])
    expect(days[0].entries.map((entry) => entry.row.id)).toEqual(["c", "b"])
  })

  it("reads oldest first with order asc", () => {
    const rows = [
      { id: "a", d: "2026-03-02T09:00:00" },
      { id: "b", d: "2026-03-01T09:00:00" },
    ]
    const days = groupByDay(rows, (row) => at(row.d), "asc")
    expect(days.map((day) => day.key)).toEqual(["2026-03-01", "2026-03-02"])
  })

  it("tells today and yesterday from any other day", () => {
    const now = new Date(2026, 2, 10, 12)
    expect(dayKind(new Date(2026, 2, 10, 1), now)).toBe("today")
    expect(dayKind(new Date(2026, 2, 9, 23), now)).toBe("yesterday")
    expect(dayKind(new Date(2026, 2, 1), now)).toBe("date")
  })

  it("names an actor from a string or an object", () => {
    expect(actorName("Ada")).toBe("Ada")
    expect(actorName({ name: "Ada Lovelace" })).toBe("Ada Lovelace")
    expect(actorName({})).toBeUndefined()
    expect(initialsOf("Ada Lovelace")).toBe("AL")
    expect(initialsOf("")).toBe("?")
  })
})

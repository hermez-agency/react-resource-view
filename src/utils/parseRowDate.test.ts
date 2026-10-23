import { describe, expect, it } from "vitest"
import { isDateOnly, parseRowDate } from "@/utils/parseRowDate"

describe("parseRowDate", () => {
  it("reads a date without a time as that day, at local midnight", () => {
    const date = parseRowDate("2026-10-23")!
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 9, 23,
    ])
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0])
  })

  it("keeps a full timestamp as the instant it names", () => {
    expect(parseRowDate("2026-10-23T10:30:00Z")!.toISOString()).toBe(
      "2026-10-23T10:30:00.000Z"
    )
  })

  it("rejects what is not a date", () => {
    expect(parseRowDate("2026-02-30")).toBeUndefined()
    expect(parseRowDate("nope")).toBeUndefined()
    expect(parseRowDate(null)).toBeUndefined()
  })

  it("tells a date without a time from a timestamp", () => {
    expect(isDateOnly("2026-10-23")).toBe(true)
    expect(isDateOnly("2026-10-23T00:00:00Z")).toBe(false)
  })
})

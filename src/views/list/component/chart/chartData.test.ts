import { describe, expect, it } from "vitest"
import { chartData } from "@/views/list/component/chart/chartData"

const orders = [
  { status: "paid", total: 120, placedAt: "2026-01-14" },
  { status: "paid", total: 80, placedAt: "2026-01-20" },
  { status: "refunded", total: "40", placedAt: "2026-03-02" },
  { status: undefined, total: undefined, placedAt: "2026-03-28" },
]

describe("chartData", () => {
  it("counts the records of each group, the largest first", () => {
    const { count, buckets } = chartData(orders, { groupBy: "status" })

    expect(count).toBe(4)
    expect(buckets.map((b) => [b.key, b.value])).toEqual([
      ["paid", 2],
      ["refunded", 1],
      // The records with no value come last, however many they are.
      ["", 1],
    ])
  })

  it("sums a field, and averages it over the records that carry it", () => {
    const summary = chartData(orders, { groupBy: "status", valueField: "total" })

    expect(summary.total).toBe(240)
    expect(summary.average).toBe(80)
    expect(summary.buckets[0]).toMatchObject({ key: "paid", value: 200, count: 2 })

    const averages = chartData(orders, {
      groupBy: "status",
      valueField: "total",
      aggregate: "average",
    })
    expect(averages.buckets[0].value).toBe(100)
  })

  it("follows the declared groups, labels and order, empty ones included", () => {
    const { buckets } = chartData(orders, {
      groupBy: "status",
      groups: [
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
        { value: "refunded", label: "Refunded" },
      ],
    })

    expect(buckets.slice(0, 3).map((b) => [b.label, b.value])).toEqual([
      ["Pending", 0],
      ["Paid", 2],
      ["Refunded", 1],
    ])
  })

  it("charts over time, keeping the empty periods in between", () => {
    const { buckets } = chartData(orders, {
      dateField: "placedAt",
      interval: "month",
    })

    expect(buckets.map((b) => b.value)).toEqual([2, 0, 2])
    expect(buckets.map((b) => b.date?.getMonth())).toEqual([0, 1, 2])
  })
})

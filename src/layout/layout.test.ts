import { describe, expect, expectTypeOf, it } from "vitest"
import { layout, type Layout } from "@/layout/layout"
import { createViewResource } from "@/utils/createViewResource"
import { ListTable } from "@/views/list/component/table/ListTable"
import ListColumn from "@/views/list/component/columns/ListColumn"
import { ListCard } from "@/views/list/component/card/ListCard"
import { ListCalendar } from "@/views/list/component/calendar/ListCalendar"
import ListTimeline from "@/views/list/component/timeline/ListTimeline"
import ListSplit from "@/views/list/component/split/ListSplit"
import { ListItem } from "@/views/list/component/item/ListItem"
import { ListTree } from "@/views/list/component/tree/ListTree"
import { ListMap } from "@/views/list/component/map/ListMap"
import { ListChart } from "@/views/list/component/chart/ListChart"

interface Task {
  "@id": string
  "@type": string
  id: string
  title: string
  status: string
  assignee: string
  startDate: string
  dueDate: string
}

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "done", label: "Done" },
]

describe("layout.*", () => {
  it("names each layout after its type, in the URL and on its tab", () => {
    const layouts = [
      layout.table(),
      layout.cards(),
      layout.board({ groupBy: "status", columns: STATUSES }),
      layout.calendar(),
      layout.timeline(),
      layout.split(),
      layout.items(),
      layout.tree(),
      layout.map(),
      layout.chart({ groupBy: "status" }),
    ]

    expect(layouts.map(({ type, id, label }) => [type, id, label])).toEqual([
      ["table", "table", "Table"],
      ["cards", "cards", "Cards"],
      ["board", "board", "Board"],
      ["calendar", "calendar", "Calendar"],
      ["timeline", "timeline", "Timeline"],
      ["split", "split", "Split"],
      ["items", "items", "Items"],
      ["tree", "tree", "Tree"],
      ["map", "map", "Map"],
      ["chart", "chart", "Chart"],
    ])
  })

  // 0.x derived the id from the name: renaming "Board" to "Kanban" changed
  // the URL, and every link already shared fell back on the first layout.
  it("keeps its URL id when its label changes", () => {
    expect(
      layout.board({ label: "Kanban", groupBy: "status", columns: [] }).id
    ).toBe("board")
    expect(layout.table({ id: "compact", label: "Compact" }).id).toBe("compact")
  })

  // The components are loaded on demand: a layout holds a stand-in whose `load`
  // gives the real one.
  const loaded = (component: unknown) =>
    (component as { load: () => Promise<unknown> }).load()

  it("draws each list with its own component", async () => {
    await expect(loaded(layout.table().components.list)).resolves.toBe(ListTable)
    await expect(loaded(layout.cards().components.list)).resolves.toBe(ListCard)
    await expect(
      loaded(layout.board({ groupBy: "status", columns: [] }).components.list)
    ).resolves.toBe(ListColumn)
    await expect(loaded(layout.calendar().components.list)).resolves.toBe(
      ListCalendar
    )
    await expect(loaded(layout.timeline().components.list)).resolves.toBe(
      ListTimeline
    )
    await expect(loaded(layout.split().components.list)).resolves.toBe(ListSplit)
    await expect(loaded(layout.items().components.list)).resolves.toBe(ListItem)
    await expect(loaded(layout.tree().components.list)).resolves.toBe(ListTree)
    await expect(loaded(layout.map().components.list)).resolves.toBe(ListMap)
    await expect(
      loaded(layout.chart({ groupBy: "status" }).components.list)
    ).resolves.toBe(ListChart)
  })

  it("lets a component of one's own replace one of the layout's", async () => {
    const Row = () => null
    const cards = layout.cards({ components: { row: Row } })

    expect(cards.components.row).toBe(Row)
    await expect(loaded(cards.components.list)).resolves.toBe(ListCard)
  })

  it("keeps the options of each layout, with their defaults", () => {
    expect(layout.cards({ columns: 3 }).options).toEqual({ columns: 3 })
    expect(layout.cards().options).toEqual({ columns: 4 })
    expect(layout.board({ groupBy: "status", columns: STATUSES }).options).toEqual({
      groupBy: "status",
      columns: STATUSES,
    })
    expect(layout.calendar({ dateField: "dueDate", mode: "week" }).options).toEqual({
      dateField: "dueDate",
      mode: "week",
      hourStart: 7,
      hourEnd: 21,
    })
    expect(layout.split({ readInList: true }).options).toEqual({
      readInList: true,
      action: "update",
    })
  })

  it("fills a timeline with the fields it reads by default", () => {
    expect(layout.timeline().options).toEqual({
      startField: "startDate",
      endField: "endDate",
      titleField: "title",
      statusField: "state",
      daysToShow: 14,
      unassignedLabel: "Unassigned",
      showUnassigned: true,
    })
    expect(
      layout.timeline({ startField: "startDate", groupBy: "room", daysToShow: 7 })
        .options
    ).toMatchObject({ startField: "startDate", groupBy: "room", daysToShow: 7 })
  })

  it("fills a tree, a map and a chart with the fields they read by default", () => {
    expect(layout.tree().options).toEqual({
      parentField: "parent",
      defaultExpanded: true,
    })
    expect(layout.map().options).toEqual({
      latitudeField: "latitude",
      longitudeField: "longitude",
      height: 420,
    })
    expect(layout.chart({ groupBy: "status" }).options).toEqual({
      groupBy: "status",
      interval: "month",
    })
  })

  it("builds a layout of one's own", () => {
    const HeatmapList = () => null
    const heatmap = layout.custom({
      type: "heatmap",
      components: { list: HeatmapList },
      options: { dense: true },
    })

    expect(heatmap).toMatchObject({
      type: "heatmap",
      id: "heatmap",
      label: "Heatmap",
      options: { dense: true },
    })
    expect(heatmap.components.list).toBe(HeatmapList)
    expect(heatmap.components.row).toBeTypeOf("function")
    expect(heatmap.supports).toBeUndefined()
  })

  it("says which layouts draw a view opened inline under a row", () => {
    expect(layout.table().supports).toEqual(["inline", "selection"])
    expect(layout.items().supports).toEqual(["inline", "selection"])
    expect(layout.cards().supports).toEqual(["inline", "selection"])
    expect(layout.tree().supports).toEqual(["inline", "selection"])
    expect(layout.map().supports).toBeUndefined()
    expect(layout.chart({ groupBy: "status" }).supports).toBeUndefined()
    expect(layout.board({ groupBy: "status", columns: STATUSES }).supports).toEqual([
      "selection",
    ])
    expect(layout.calendar().supports).toBeUndefined()
    expect(layout.timeline().supports).toBeUndefined()
    expect(
      layout.custom({
        type: "tree",
        components: { list: () => null },
        supports: ["inline"],
      }).supports
    ).toEqual(["inline"])
  })
})

// Checked by the type checker: the declarations below are never run — the
// development checks would refuse them, which is the point.
const neverRun = (declare: () => void) => declare

describe("the types of layout.*", () => {
  it("checks the fields of a layout against the resource's item", () => {
    neverRun(() =>
      createViewResource<Task>("layout_typed_tasks", {
        storage: "local",
        views: {
          list: {
            layouts: [
              layout.board({ groupBy: "status", columns: STATUSES }),
              // @ts-expect-error — not a field of Task
              layout.board({ groupBy: "statsu", columns: STATUSES }),
              layout.calendar({ dateField: "dueDate", colorField: "assignee" }),
              // @ts-expect-error — not a field of Task
              layout.calendar({ dateField: "due" }),
              layout.timeline({ startField: "startDate", groupBy: "assignee" }),
              // @ts-expect-error — not a field of Task
              layout.timeline({ endField: "end" }),
              layout.tree({ parentField: "assignee", titleField: "title" }),
              // @ts-expect-error — not a field of Task
              layout.tree({ parentField: "parentTask" }),
              layout.map({ latitudeField: "startDate", longitudeField: "dueDate" }),
              // @ts-expect-error — not a field of Task
              layout.map({ latitudeField: "lat" }),
              layout.chart({ groupBy: "status", dateField: "dueDate" }),
              // @ts-expect-error — not a field of Task
              layout.chart({ valueField: "amount" }),
              layout.table({ fields: ["title", "status"] }),
              // @ts-expect-error — not a field of Task
              layout.table({ fields: ["titel"] }),
            ],
          },
        },
      })
    )
  })

  it("offers each layout only its own options", () => {
    neverRun(() => {
      // @ts-expect-error — `columns` of a board are its groups, not a number
      layout.board({ groupBy: "status", columns: 3 })
      // @ts-expect-error — a board needs to know what to group by
      layout.board({ columns: STATUSES })
      // @ts-expect-error — `selectable` belongs to the list, not to a layout
      layout.table({ selectable: false })
      // @ts-expect-error — `bulkActions` belong to the list, not to the board
      layout.board({ groupBy: "status", columns: STATUSES, bulkActions: [] })
      // @ts-expect-error — `grid` was renamed `columns`
      layout.cards({ grid: 3 })
    })
  })

  it("types a layout built on its own with the item it is given", () => {
    const board = layout.board<Task>({ groupBy: "status", columns: STATUSES })
    expectTypeOf(board).toMatchTypeOf<Layout<Task>>()
    neverRun(() => {
      // @ts-expect-error — not a field of Task
      layout.board<Task>({ groupBy: "nope", columns: STATUSES })
    })
  })
})

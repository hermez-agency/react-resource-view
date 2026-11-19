import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { ListViewDefinition } from "@/ResourceDefinition"
import {
  findScroller,
  resolveVirtualize,
  VIRTUALIZE_OVERSCAN,
} from "@/views/list/component/table/virtualRows"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

/**
 * A table of hundreds of rows draws only those on screen: the others are two
 * spacer rows, while the header, the groups, the selection and the keyboard
 * still deal with every row of the page.
 */
interface Task {
  "@id": string
  "@type": string
  id: string
  title: string
  status: string
}

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "done", label: "Done" },
]

const tasks = (count: number): Task[] =>
  Array.from({ length: count }, (_, index) => ({
    "@id": `/api/tasks/${index + 1}`,
    "@type": "Task",
    id: String(index + 1),
    title: `Task ${index + 1}`,
    status: index % 2 ? "done" : "todo",
  }))

let counter = 0

function renderTable(count: number, list: ListViewDefinition<Task>) {
  const id = `virtual_${++counter}`
  const members = tasks(count)
  const resource = createViewResource<Task>(id, {
    name: "Tasks",
    storage: "local",
    repository: {
      getCollection: async () => ({
        data: {
          "@id": "/api/tasks",
          "@type": "Collection",
          member: members,
          totalItems: members.length,
        } as any,
      }),
    },
    form: {
      inputs: {
        title: { label: "Title" },
        // A select: what `groupBy` sections the rows by.
        status: { type: "select", label: "Status", options: STATUSES } as any,
      },
    },
    views: { list },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [resource], defaultScope: id }}
    />
  )
}

const bodyRows = () =>
  [...document.querySelectorAll("tbody > tr")] as HTMLTableRowElement[]
const drawnRecords = () =>
  bodyRows().filter((row) => row.dataset.slot === "table-row")
const spacers = () =>
  document.querySelectorAll<HTMLTableRowElement>(
    "tbody > tr[data-slot=table-spacer]"
  )

// jsdom does not scroll: `scrollTo` moves `scrollY` and says so.
function scrollWindowTo(top: number) {
  Object.defineProperty(window, "scrollY", { value: top, configurable: true })
  window.dispatchEvent(new Event("scroll"))
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
  window.localStorage.clear()
  scrollWindowTo(0)
  window.scrollTo = ((options: ScrollToOptions | number, y?: number) => {
    const top = typeof options === "number" ? (y ?? 0) : (options.top ?? 0)
    // A browser says it has scrolled on the next frame, not during the call.
    setTimeout(() => scrollWindowTo(top))
  }) as typeof window.scrollTo
})

afterEach(() => {
  vi.restoreAllMocks()
  scrollWindowTo(0)
})

describe("resolveVirtualize", () => {
  it("virtualizes past 200 rows by default", () => {
    expect(resolveVirtualize(undefined, 200).enabled).toBe(false)
    expect(resolveVirtualize(undefined, 201)).toEqual({
      enabled: true,
      overscan: VIRTUALIZE_OVERSCAN,
    })
  })

  it("always with true, never with false", () => {
    expect(resolveVirtualize(true, 1).enabled).toBe(true)
    expect(resolveVirtualize(false, 10_000).enabled).toBe(false)
  })

  it("takes its own threshold and overscan", () => {
    expect(resolveVirtualize({ threshold: 10 }, 11).enabled).toBe(true)
    expect(resolveVirtualize({ threshold: 10 }, 10).enabled).toBe(false)
    expect(resolveVirtualize({ overscan: 2 }, 500).overscan).toBe(2)
  })
})

describe("findScroller", () => {
  it("takes the page when no box around scrolls down", () => {
    const outer = document.createElement("div")
    outer.style.overflowY = "auto" // computed like this by overflow-x: auto…
    const inner = document.createElement("div")
    outer.append(inner)
    document.body.append(outer)
    // …but it has nothing to scroll: jsdom lays nothing out.
    expect(findScroller(inner)).toBe(window)
    outer.remove()
  })

  it("takes the nearest box that scrolls down", () => {
    const box = document.createElement("div")
    box.style.overflowY = "auto"
    Object.defineProperty(box, "scrollHeight", { value: 5000 })
    Object.defineProperty(box, "clientHeight", { value: 500 })
    const inner = document.createElement("div")
    box.append(inner)
    document.body.append(box)
    expect(findScroller(inner)).toBe(box)
    box.remove()
  })
})

describe("layout.table({ virtualize })", () => {
  it("draws every row of a short page, without counting them", async () => {
    renderTable(20, { layouts: [layout.table()] })

    await screen.findByText("Task 20")
    expect(drawnRecords()).toHaveLength(20)
    expect(spacers()).toHaveLength(0)
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-rowcount")
  })

  it("draws only the rows on screen past 200, and counts them all", async () => {
    renderTable(500, { layouts: [layout.table()] })

    await screen.findByText("Task 1")
    const drawn = drawnRecords()
    expect(drawn.length).toBeGreaterThan(5)
    expect(drawn.length).toBeLessThan(60)
    expect(screen.queryByText("Task 500")).toBeNull()

    const table = screen.getByRole("table")
    expect(table).toHaveAttribute("aria-rowcount", "501")
    expect(screen.getAllByRole("row")[0]).toHaveAttribute("aria-rowindex", "1")
    expect(drawn[0]).toHaveAttribute("aria-rowindex", "2")
    expect(drawn[1]).toHaveAttribute("aria-rowindex", "3")
    // The rows below are one spacer standing for their height.
    const [below] = spacers()
    expect(below).toHaveAttribute("aria-hidden", "true")
    expect(parseInt(below.style.height)).toBeGreaterThan(400 * 40)
    // The header is the table's own, untouched.
    expect(screen.getAllByRole("columnheader").at(-1)?.className).toContain(
      "sticky right-0"
    )
  })

  it("follows the scroll: the rows above become a spacer", async () => {
    renderTable(500, { layouts: [layout.table()] })
    await screen.findByText("Task 1")

    act(() => scrollWindowTo(250 * 53))

    expect(await screen.findByText("Task 250")).toBeInTheDocument()
    expect(screen.queryByText("Task 1")).toBeNull()
    expect(spacers()).toHaveLength(2)
    const row = screen.getByText("Task 250").closest("tr")!
    expect(row).toHaveAttribute("aria-rowindex", "251")
  })

  it("draws every row with virtualize: false", async () => {
    renderTable(250, { layouts: [layout.table({ virtualize: false })] })
    await screen.findByText("Task 250")
    expect(drawnRecords()).toHaveLength(250)
  })

  it("virtualizes a short page with virtualize: true", async () => {
    renderTable(100, { layouts: [layout.table({ virtualize: true })] })
    await screen.findByText("Task 1")
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "101")
    expect(drawnRecords().length).toBeLessThan(100)
  })

  it("takes its own threshold", async () => {
    renderTable(30, { layouts: [layout.table({ virtualize: { threshold: 20 } })] })
    await screen.findByText("Task 1")
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "31")
  })

  it("lays groups and their rows out as one list, folding included", async () => {
    renderTable(400, { layouts: [layout.table({ groupBy: "status" })] })

    const todo = await screen.findByRole("button", { name: /To do/ })
    expect(todo).toHaveTextContent("200")
    // Two group headers and 400 records.
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "403")
    expect(todo.closest("tr")).toHaveAttribute("aria-rowindex", "2")

    fireEvent.click(todo)
    await waitFor(() =>
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "203")
    )
    // The next group's header comes up under the folded one.
    expect(
      screen.getByRole("button", { name: /Done/ }).closest("tr")
    ).toHaveAttribute("aria-rowindex", "3")
  })

  it("selects every row of the page, drawn or not", async () => {
    renderTable(300, { layouts: [layout.table()], selectable: true })
    await screen.findByText("Task 1")

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    expect(screen.getByRole("toolbar")).toHaveTextContent("300 selected")
  })

  it("moves to the next row with the arrows, scrolling to one not drawn", async () => {
    // jsdom lays nothing out: the page is as high as the table would be.
    const root = document.documentElement
    vi.spyOn(root, "scrollHeight", "get").mockReturnValue(500 * 53 + 200)
    renderTable(500, { layouts: [layout.table()] })
    await screen.findByText("Task 1")

    const first = drawnRecords()[0]
    const button = first.querySelector<HTMLElement>("a[href],button") ?? first
    first.tabIndex = -1
    button.focus()
    fireEvent.keyDown(button, { key: "ArrowDown" })
    expect(document.activeElement?.closest("tr")).toHaveAttribute(
      "aria-rowindex",
      "3"
    )

    fireEvent.keyDown(document.activeElement!, { key: "End", ctrlKey: true })
    await waitFor(() =>
      expect(document.activeElement?.closest("tr")).toHaveAttribute(
        "aria-rowindex",
        "501"
      )
    )
    expect(screen.getByText("Task 500")).toBeInTheDocument()
    expect(window.scrollY).toBeGreaterThan(400 * 40)

    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" })
    expect(document.activeElement?.closest("tr")).toHaveAttribute(
      "aria-rowindex",
      "500"
    )
  })
})

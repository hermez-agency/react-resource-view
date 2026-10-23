import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { RowInterface } from "@/ViewResource"
import { groupRows } from "@/views/list/grouping/groupRows"
import { groupPreferenceKey } from "@/views/list/grouping/groupPreference"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "In progress" },
  { value: "done", label: "Done" },
]

const row = (data: Record<string, unknown>) => ({ data }) as RowInterface

describe("groupRows", () => {
  const rows = [
    row({ title: "a", status: "done" }),
    row({ title: "b", status: "todo" }),
    row({ title: "c", status: "done" }),
    row({ title: "d" }),
    row({ title: "e", status: "" }),
    row({ title: "f", status: "archived" }),
  ]

  it("follows the order and the labels of the options, then the other values", () => {
    const groups = groupRows(rows, "status", STATUSES, "No value")

    expect(groups.map((g) => [g.label, g.rows.length])).toEqual([
      ["To do", 1],
      ["In progress", 0],
      ["Done", 2],
      ["archived", 1],
      ["No value", 2],
    ])
  })

  it("names the records with no value, and has no option to read", () => {
    const groups = groupRows([row({ status: null })], "status", undefined, "Nothing")

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: "", label: "Nothing" })
    expect(groups[0].rows).toHaveLength(1)
  })

  it("has no section for an empty page", () => {
    expect(groupRows([], "status", undefined, "No value")).toEqual([])
  })

  it("files a number under the option written as a string", () => {
    const groups = groupRows(
      [row({ level: 2 })],
      "level",
      [{ value: "2", label: "Two" }],
      "x"
    )

    expect(groups[0]).toMatchObject({ label: "Two" })
    expect(groups[0].rows).toHaveLength(1)
  })

  it("groups related records by their name", () => {
    const groups = groupRows(
      [
        row({ owner: { "@id": "/u/1", name: "Ada" } }),
        row({ owner: { "@id": "/u/1", name: "Ada" } }),
      ],
      "owner",
      undefined,
      "x"
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ label: "Ada" })
    expect(groups[0].rows).toHaveLength(2)
  })
})

const TASKS = [
  ["1", "Roast", "done"],
  ["2", "Pack", "todo"],
  ["3", "Ship", "done"],
  ["4", "Ponder", null],
].map(([id, title, status]) => ({
  "@id": `/api/tasks/${id}`,
  "@type": "Task",
  id,
  title,
  status,
}))

let counter = 0

function renderTasks(
  layouts: any[],
  { totalItems = TASKS.length }: { totalItems?: number } = {}
) {
  const id = `grouping_${++counter}`
  const tasks = createViewResource(id, {
    name: "Tasks",
    storage: "local",
    repository: {
      getCollection: async () => ({
        data: {
          "@id": "/api/tasks",
          "@type": "Collection",
          member: TASKS,
          totalItems,
        } as any,
      }),
    },
    form: {
      inputs: {
        title: { label: "Title" },
        status: { type: "select", label: "Status", options: STATUSES },
      },
    },
    views: { list: { layouts } },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [tasks], defaultScope: id }}
    />
  )

  return id
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
  window.localStorage.clear()
})

describe("layout.table({ groupBy })", () => {
  it("draws one foldable section per option, with its count", async () => {
    renderTasks([layout.table({ groupBy: "status" })])

    const done = await screen.findByRole("button", { name: /Done/ })
    expect(done).toHaveAttribute("aria-expanded", "true")
    expect(done).toHaveTextContent("2")
    expect(screen.getByRole("button", { name: /To do/ })).toHaveTextContent("1")
    // A status nobody has is still a section, empty.
    expect(screen.getByRole("button", { name: /In progress/ })).toHaveTextContent(
      "0"
    )
    expect(screen.getByRole("button", { name: /No value/ })).toHaveTextContent("1")
    expect(
      await screen.findByText("Roast", {}, { timeout: 3000 })
    ).toBeInTheDocument()

    fireEvent.click(done)
    expect(done).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Roast")).toBeNull()
    expect(screen.getByText("Pack")).toBeInTheDocument()

    fireEvent.click(done)
    expect(await screen.findByText("Roast")).toBeInTheDocument()
  })

  it("says the sections are those of the page when the API holds more", async () => {
    renderTasks([layout.table({ groupBy: "status" })], { totalItems: 40 })

    expect(
      await screen.findByText("Grouped over the 4 records of this page, out of 40")
    ).toBeInTheDocument()
  })

  it("lets the reader group by another select from the Properties menu, and remembers it", async () => {
    const id = renderTasks([layout.table()])
    await screen.findByText("Roast")
    expect(screen.queryByRole("button", { name: /Done/ })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Properties" }))
    fireEvent.change(await screen.findByRole("combobox", { name: "Group by" }), {
      target: { value: "status" },
    })

    expect(await screen.findByRole("button", { name: /Done/ })).toBeInTheDocument()
    expect(window.localStorage.getItem(groupPreferenceKey(id, "table"))).toBe(
      "status"
    )

    fireEvent.change(screen.getByRole("combobox", { name: "Group by" }), {
      target: { value: "" },
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Done/ })).toBeNull()
    )
    expect(window.localStorage.getItem(groupPreferenceKey(id, "table"))).toBe("")
  })
})

describe("layout.cards({ groupBy })", () => {
  it("draws one foldable section per option, its cards inside", async () => {
    // The default card would resolve each record against the API.
    const row = ({ row }: { row?: RowInterface }) => <p>{String(row?.data.title)}</p>
    renderTasks([layout.cards({ groupBy: "status", components: { row } })])

    const todo = await screen.findByRole("button", { name: /To do/ })
    const region = document.getElementById(todo.getAttribute("aria-controls")!)!
    expect(within(region).getByText("Pack")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /No value/ })).toHaveTextContent("1")

    fireEvent.click(todo)
    expect(todo).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Pack")).toBeNull()
  })
})

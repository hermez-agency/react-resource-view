import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource } from "@/utils/createViewResource"
import { permissionResource, usePermission } from "@/utils/permissionResource"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ResourceViewButton from "@/action/ResourceViewButton"
import type { Permissions } from "@/ResourceDefinition"
import type { ViewResource } from "@/ViewResource"

/**
 * What a resource lets its users do. Allowed unless restricted — the API is
 * where access is enforced — told the record it is asked about, and possibly
 * answering later.
 */

interface Task {
  "@id": string
  "@type": string
  id: string
  title: string
  status: "todo" | "done"
}

const TASKS: Task[] = [
  { "@id": "/tasks/1", "@type": "Task", id: "1", title: "Roast", status: "todo" },
  { "@id": "/tasks/2", "@type": "Task", id: "2", title: "Ship", status: "done" },
]

let count = 0

function createTasks(permissions?: Permissions<Task>) {
  const id = `permission_tasks_${++count}`
  localStorage.setItem(
    id,
    JSON.stringify({
      "@id": id,
      "@type": "Collection",
      member: TASKS,
      totalItems: TASKS.length,
    })
  )

  return createViewResource<Task>(id, {
    name: "Tasks",
    storage: "local",
    form: { inputs: { title: { label: "Title" } } },
    permissions,
  })
}

/** A row per task, with the buttons a row of a list offers. */
function Rows() {
  const { data } = useCurrentViewResourceContext()
  const tasks = (data as { member?: Task[] } | undefined)?.member ?? []

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id} data-testid={`row-${task.id}`}>
          {task.title}
          <ResourceViewButton action="update" data={task} />
          <ResourceViewButton action="delete" data={task} />
        </li>
      ))}
    </ul>
  )
}

function renderRows(resource: ViewResource) {
  return render(
    <ResourceViewProvider
      viewResourceContextParams={{ resource, resourceAction: ActionList.list }}
    />
  )
}

afterEach(() => localStorage.clear())

describe("permissionResource", () => {
  it("allows an action nothing restricts", () => {
    const resource = createTasks()

    for (const action of [
      "list",
      "read",
      "create",
      "update",
      "delete",
      "export",
    ] as const) {
      expect(permissionResource(resource, action)).toBe(true)
    }
  })

  it("follows `canList` rather than `canRead` for the list (the 0.x bug)", () => {
    const resource = createTasks({ list: false })

    expect(permissionResource(resource, "list")).toBe(false)
    expect(permissionResource(resource, "read")).toBe(true)
  })

  it("asks a function about the record", () => {
    const resource = createTasks({ delete: ({ item }) => item?.status !== "done" })

    expect(permissionResource(resource, "delete", { item: TASKS[0] })).toBe(true)
    expect(permissionResource(resource, "delete", { item: TASKS[1] })).toBe(false)
  })

  it("tells the function which action it is asked about", () => {
    const rule = vi.fn(() => true)
    const resource = createTasks({ update: rule })
    permissionResource(resource, ActionList.update, { item: TASKS[0] })

    expect(rule).toHaveBeenCalledWith(
      expect.objectContaining({ action: "update", item: TASKS[0] })
    )
  })

  it("asks `update` about moving a card, unless `move` is declared", () => {
    const rule = vi.fn(() => false)
    const updateOnly = createTasks({ update: rule })
    const moveAllowed = createTasks({ update: false, move: true })

    expect(permissionResource(updateOnly, "move", { item: TASKS[0] })).toBe(false)
    expect(rule).toHaveBeenCalledWith(expect.objectContaining({ action: "update" }))
    expect(permissionResource(moveAllowed, "move")).toBe(true)
    expect(permissionResource(moveAllowed, "update")).toBe(false)
  })

  it("returns a promise when the answer is asynchronous", async () => {
    const resource = createTasks({ update: async () => false })

    await expect(permissionResource(resource, "update")).resolves.toBe(false)
  })

  it("refuses when the function fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const resource = createTasks({
      delete: () => {
        throw new Error("no session")
      },
      update: async () => {
        throw new Error("no session")
      },
    })

    expect(permissionResource(resource, "delete")).toBe(false)
    await expect(permissionResource(resource, "update")).resolves.toBe(false)
  })
})

describe("the buttons of a list", () => {
  it("are all there when nothing is restricted", async () => {
    renderRows(withRows(createTasks()))

    await screen.findByText("Roast")
    for (const id of ["1", "2"]) {
      expect(buttonOf(id, "update")).not.toBeNull()
      expect(buttonOf(id, "delete")).not.toBeNull()
    }
  })

  it("leave out the action a record refuses", async () => {
    renderRows(
      withRows(createTasks({ delete: ({ item }) => item?.status !== "done" }))
    )

    await screen.findByText("Roast")
    expect(buttonOf("1", "delete")).not.toBeNull()
    expect(buttonOf("2", "delete")).toBeNull()
    expect(buttonOf("2", "update")).not.toBeNull()
  })

  it("wait for an asynchronous answer, asked once per row and action", async () => {
    // Answered only when the test says so: "pending" is a state, not a race.
    let answer!: () => void
    const answered = new Promise<void>((resolve) => (answer = resolve))
    const rule = vi.fn(async ({ item }: { item?: Task }) => {
      await answered
      return item?.status !== "done"
    })
    renderRows(withRows(createTasks({ delete: rule })))

    await screen.findByText("Roast")
    // Pending: nothing is offered before it is known to be allowed.
    expect(buttonOf("1", "delete")).toBeNull()

    answer()
    await waitFor(() => expect(buttonOf("1", "delete")).not.toBeNull())
    expect(buttonOf("2", "delete")).toBeNull()
    // Two rows, one action: two questions, however many renders it took.
    expect(rule).toHaveBeenCalledTimes(2)
  })
})

describe("usePermission", () => {
  it("asks a synchronous rule again on every render, rather than remembering it", async () => {
    let role = "admin"
    function CanDelete() {
      return <p>{usePermission("delete") ? "may delete" : "may not delete"}</p>
    }
    const resource = createViewResource(`permission_role_${++count}`, {
      storage: "local",
      permissions: { delete: () => role === "admin" },
      components: { view: CanDelete },
    })
    const { unmount } = renderRows(resource)
    expect(await screen.findByText("may delete")).toBeInTheDocument()
    unmount()

    role = "guest"
    renderRows(resource)
    expect(await screen.findByText("may not delete")).toBeInTheDocument()
  })

  it("answers about the resource of the view on screen", async () => {
    function CanCreate() {
      return <p>{usePermission("create") ? "may create" : "may not create"}</p>
    }
    const resource = createViewResource(`permission_hook_${++count}`, {
      storage: "local",
      permissions: { create: false },
      components: { view: CanCreate },
    })
    renderRows(resource)

    expect(await screen.findByText("may not create")).toBeInTheDocument()
  })
})

/** The resource, drawn with one row per task and its buttons. */
function withRows(resource: ReturnType<typeof createTasks>) {
  return createViewResource<Task>(resource["@id"], {
    ...resource.definition,
    components: { view: Rows },
  })
}

/** The button of an action in the row of a task — a link — if it is drawn. */
function buttonOf(id: string, action: string) {
  const row = screen.queryByTestId(`row-${id}`)
  if (!row) return null

  return (
    Array.from(row.querySelectorAll("a")).find((button) =>
      button.textContent?.includes(action)
    ) ?? null
  )
}

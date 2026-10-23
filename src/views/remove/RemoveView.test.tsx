import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
import { ApiRequestError } from "@/api/apiRequestError"
import type { DeleteViewDefinition, Repository } from "@/ResourceDefinition"
import {
  currentLocation,
  RoutedViews,
  startMemoryRouter,
} from "@/internal/test/memoryRouter"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

/**
 * The confirmation is drawn in a dialog, in a drawer, or on a page of its own
 * — the direct route `…/delete/1` and `views.delete.open: "page"`. Only the
 * frames have something to close; on a page, "Cancel" goes back to the list.
 */

let count = 0
let stopRouter: () => void = () => {}

afterEach(() => {
  stopRouter()
  localStorage.clear()
})

function setUp(open?: "dialog" | "drawer" | "page") {
  const id = `remove_tasks_${++count}`
  localStorage.setItem(
    id,
    JSON.stringify({
      "@id": id,
      "@type": "Collection",
      member: [{ "@id": `/${id}/1`, "@type": id, id: "1", title: "Roast" }],
      totalItems: 1,
    })
  )
  const tasks = createViewResource(id, {
    name: "Tasks",
    storage: "local",
    form: { inputs: { title: { label: "Title" } } },
    views: {
      list: { rowActions: ["delete"] },
      delete: open ? { open } : {},
    },
  })

  return { id, configuration: { resources: [tasks], defaultScope: id } }
}

describe("the deletion view", () => {
  it("is drawn on the direct route, and Cancel goes back to the list", async () => {
    const { id, configuration } = setUp()
    stopRouter = startMemoryRouter(`/${id}/${id}/delete/1`)
    render(<RoutedViews configuration={configuration} />)

    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }))

    await waitFor(() => expect(currentLocation()).toBe(`/${id}/${id}/list`))
  })

  it('is drawn on a page with open: "page", and Cancel goes back to the list', async () => {
    const { id, configuration } = setUp("page")
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    render(<RoutedViews configuration={configuration} />)

    fireEvent.click(await screen.findByRole("link", { name: /delete/i }))
    expect(currentLocation()).toBe(`/${id}/${id}/delete/1`)

    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }))

    await waitFor(() => expect(currentLocation()).toBe(`/${id}/${id}/list`))
  })

  it.each(["dialog", "drawer"] as const)(
    "is drawn in a %s, and Cancel closes it",
    async (open) => {
      const { id, configuration } = setUp(open)
      stopRouter = startMemoryRouter(`/${id}/${id}/list`)
      render(<RoutedViews configuration={configuration} />)

      fireEvent.click(await screen.findByRole("link", { name: /delete/i }))
      const frame = await screen.findByRole("dialog")
      fireEvent.click(within(frame).getByRole("button", { name: /cancel/i }))

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(currentLocation()).toContain(`/${id}/${id}/list`)
      expect(currentLocation()).not.toContain("/delete/")
    }
  )
})

describe("a record that cannot be loaded or removed", () => {
  interface Task {
    "@id": string
    "@type": string
    id: string
    title: string
  }

  const roast: Task = {
    "@id": "/api/tasks/1",
    "@type": "Task",
    id: "1",
    title: "Roast",
  }

  function setUpRemote(
    repository: Partial<Repository<Task>>,
    views: DeleteViewDefinition<Task> = {}
  ) {
    const id = `remove_remote_${++count}`
    const tasks = createViewResource<Task>(id, {
      name: "Tasks",
      path: "/api/tasks",
      repository: { removeItem: async () => ({}), ...repository },
      form: { inputs: { title: { label: "Title" } } },
      views: { delete: views },
    })

    stopRouter = startMemoryRouter(`/${id}/${id}/delete/1`)
    render(<RoutedViews configuration={{ resources: [tasks], defaultScope: id }} />)
    return { id }
  }

  it("says so, and loads again on request", async () => {
    let fail = true
    setUpRemote({
      getItem: async () => {
        if (fail) {
          throw new ApiRequestError({
            status: 404,
            url: "/api/tasks/1",
            payload: { title: "Not Found", detail: "Item not found" },
          })
        }
        return { data: roast }
      },
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The data could not be loaded")
    expect(alert).toHaveTextContent("Item not found")
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull()

    fail = false
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))

    expect(
      await screen.findByRole("button", { name: /continue/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("sends the removal once, and disables Continue while it is in flight", async () => {
    const removeItem = vi.fn(() => new Promise<object>(() => {}))
    setUpRemote(
      { getItem: async () => ({ data: roast }), removeItem },
      { optimistic: false }
    )

    const confirm = await screen.findByRole("button", { name: /continue/i })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(removeItem).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
  })
})

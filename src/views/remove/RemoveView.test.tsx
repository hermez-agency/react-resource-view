import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
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

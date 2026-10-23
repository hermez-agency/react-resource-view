import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
import { layout } from "@/layout/layout"
import { open, type OpenFrameProps } from "@/open/open"
import { configureResourceView } from "@/ResourceConfig"
import {
  currentLocation,
  navigateTo,
  RoutedViews,
  startMemoryRouter,
} from "@/internal/test/memoryRouter"
import type { ReadViewDefinition } from "@/ResourceDefinition"
import type { Layout } from "@/layout/layout"

declare module "@/open/open" {
  interface OpenFrames {
    accordion: true
  }
}

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

/**
 * One way to open a view in a frame: written into the URL under the view it
 * was opened from, whichever control opened it — a row's button, a board's
 * card, a link typed by hand. Back closes it, a reload opens it again.
 */

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "done", label: "Done" },
]

let count = 0

function seed(id: string) {
  localStorage.setItem(
    id,
    JSON.stringify({
      "@id": id,
      "@type": "Collection",
      member: [
        ["1", "Roast", "todo"],
        ["2", "Pack", "todo"],
        ["3", "Ship", "done"],
      ].map(([key, title, status]) => ({
        "@id": `/${id}/${key}`,
        "@type": id,
        id: key,
        title,
        status,
      })),
      totalItems: 3,
    })
  )
}

/** Opens like an accordion, under the row it was opened from. */
function Accordion({ title, children, close, expandHref }: OpenFrameProps) {
  return (
    <section aria-label="accordion">
      <h3>{title}</h3>
      <button onClick={close}>Collapse</button>
      {expandHref && <a href={expandHref}>Full page</a>}
      {children}
    </section>
  )
}

const accordion = open.custom({
  type: "accordion",
  placement: "inline",
  component: Accordion,
})

function setUp({
  read,
  layouts,
  update,
}: {
  read?: ReadViewDefinition
  layouts?: Layout[]
  update?: ReadViewDefinition
} = {}) {
  const id = `open_tasks_${++count}`
  seed(id)
  const tasks = createViewResource(id, {
    name: "Tasks",
    storage: "local",
    form: { inputs: { title: { label: "Title" }, status: { label: "Status" } } },
    views: {
      list: {
        layouts: layouts ?? [layout.table()],
        rowActions: ["read", "update", "delete"],
      },
      read: { title: "Task", ...read },
      update: { title: "Edit the task", open: "dialog", ...update },
    },
  })

  return { id, tasks, configuration: { resources: [tasks], defaultScope: id } }
}

let stopRouter: () => void

beforeEach(() => {
  stopRouter = () => {}
})

afterEach(() => {
  stopRouter()
  localStorage.clear()
})

/** The link of an action in the row a cell belongs to. */
const linkOf = (cell: HTMLElement, name: RegExp | string) =>
  within(cell.closest("tr")!).getByRole("link", { name })

describe("a view opened in a dialog", () => {
  it("is written into the URL under the list, with its filter and its layout", async () => {
    const { id, configuration } = setUp()
    stopRouter = startMemoryRouter(`/${id}/${id}/list?filter=%7B%7D&variant=table`)
    render(<RoutedViews configuration={configuration} />)

    const link = linkOf(await screen.findByText("Roast"), /update/i)
    expect(link).toHaveAttribute(
      "href",
      `/${id}/${id}/list/${id}/update/1?filter=%7B%7D&variant=table`
    )

    fireEvent.click(link)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Edit the task")).toBeInTheDocument()
    expect(currentLocation()).toBe(
      `/${id}/${id}/list/${id}/update/1?filter=%7B%7D&variant=table`
    )
    // The list is still underneath.
    expect(screen.getByText("Pack")).toBeInTheDocument()
  })

  it("closes with Back, and opens again on a reload", async () => {
    const { id, configuration } = setUp()
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    const { unmount } = render(<RoutedViews configuration={configuration} />)

    fireEvent.click(linkOf(await screen.findByText("Roast"), /update/i))
    await screen.findByRole("dialog")

    await act(async () => {
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(currentLocation()).toBe(`/${id}/${id}/list`)

    // A reload: the same URL, read from scratch.
    navigateTo(`/${id}/${id}/list/${id}/update/1`)
    unmount()
    render(<RoutedViews configuration={configuration} />)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(await screen.findByText("Pack")).toBeInTheDocument()
  })

  it("closes once saved, back on the list", async () => {
    const { id, configuration } = setUp()
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    render(<RoutedViews configuration={configuration} />)

    fireEvent.click(linkOf(await screen.findByText("Roast"), /update/i))
    const dialog = await screen.findByRole("dialog")
    await within(dialog).findByDisplayValue("Roast")
    fireEvent.click(within(dialog).getByRole("button", { name: /^save$/i }))

    await waitFor(() => expect(currentLocation()).toBe(`/${id}/${id}/list`))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(currentLocation()).toBe(`/${id}/${id}/list`)
    expect(await screen.findByText("Roast")).toBeInTheDocument()
  })
})

describe("a board's card", () => {
  it("opens the record's read view at the URL its button has", async () => {
    const { id, configuration } = setUp({
      read: { open: "drawer" },
      layouts: [
        layout.table(),
        layout.board({ groupBy: "status", columns: STATUSES }),
      ],
    })
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    const { unmount } = render(<RoutedViews configuration={configuration} />)
    const buttonHref = linkOf(
      await screen.findByText("Roast"),
      /read/i
    ).getAttribute("href")
    unmount()

    navigateTo(`/${id}/${id}/list?variant=board`)
    render(<RoutedViews configuration={configuration} />)
    const card = await waitFor(() => {
      const found = document.querySelector<HTMLElement>("[data-record-card='1']")
      expect(found).not.toBeNull()
      return found!
    })
    fireEvent.click(card)

    const panel = await screen.findByRole("dialog")
    expect(panel).toHaveAttribute("data-slot", "drawer-popup")
    // The same URL, but for the layout on screen.
    expect(buttonHref).toBe(`/${id}/${id}/list/${id}/read/1?variant=table`)
    expect(currentLocation()).toBe(`/${id}/${id}/list/${id}/read/1?variant=board`)
  })
})

describe("the subscriptions of a list", () => {
  it("are one per list, however many rows carry a button", async () => {
    const { id, tasks, configuration } = setUp()
    const subscribe = vi.spyOn(tasks.onChange, "subscribe")
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    render(<RoutedViews configuration={configuration} />)

    await screen.findByText("Ship")
    expect(screen.getAllByRole("link", { name: /delete/i })).toHaveLength(3)
    expect(subscribe.mock.calls.length).toBeLessThanOrEqual(1)
  })
})

describe("a frame of one's own, inline", () => {
  it("is drawn under the row of a table", async () => {
    const { id, configuration } = setUp({ read: { open: accordion } })
    stopRouter = startMemoryRouter(`/${id}/${id}/list`)
    render(<RoutedViews configuration={configuration} />)

    fireEvent.click(linkOf(await screen.findByText("Roast"), /read/i))

    const frame = await screen.findByRole("region", { name: "accordion" })
    const row = screen.getByText("Roast").closest("tr")!
    expect(row.nextElementSibling).toContainElement(frame)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(within(frame).getByRole("link", { name: "Full page" })).toHaveAttribute(
      "href",
      `/${id}/${id}/read/1`
    )

    fireEvent.click(within(frame).getByRole("button", { name: "Collapse" }))
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "accordion" })).toBeNull()
    )
    expect(currentLocation()).toBe(`/${id}/${id}/list`)
  })

  it("is drawn under the line of a plain list", async () => {
    const { id, configuration } = setUp({
      read: { open: accordion },
      layouts: [layout.items()],
    })
    stopRouter = startMemoryRouter(`/${id}/${id}/list/${id}/read/2`)
    render(<RoutedViews configuration={configuration} />)

    const frame = await screen.findByRole("region", { name: "accordion" })
    expect(screen.getByText("Pack").closest("li")).toContainElement(frame)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("falls back to a dialog on a board, and says so in development", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { id, configuration } = setUp({
      read: { open: accordion },
      layouts: [layout.board({ groupBy: "status", columns: STATUSES })],
    })
    stopRouter = startMemoryRouter(`/${id}/${id}/list/${id}/read/1`)
    render(<RoutedViews configuration={configuration} />)

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Task")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "accordion" })).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("drawn inline"))
    warn.mockRestore()
  })

  it("can be registered once, and named", async () => {
    configureResourceView({ open: { accordion } })
    try {
      const { id, configuration } = setUp({ read: { open: "accordion" } })
      stopRouter = startMemoryRouter(`/${id}/${id}/list/${id}/read/1`)
      render(<RoutedViews configuration={configuration} />)

      expect(
        await screen.findByRole("region", { name: "accordion" })
      ).toBeInTheDocument()
    } finally {
      configureResourceView({})
    }
  })
})

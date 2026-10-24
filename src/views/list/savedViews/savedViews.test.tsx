import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { configurePorts, createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { ListViewDefinition } from "@/ResourceDefinition"
import { inspectDefinition } from "@/definition/validateDefinition"
import {
  localSavedViewsStore,
  savedViewsKey,
  slugify,
  withPresetIds,
  type SavedViewsStoreInterface,
} from "@/views/list/savedViews/savedViews"

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

interface Task {
  "@id": string
  "@type": string
  id: string
  title: string
  status: string
}

const TASKS: Task[] = [
  ["1", "Roast", "todo"],
  ["2", "Pack", "done"],
].map(([id, title, status]) => ({
  "@id": `/api/tasks/${id}`,
  "@type": "Task",
  id,
  title,
  status,
}))

let counter = 0

function renderList(list: ListViewDefinition<Task>) {
  const id = `saved_${++counter}`
  const getCollection = vi.fn(async () => ({
    data: {
      "@id": "/api/tasks",
      "@type": "Collection",
      member: TASKS,
      totalItems: TASKS.length,
    } as any,
  }))
  const tasks = createViewResource<Task>(id, {
    name: "Tasks",
    storage: "local",
    repository: { getCollection },
    form: { inputs: { title: { label: "Title" }, status: { label: "Status" } } },
    views: { list },
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

  return { getCollection, id }
}

const lastQuery = (getCollection: ReturnType<typeof vi.fn>) =>
  (getCollection.mock.calls.at(-1) as any[])?.[0]

beforeEach(() => {
  window.history.replaceState(null, "", "/")
  window.localStorage.clear()
  configurePorts({ savedViews: localSavedViewsStore })
})

describe("presets declared in code", () => {
  it("shows a tab per preset and applies its filter and sort", async () => {
    const { getCollection } = renderList({
      sort: { fields: ["title"] },
      presets: [
        { name: "Done", filter: { status: "done" }, sort: { title: "desc" } },
      ],
    })

    fireEvent.click(await screen.findByRole("tab", { name: "Done" }))

    await waitFor(() => {
      expect(JSON.stringify(lastQuery(getCollection))).toContain("done")
      expect(lastQuery(getCollection)?.order).toEqual({ title: "desc" })
    })
    expect(window.location.search).toContain("savedView=done")
    expect(
      screen.queryByRole("button", { name: "Save the current view" })
    ).toBeNull()
  })

  it("applies the preset a link points at, with its layout", async () => {
    window.history.replaceState(null, "", "/?savedView=board")
    renderList({
      layouts: [layout.table(), layout.table({ id: "compact" })],
      presets: [{ name: "Board", layout: "compact" }],
    })

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    )
    await waitFor(() => expect(window.location.search).toContain("variant=compact"))
  })

  it("types its filter, sort and layout", () => {
    const list: ListViewDefinition<Task> = {
      presets: [
        {
          name: "Late",
          filter: { status: "todo" },
          sort: { title: "asc" },
          layout: "table",
        },
        // @ts-expect-error — a direction is "asc" or "desc"
        { name: "Wrong", sort: { title: "up" } },
        // @ts-expect-error — a preset has a name
        { filter: {} },
      ],
    }

    expect(list.presets).toHaveLength(3)
  })
})

describe("views saved by the reader", () => {
  async function save(name: string) {
    fireEvent.click(
      await screen.findByRole("button", { name: "Save the current view" })
    )
    fireEvent.change(await screen.findByRole("textbox", { name: "View name" }), {
      target: { value: name },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
  }

  it("creates a view, keeps it in the store and gives it a URL", async () => {
    const { id } = renderList({ savedViews: true })

    await save("Mine")

    expect(await screen.findByRole("tab", { name: "Mine" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    const stored = JSON.parse(window.localStorage.getItem(savedViewsKey(id))!)
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe("Mine")
    expect(window.location.search).toContain(`savedView=${stored[0].id}`)
  })

  it("remembers the filters on screen and applies them again", async () => {
    const { id, getCollection } = renderList({
      savedViews: true,
      filters: {
        inputs: { status: { label: "Status" } },
        initial: { status: "todo" },
      },
      presets: [{ name: "Done", filter: { status: "done" } }],
    })

    fireEvent.click(await screen.findByRole("tab", { name: "Done" }))
    await save("Finished")
    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem(savedViewsKey(id))!)
      ).toHaveLength(1)
    )
    expect(
      JSON.parse(window.localStorage.getItem(savedViewsKey(id))!)[0].filter
    ).toEqual({ status: "done" })

    fireEvent.click(screen.getByRole("tab", { name: "All" }))
    await waitFor(() =>
      expect(JSON.stringify(lastQuery(getCollection))).toContain("todo")
    )
    fireEvent.click(screen.getByRole("tab", { name: "Finished" }))
    await waitFor(() =>
      expect(JSON.stringify(lastQuery(getCollection))).toContain("done")
    )
  })

  it("renames and deletes a view", async () => {
    const { id } = renderList({ savedViews: true })
    await save("Mine")
    await screen.findByRole("tab", { name: "Mine" })

    fireEvent.click(screen.getByRole("button", { name: "View options" }))
    fireEvent.click(await screen.findByRole("button", { name: "Rename" }))
    fireEvent.change(await screen.findByRole("textbox", { name: "View name" }), {
      target: { value: "Ours" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByRole("tab", { name: "Ours" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Mine" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "View options" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))
    const confirm = await screen.findByRole("alertdialog")
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }))

    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: "Ours" })).toBeNull()
    )
    expect(JSON.parse(window.localStorage.getItem(savedViewsKey(id))!)).toEqual([])
    expect(window.location.search).not.toContain("savedView")
  })

  it("duplicates a view, preset included", async () => {
    const { id } = renderList({
      savedViews: true,
      presets: [{ name: "Done", filter: { status: "done" } }],
    })

    fireEvent.click(await screen.findByRole("tab", { name: "Done" }))
    fireEvent.click(screen.getByRole("button", { name: "View options" }))
    fireEvent.click(await screen.findByRole("button", { name: "Duplicate" }))
    expect(await screen.findByRole("textbox", { name: "View name" })).toHaveValue(
      "Done (copy)"
    )
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByRole("tab", { name: "Done (copy)" })
    ).toBeInTheDocument()
    const stored = JSON.parse(window.localStorage.getItem(savedViewsKey(id))!)
    expect(stored[0]).toMatchObject({
      name: "Done (copy)",
      filter: { status: "done" },
    })
  })

  it("keeps the views in the store the application configures", async () => {
    const saved: any[] = []
    const store: SavedViewsStoreInterface = {
      list: vi.fn(async () => [{ id: "s1", name: "Shared" }]),
      create: vi.fn(async (_resource, view) => {
        const created = { ...view, id: "s2" }
        saved.push(created)
        return created
      }),
      update: vi.fn(),
      remove: vi.fn(),
    }
    configurePorts({ savedViews: store })
    const { id } = renderList({ savedViews: true })

    expect(await screen.findByRole("tab", { name: "Shared" })).toBeInTheDocument()
    await save("Mine")

    await screen.findByRole("tab", { name: "Mine" })
    expect(store.list).toHaveBeenCalledWith(id)
    expect(saved).toHaveLength(1)
    expect(window.localStorage.getItem(savedViewsKey(id))).toBeNull()
  })
})

describe("saved views helpers", () => {
  it("writes an id from a name", () => {
    expect(slugify("Mes tâches en retard")).toBe("mes-taches-en-retard")
    expect(
      withPresetIds([{ name: "Late" }, { name: "x", id: "own" }]).map((p) => p.id)
    ).toEqual(["late", "own"])
  })

  it("flags two presets with the same id in development", () => {
    const problems = inspectDefinition(
      "tasks",
      {
        storage: "local",
        views: {
          list: {
            layouts: [layout.table()],
            presets: [{ name: "A" }, { name: "a", layout: "nope" }],
          },
        },
      },
      "Tasks"
    )
    const messages = problems.map((problem) => problem.message).join("\n")

    expect(messages).toMatch(/named "a"/)
    expect(messages).toMatch(/"nope"/)
  })
})

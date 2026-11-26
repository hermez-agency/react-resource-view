import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { createResourceCollection } from "@/api/collectionShape"
import { ActionList } from "react-data-form"

/**
 * `{ field }` in `bulkActions`: the selected records get one update each, in
 * turn, and the outcome is said — the count updated, the count that failed.
 */
const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
)
vi.mock("sonner", () => ({ toast, Toaster: () => null }))

let counter = 0

const ITEMS = [
  { "@id": "/api/tasks/1", id: 1, title: "Write", status: "todo" },
  { "@id": "/api/tasks/2", id: 2, title: "Review", status: "todo" },
  { "@id": "/api/tasks/3", id: 3, title: "Ship", status: "todo" },
]

function renderList({
  updateItem = vi.fn(async (item: any) => ({ data: item })),
  removeItem = vi.fn(async () => undefined),
  bulkActions = [{ field: "status" }] as any[],
}: {
  updateItem?: ReturnType<typeof vi.fn>
  removeItem?: ReturnType<typeof vi.fn>
  bulkActions?: any[]
} = {}) {
  const id = `bulk_set_field_${++counter}`
  const getCollection = vi.fn(async () => ({
    data: createResourceCollection({ id: "/api/tasks", items: ITEMS }) as any,
  }))
  const tasks = createViewResource<any>(id, {
    name: "Tasks",
    storage: "local",
    repository: { getCollection, updateItem, removeItem } as any,
    form: {
      inputs: {
        title: { label: "Title" },
        status: {
          label: "Status",
          options: [
            { value: "todo", label: "To do" },
            { value: "done", label: "Done" },
          ],
        },
      },
    },
    views: { list: { layouts: [layout.table()], bulkActions } },
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

  return { updateItem, removeItem }
}

const pickRows = async (count: number) => {
  await screen.findByText("Write")
  const boxes = screen.getAllByRole("checkbox", { name: /^Select (?!all$)/ })
  boxes.slice(0, count).forEach((box) => fireEvent.click(box))
}

beforeEach(() => {
  window.history.replaceState(null, "", "/")
  toast.mockClear()
  toast.success.mockClear()
  toast.error.mockClear()
})

describe("the bulk action that sets a field", () => {
  it("offers the options of the field's select input, labelled after it", async () => {
    renderList()
    await pickRows(2)

    const toolbar = screen.getByRole("toolbar")
    fireEvent.click(within(toolbar).getByRole("button", { name: "Set Status…" }))
    expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "To do" })).toBeTruthy()
  })

  it("sends one update per selected record, with the value picked", async () => {
    const { updateItem } = renderList()
    await pickRows(2)

    fireEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", {
        name: "Set Status…",
      })
    )
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
    expect(updateItem).toHaveBeenCalledTimes(2)
    expect(updateItem.mock.calls.map(([item]) => item.id)).toEqual(["1", "2"])
    expect(updateItem.mock.calls[0][0]).toMatchObject({ id: "1", status: "done" })
    expect(toast.success).toHaveBeenCalledWith(
      "Updated",
      expect.objectContaining({ description: "2 records updated" })
    )
  })

  it("says how many records were updated and how many failed", async () => {
    const updateItem = vi.fn(async (item: any) => {
      if (String(item.id) === "2") throw new Error("refused")
      return { data: item }
    })
    renderList({ updateItem })
    await pickRows(2)

    fireEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", {
        name: "Set Status…",
      })
    )
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(toast.error).toHaveBeenCalledWith("1 updated, 1 failed")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("offers no button for a field with no options to pick from", async () => {
    renderList({ bulkActions: [{ field: "title" }] })
    await pickRows(1)

    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")
    expect(
      within(screen.getByRole("toolbar")).queryByRole("button", { name: /Set/ })
    ).toBeNull()
  })
})

describe("the grouped delete", () => {
  it("reports how many records were deleted and how many were not", async () => {
    const removeItem = vi.fn(async (item: any) => {
      if (String(item.id) === "3") throw new Error("refused")
      return undefined
    })
    renderList({ removeItem, bulkActions: ["delete"] })
    await pickRows(3)

    fireEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", { name: "Delete" })
    )
    const confirm = await screen.findByRole("alertdialog")
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(toast.error).toHaveBeenCalledWith("2 deleted, 1 could not be deleted")
  })
})

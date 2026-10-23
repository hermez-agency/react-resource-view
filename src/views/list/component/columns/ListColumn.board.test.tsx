import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { localStorageRepository } from "jsonld-repository"
import { createViewResource } from "@/utils/createViewResource"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { configurePorts, getPorts } from "@/ports"
import { ViewResourceContextParams } from "@/ViewResourceContext"
import { RowComponentPropsInterface } from "@/ViewResource"
import { layout, type BoardLayoutOptions } from "@/layout/layout"
import type {
  ListViewDefinition,
  Permission,
  PermissionKey,
  ReadViewDefinition,
  UpdateViewDefinition,
} from "@/ResourceDefinition"

const toast = vi.hoisted(() => vi.fn())
vi.mock("sonner", () => ({ toast, Toaster: () => null }))

/**
 * What a board does with its cards beyond showing them: open one, let the
 * controls drawn in it keep their clicks, select several and move them
 * together — by dragging one of them or through "Move to…".
 */

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
]

const onCta = vi.fn()

/** A card holding the controls a consumer's row component would draw. */
function TaskRow({ row }: RowComponentPropsInterface) {
  return (
    <div>
      <p>{row?.data?.title}</p>
      <button type="button" onClick={() => onCta(row?.data?.id)}>
        Assign <span>to me</span>
      </button>
      {/* jsdom cannot follow a link: the default is left out, nothing else. */}
      <a href="https://example.com/spec" onClick={(e) => e.preventDefault()}>
        Spec
      </a>
    </div>
  )
}

const navigate = vi.fn()
const originalNavigation = getPorts().navigation

function seed(id: string) {
  localStorage.setItem(
    id,
    JSON.stringify({
      "@id": id,
      "@type": "Collection",
      member: [
        ["1", "Roast", "todo"],
        ["2", "Pack", "todo"],
        ["3", "Label", "todo"],
        ["4", "Ship", "done"],
      ].map(([key, title, status]) => ({
        "@id": `/${id}/${key}`,
        "@type": id,
        id: key,
        title,
        status,
      })),
      totalItems: 4,
    })
  )
}

const readStatuses = (id: string) =>
  Object.fromEntries(
    (
      JSON.parse(localStorage.getItem(id) ?? "{}").member as Array<{
        title: string
        status: string
      }>
    ).map((task) => [task.title, task.status])
  )

function renderBoard(
  name: string,
  {
    board,
    list,
    read,
    update,
    updateItem,
    params,
    locked,
    unreadable,
    permissions,
  }: {
    board?: Partial<BoardLayoutOptions>
    /** `views.list`: `selectable`, `bulkActions`. */
    list?: Pick<ListViewDefinition, "selectable" | "bulkActions">
    /** Where a card opens: the record's `read` view. */
    read?: ReadViewDefinition
    update?: UpdateViewDefinition
    /** Titles of the tasks the resource refuses to update. */
    locked?: string[]
    /** Whether the records may not be read. */
    unreadable?: boolean
    /** Laid over the permissions above. */
    permissions?: Partial<Record<PermissionKey, Permission>>
    updateItem?: (item: any) => Promise<any>
    params?: Partial<ViewResourceContextParams>
  } = {}
) {
  const id = `${name}_tasks`
  seed(id)
  const tasks = createViewResource(id, {
    name: "Tasks",
    storage: "local",
    permissions: {
      create: false,
      delete: false,
      update: ({ item }) => !locked?.includes(item?.title),
      read: !unreadable,
      ...permissions,
    },
    repository: updateItem ? { updateItem } : undefined,
    form: { inputs: { title: { label: "Title" } } },
    views: {
      list: {
        layouts: [
          layout.board({
            groupBy: "status",
            columns: STATUSES,
            components: { row: TaskRow },
            ...board,
          }),
        ],
        ...list,
      },
      read: { title: "Task", ...read },
      update: { ...update },
    },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{ scope: name, resourceId: id, ...params }}
      configuration={{ resources: [tasks], defaultScope: name }}
    />
  )

  return id
}

const card = async (title: string) =>
  (await screen.findByText(title)).closest<HTMLElement>("[data-record-card]")!

const column = (label: string) =>
  screen.getByText(label, { selector: "header p" }).closest("header")!.parentElement!

beforeEach(() => {
  toast.mockClear()
  onCta.mockClear()
  navigate.mockClear()
  configurePorts({
    navigation: { ...originalNavigation, useNavigate: () => navigate },
  })
})

afterEach(() => {
  configurePorts({ navigation: originalNavigation })
  localStorage.clear()
})

describe("a click on a card", () => {
  it("opens the record in a drawer written into the URL", async () => {
    renderBoard("drawer_board", { read: { open: "drawer" } })

    fireEvent.click(await screen.findByText("Roast"))

    expect(navigate).toHaveBeenCalledWith({
      to: "/drawer_board/drawer_board_tasks/list/drawer_board_tasks/read/1?variant=board",
    })
  })

  it("opens a popup at the same kind of URL", async () => {
    renderBoard("popup_board", { read: { open: "dialog" } })

    fireEvent.click(await card("Pack"))

    expect(navigate).toHaveBeenCalledWith({
      to: "/popup_board/popup_board_tasks/list/popup_board_tasks/read/2?variant=board",
    })
  })

  it("goes to the record's own page when it opens in the window", async () => {
    renderBoard("window_board", { read: { open: "page" } })

    fireEvent.click(await screen.findByText("Roast"))

    expect(navigate).toHaveBeenCalledWith({
      to: "/window_board/window_board_tasks/read/1",
    })
  })

  it("opens with Enter, from the keyboard", async () => {
    renderBoard("keyboard_board", { read: { open: "drawer" } })

    const roast = await card("Roast")
    roast.focus()
    fireEvent.keyDown(roast, { key: "Enter" })

    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it("goes to the record's page when the read view says nothing", async () => {
    renderBoard("silent_board")

    fireEvent.click(await screen.findByText("Roast"))

    expect(navigate).toHaveBeenCalledWith({
      to: "/silent_board/silent_board_tasks/read/1",
    })
  })

  it("opens nothing when the record may not be read", async () => {
    renderBoard("unreadable_board", { read: { open: "drawer" }, unreadable: true })

    fireEvent.click(await screen.findByText("Roast"))

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe("the controls drawn in a card", () => {
  it("keep their click: the button runs, the card does not open", async () => {
    renderBoard("cta_board", { read: { open: "drawer" } })

    const roast = await card("Roast")
    // On the words inside the button, not the button itself: where a real
    // pointer lands.
    fireEvent.click(within(roast).getByText("to me"))

    expect(onCta).toHaveBeenCalledWith("1")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("keep their click: a link, or the selection checkbox", async () => {
    renderBoard("cta_link_board", { read: { open: "drawer" } })

    const roast = await card("Roast")
    fireEvent.click(within(roast).getByText("Spec"))
    fireEvent.click(within(roast).getByRole("checkbox"))

    expect(navigate).not.toHaveBeenCalled()
    expect(within(roast).getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })

  it("do not include the card's text being selected", async () => {
    renderBoard("text_board", { read: { open: "drawer" } })

    const title = await screen.findByText("Roast")
    const range = document.createRange()
    range.selectNodeContents(title)
    // jsdom keeps a single range, and ignores a second one added over it.
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    fireEvent.click(title)
    window.getSelection()!.removeAllRanges()

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe("selecting cards", () => {
  it("adds and removes with Ctrl/Cmd+click, and shows the bar", async () => {
    renderBoard("ctrl_board", { read: { open: "drawer" } })

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Ship"), { metaKey: true })

    expect(navigate).not.toHaveBeenCalled()
    const bar = screen.getByRole("toolbar")
    expect(bar).toHaveTextContent("2 selected")

    fireEvent.click(await card("Ship"), { ctrlKey: true })
    expect(bar).toHaveTextContent("1 selected")
  })

  it("selects a range of a column with Shift+click", async () => {
    renderBoard("shift_board")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Label"), { shiftKey: true })

    expect(screen.getByRole("toolbar")).toHaveTextContent("3 selected")
    expect(within(await card("Pack")).getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })

  it("empties with Escape, or with Deselect all", async () => {
    renderBoard("escape_board")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.keyDown(document.body, { key: "Escape" })
    expect(screen.queryByRole("toolbar")).toBeNull()

    fireEvent.click(await card("Pack"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Deselect all"))
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("can be turned off", async () => {
    renderBoard("unselectable_board", { list: { selectable: false } })

    const roast = await card("Roast")
    fireEvent.click(roast, { ctrlKey: true })

    expect(within(roast).queryByRole("checkbox")).toBeNull()
    expect(screen.queryByRole("toolbar")).toBeNull()
  })
})

describe("moving several cards at once", () => {
  it("neither drags nor moves a card whose record may not be updated", async () => {
    const id = renderBoard("locked_board", { locked: ["Roast"] })

    expect(await card("Roast")).toHaveAttribute("draggable", "false")
    expect(await card("Pack")).toHaveAttribute("draggable", "true")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Pack"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Move to…"))
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await waitFor(() => expect(readStatuses(id).Pack).toBe("done"))
    expect(readStatuses(id).Roast).toBe("todo")
  })

  it("moves the cards of a resource that allows moving them but not editing them", async () => {
    const id = renderBoard("move_only_board", {
      permissions: { update: false, move: true },
    })

    expect(await card("Roast")).toHaveAttribute("draggable", "true")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Move to…"))
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await waitFor(() => expect(readStatuses(id).Roast).toBe("done"))
  })

  it("neither drags nor moves a card when the resource refuses to move it", async () => {
    const id = renderBoard("no_move_board", { permissions: { move: false } })

    expect(await card("Roast")).toHaveAttribute("draggable", "false")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Move to…"))
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(readStatuses(id).Roast).toBe("todo")
    expect(toast).not.toHaveBeenCalled()
  })

  it("moves the selection through Move to…", async () => {
    const id = renderBoard("move_board")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Pack"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Move to…"))
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    // Drawn in their new column before the answers come back.
    expect(column("Done")).toContainElement(await card("Roast"))
    expect(column("Done")).toContainElement(await card("Pack"))

    await waitFor(() =>
      expect(readStatuses(id)).toMatchObject({ Roast: "done", Pack: "done" })
    )
    expect(readStatuses(id).Label).toBe("todo")
    expect(toast).toHaveBeenCalledWith("Saved")
    await waitFor(() => expect(screen.queryByRole("toolbar")).toBeNull())
  })

  it("moves the whole selection when one of its cards is dragged", async () => {
    const id = renderBoard("drag_board")

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Label"), { ctrlKey: true })

    const store: Record<string, string> = {}
    const setDragImage = vi.fn()
    const dataTransfer = {
      setData: (format: string, value: string) => (store[format] = value),
      getData: (format: string) => store[format] ?? "",
      setDragImage,
    }
    fireEvent.dragStart(await card("Label"), { dataTransfer })
    // What follows the pointer says how many cards are carried.
    expect(setDragImage.mock.calls[0][0]).toHaveTextContent("2 cards")
    fireEvent.dragOver(column("Doing"), { dataTransfer })
    fireEvent.drop(column("Doing"), { dataTransfer })

    await waitFor(() =>
      expect(readStatuses(id)).toMatchObject({
        Roast: "doing",
        Label: "doing",
        Pack: "todo",
      })
    )
  })

  it("moves the card alone when it is dragged from outside the selection", async () => {
    const id = renderBoard("alone_board")

    fireEvent.click(await card("Roast"), { ctrlKey: true })

    const store: Record<string, string> = {}
    const dataTransfer = {
      setData: (format: string, value: string) => (store[format] = value),
      getData: (format: string) => store[format] ?? "",
    }
    fireEvent.dragStart(await card("Pack"), { dataTransfer })
    fireEvent.drop(column("Done"), { dataTransfer })

    await waitFor(() => expect(readStatuses(id).Pack).toBe("done"))
    expect(readStatuses(id).Roast).toBe("todo")
  })

  it("puts back the cards that could not be moved, and says so", async () => {
    const name = "partial_board"
    const repository = localStorageRepository({ path: `${name}_tasks` })
    let rejectPack: (reason: Error) => void = () => {}
    const id = renderBoard(name, {
      updateItem: (item) =>
        item.id === "2"
          ? new Promise((_, reject) => (rejectPack = reject))
          : repository.updateItem(item),
    })
    vi.spyOn(console, "error").mockImplementation(() => {})

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Pack"), { ctrlKey: true })
    fireEvent.click(screen.getByText("Move to…"))
    fireEvent.click(await screen.findByRole("button", { name: "Done" }))

    // Optimistic: both are in Done while the answers are on their way.
    expect(column("Done")).toContainElement(await card("Pack"))

    await act(async () => rejectPack(new Error("409 Conflict")))

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("1 of 2 cards could not be moved", {
        description: "They are back in their column.",
      })
    )
    await waitFor(() =>
      expect(column("To do")).toContainElement(screen.getByText("Pack"))
    )
    await waitFor(() => expect(readStatuses(id).Roast).toBe("done"))
    // The card left behind is still selected: trying again is one click away.
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")
  })

  it("offers the view's bulk actions on the selection", async () => {
    const onAction = vi.fn()
    renderBoard("bulk_board", {
      list: { bulkActions: [{ label: "Archive", onAction }] },
    })

    fireEvent.click(await card("Roast"), { ctrlKey: true })
    fireEvent.click(await card("Ship"), { ctrlKey: true })
    fireEvent.click(screen.getByRole("button", { name: "Archive" }))

    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1))
    expect(onAction.mock.calls[0][0].map((task: any) => task.title)).toEqual([
      "Roast",
      "Ship",
    ])
    await waitFor(() => expect(screen.queryByRole("toolbar")).toBeNull())
  })
})

describe("the record opened from a card", () => {
  const openedAt = {
    childViewResource: {
      resourceId: "",
      resourceAction: "read",
      id: "1",
    },
  } as const

  it("is drawn in a drawer with a way to edit it", async () => {
    renderBoard("open_drawer_board", {
      read: { open: "drawer" },
      params: {
        childViewResource: {
          ...openedAt.childViewResource,
          resourceId: "open_drawer_board_tasks",
        } as ViewResourceContextParams,
      },
    })

    const panel = await screen.findByRole("dialog")
    expect(panel).toHaveAttribute("data-slot", "drawer-popup")
    expect(within(panel).getByText("Task")).toBeInTheDocument()
    // The form opens where `views.update.open` says: its page, here.
    expect(within(panel).getByRole("link", { name: /update/i })).toHaveAttribute(
      "href",
      "/open_drawer_board/open_drawer_board_tasks/update/1"
    )
  })

  it("edits the record over the board when the form opens over it", async () => {
    renderBoard("edit_over_board", {
      read: { open: "drawer" },
      update: { open: "drawer" },
      params: {
        childViewResource: {
          ...openedAt.childViewResource,
          resourceId: "edit_over_board_tasks",
        } as ViewResourceContextParams,
      },
    })

    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByRole("link", { name: /update/i })).toHaveAttribute(
      "href",
      "/edit_over_board/edit_over_board_tasks/list/edit_over_board_tasks/update/1?variant=board"
    )
  })

  it("links to the record's full page, in the board's scope", async () => {
    renderBoard("expand_board", {
      read: { open: "drawer" },
      params: {
        childViewResource: {
          ...openedAt.childViewResource,
          resourceId: "expand_board_tasks",
        } as ViewResourceContextParams,
      },
    })

    const panel = await screen.findByRole("dialog")
    expect(
      within(panel).getByRole("link", { name: "Open in full page" })
    ).toHaveAttribute("href", "/expand_board/expand_board_tasks/read/1")
  })

  it("does not link to it when the read view says `expandable: false`", async () => {
    renderBoard("no_expand_board", {
      read: { open: "dialog", expandable: false },
      params: {
        childViewResource: {
          ...openedAt.childViewResource,
          resourceId: "no_expand_board_tasks",
        } as ViewResourceContextParams,
      },
    })

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).queryByRole("link", { name: "Open in full page" })
    ).toBeNull()
  })

  it("is drawn in a centred dialog in popup mode, and closes to the board", async () => {
    renderBoard("open_popup_board", {
      read: { open: "dialog" },
      params: {
        childViewResource: {
          ...openedAt.childViewResource,
          resourceId: "open_popup_board_tasks",
        } as ViewResourceContextParams,
      },
    })

    const dialog = await screen.findByRole("dialog")
    expect(dialog).not.toHaveAttribute("data-slot", "drawer-popup")

    fireEvent.click(within(dialog).getByRole("button", { name: /fermer|close/i }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/open_popup_board/open_popup_board_tasks/list?variant=board",
      })
    )
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { ListViewDefinition, Repository } from "@/ResourceDefinition"
import { ApiRequestError } from "@/api/apiRequestError"
import { nextSortDirection } from "@/views/list/sort/useSort"
import { isListSelectable } from "@/views/list/selection/useListSelection"
import {
  columnPreferencesKey,
  readColumnPreferences,
} from "@/views/list/component/table/columnPreferences"

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
)
vi.mock("sonner", () => ({ toast, Toaster: () => null }))

/**
 * What a list does besides drawing its rows: sort them by a column, select
 * some and act on them together, and say so when they could not be loaded.
 */
interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
  author: string
}

const ARTICLES: Article[] = [
  ["1", "Roast", "Ada"],
  ["2", "Pack", "Linus"],
  ["3", "Ship", "Grace"],
].map(([id, title, author]) => ({
  "@id": `/api/articles/${id}`,
  "@type": "Article",
  id,
  title,
  author,
}))

const page = (members: Article[]) => ({
  data: {
    "@id": "/api/articles",
    "@type": "Collection",
    member: members,
    totalItems: members.length,
  } as any,
})

let counter = 0

function renderList(
  list: ListViewDefinition<Article>,
  repository: Partial<Repository<Article>> = {}
) {
  const id = `features_${++counter}`
  const getCollection = vi.fn(
    repository.getCollection ?? (async () => page(ARTICLES))
  )
  const articles = createViewResource<Article>(id, {
    name: "Articles",
    storage: "local",
    repository: { ...repository, getCollection },
    form: { inputs: { title: { label: "Title" }, author: { label: "Author" } } },
    views: { list },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [articles], defaultScope: id }}
    />
  )

  return { getCollection, id }
}

const lastQuery = (getCollection: ReturnType<typeof vi.fn>) =>
  getCollection.mock.calls.at(-1)?.[0]

beforeEach(() => {
  // The sort lives in the URL: start every test on a clean one.
  window.history.replaceState(null, "", "/")
  toast.mockClear()
  toast.success.mockClear()
  toast.error.mockClear()
})

describe("sorting a list", () => {
  it("goes ascending, descending, then back to no sort", () => {
    expect(nextSortDirection(undefined)).toBe("asc")
    expect(nextSortDirection("asc")).toBe("desc")
    expect(nextSortDirection("desc")).toBeUndefined()
  })

  it("asks the API for the column clicked, in the direction shown", async () => {
    const { getCollection } = renderList({
      layouts: [layout.table()],
      sort: { fields: ["title"] },
    })

    const header = await screen.findByRole("columnheader", { name: /Title/ })
    expect(header).toHaveAttribute("aria-sort", "none")
    // Only the declared fields can be sorted by.
    expect(
      within(screen.getByRole("columnheader", { name: "Author" })).queryByRole(
        "button"
      )
    ).toBeNull()

    fireEvent.click(within(header).getByRole("button"))
    await waitFor(() =>
      expect(lastQuery(getCollection)?.order).toEqual({ title: "asc" })
    )
    expect(header).toHaveAttribute("aria-sort", "ascending")

    fireEvent.click(within(header).getByRole("button"))
    await waitFor(() =>
      expect(lastQuery(getCollection)?.order).toEqual({ title: "desc" })
    )

    fireEvent.click(within(header).getByRole("button"))
    await waitFor(() => expect(lastQuery(getCollection)?.order).toBeUndefined())
  })

  it("queues the columns clicked with Shift, in order, and ranks them", async () => {
    const { getCollection } = renderList({
      layouts: [layout.table()],
      sort: { fields: ["title", "author"] },
    })

    const title = await screen.findByRole("columnheader", { name: /Title/ })
    const author = screen.getByRole("columnheader", { name: /Author/ })

    fireEvent.click(within(title).getByRole("button"))
    await waitFor(() => expect(title).toHaveAttribute("aria-sort", "ascending"))
    fireEvent.click(within(author).getByRole("button"), { shiftKey: true })
    await waitFor(() =>
      expect(Object.entries(lastQuery(getCollection)?.order ?? {})).toEqual([
        ["title", "asc"],
        ["author", "asc"],
      ])
    )
    expect(title).toHaveTextContent("1")
    expect(author).toHaveTextContent("2")

    // The first column turns around without losing its rank.
    fireEvent.click(within(title).getByRole("button"), { shiftKey: true })
    await waitFor(() =>
      expect(Object.entries(lastQuery(getCollection)?.order ?? {})).toEqual([
        ["title", "desc"],
        ["author", "asc"],
      ])
    )

    // A plain click starts over with that column alone.
    fireEvent.click(within(author).getByRole("button"))
    await waitFor(() =>
      expect(lastQuery(getCollection)?.order).toEqual({ author: "desc" })
    )
  })

  it("opens on the initial sort", async () => {
    const { getCollection } = renderList({
      layouts: [layout.table()],
      sort: { fields: ["title"], initial: { title: "desc" } },
    })

    await waitFor(() =>
      expect(getCollection.mock.calls[0]?.[0]?.order).toEqual({ title: "desc" })
    )
    expect(
      await screen.findByRole("columnheader", { name: /Title/ })
    ).toHaveAttribute("aria-sort", "descending")
  })
})

describe("selecting records", () => {
  it("is offered on a board, or where bulk actions are declared", () => {
    expect(isListSelectable(undefined, "table", 0)).toBe(false)
    expect(isListSelectable(undefined, "table", 1)).toBe(true)
    expect(isListSelectable(undefined, "board", 0)).toBe(true)
    expect(isListSelectable(false, "board", 1)).toBe(false)
  })

  it("draws no checkbox on a list with nothing to do with a selection", async () => {
    renderList({ layouts: [layout.table()] })

    await screen.findByText("Roast")
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("runs a bulk action on the rows checked in a table", async () => {
    const onAction = vi.fn()
    renderList({
      layouts: [layout.table()],
      bulkActions: [{ label: "Archive", onAction }],
    })

    await screen.findByText("Roast")
    const [, roast, , ship] = screen.getAllByRole("checkbox")
    fireEvent.click(roast)
    fireEvent.click(ship)

    const toolbar = screen.getByRole("toolbar")
    expect(toolbar).toHaveTextContent("2 selected")
    fireEvent.click(within(toolbar).getByRole("button", { name: "Archive" }))

    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1))
    expect(onAction.mock.calls[0][0].map((a: Article) => a.title)).toEqual([
      "Roast",
      "Ship",
    ])
    await waitFor(() => expect(screen.queryByRole("toolbar")).toBeNull())
  })

  it("selects the whole page from the header, and none from it again", async () => {
    renderList({ layouts: [layout.table()], selectable: true })

    await screen.findByText("Roast")
    const all = screen.getByRole("checkbox", { name: "Select all" })
    fireEvent.click(all)
    expect(screen.getByRole("toolbar")).toHaveTextContent("3 selected")

    fireEvent.click(all)
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("selects cards too", async () => {
    // A row of one's own: the default one resolves the IRIs it is shown.
    const row = ({ row }: { row?: { data: Article } }) => <p>{row?.data.title}</p>
    renderList({
      layouts: [layout.cards({ components: { row } })],
      selectable: true,
    })

    await screen.findByText("Roast")
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select" })[1])
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")
  })

  it("deletes the selection after a confirmation", async () => {
    const removeItem = vi.fn(async () => ({}))
    renderList(
      { layouts: [layout.table()], bulkActions: ["delete"] },
      { removeItem }
    )

    await screen.findByText("Roast")
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    fireEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", { name: "Delete" })
    )

    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent("Delete 3 records?")
    expect(removeItem).not.toHaveBeenCalled()
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(removeItem).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })
})

describe("a list that could not be loaded", () => {
  it("says what the API answered, and loads again on request", async () => {
    let fail = true
    const { getCollection } = renderList(
      { layouts: [layout.table()] },
      {
        getCollection: async () => {
          if (fail) {
            throw new ApiRequestError({
              status: 503,
              url: "/api/articles",
              payload: {
                title: "Unavailable",
                detail: "The API is down for maintenance",
              },
            })
          }
          return page(ARTICLES)
        },
      }
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The data could not be loaded")
    expect(alert).toHaveTextContent("The API is down for maintenance")
    // Not mistaken for an empty list.
    expect(screen.queryByText("No results yet")).toBeNull()

    fail = false
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))

    expect(await screen.findByText("Roast")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(getCollection).toHaveBeenCalledTimes(2)
  })

  it("draws the view's own error component", async () => {
    renderList(
      {
        layouts: [layout.table()],
        components: { error: ({ retry }) => <button onClick={retry}>Oops</button> },
      },
      {
        getCollection: async () => {
          throw new Error("offline")
        },
      }
    )

    expect(await screen.findByRole("button", { name: "Oops" })).toBeInTheDocument()
  })
})

describe("a table wider than the screen", () => {
  it("pins the row actions to the right, header included", async () => {
    renderList({ layouts: [layout.table()] })

    await screen.findAllByRole("row")
    const cells = document.querySelectorAll("[data-slot=row-actions]")
    expect(cells.length).toBe(ARTICLES.length)
    cells.forEach((cell) => expect(cell.className).toContain("sticky right-0"))
    const headers = screen.getAllByRole("columnheader")
    expect(headers.at(-1)?.className).toContain("sticky right-0")
    expect(headers.at(0)?.className).not.toContain("sticky")
  })

  it("leaves the actions in the flow with stickyActions: false", async () => {
    renderList({ layouts: [layout.table({ stickyActions: false })] })

    await screen.findAllByRole("row")
    document
      .querySelectorAll("[data-slot=row-actions]")
      .forEach((cell) => expect(cell.className).not.toContain("sticky"))
    expect(screen.getAllByRole("columnheader").at(-1)?.className).not.toContain(
      "sticky"
    )
  })

  it("pins the first column on demand", async () => {
    renderList({ layouts: [layout.table({ stickyFirstColumn: true })] })

    await screen.findAllByRole("row")
    expect(screen.getAllByRole("columnheader").at(0)?.className).toContain(
      "sticky left-0"
    )
  })
})

describe("choosing a table's columns", () => {
  const headers = () =>
    screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent)
      .filter(Boolean)
  const firstRowCells = () =>
    within(screen.getAllByRole("row")[1])
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
      .filter(Boolean)

  const openMenu = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Properties" }))
    return screen.findByRole("list", { name: "Properties" })
  }

  it("hides a column, in the header and the rows, and remembers it", async () => {
    const { id } = renderList({ layouts: [layout.table()] })
    await screen.findAllByRole("row")
    expect(headers()).toEqual(["Title", "Author"])

    const menu = await openMenu()
    fireEvent.click(within(menu).getAllByRole("checkbox")[1])

    await waitFor(() => expect(headers()).toEqual(["Title"]))
    expect(firstRowCells()).not.toContain("Ada")
    expect(readColumnPreferences(columnPreferencesKey(id, "table"))).toEqual({
      order: ["title", "author"],
      hidden: ["author"],
    })
  })

  it("reorders the columns by dragging one onto another", async () => {
    renderList({ layouts: [layout.table()] })
    await screen.findAllByRole("row")

    const items = within(await openMenu()).getAllByRole("listitem")
    fireEvent.dragStart(items[1], { dataTransfer: { setData: () => {} } })
    fireEvent.dragOver(items[0], { dataTransfer: {} })
    fireEvent.drop(items[0], { dataTransfer: {} })

    await waitFor(() => expect(headers()).toEqual(["Author", "Title"]))
    expect(firstRowCells().slice(0, 2)).toEqual(["Ada", "Roast"])
  })

  it("opens on the columns left last time, per resource and layout", async () => {
    const id = `features_${counter + 1}`
    window.localStorage.setItem(
      columnPreferencesKey(id, "table"),
      JSON.stringify({ order: ["author", "title"], hidden: [] })
    )
    renderList({ layouts: [layout.table()] })
    await screen.findAllByRole("row")

    expect(headers()).toEqual(["Author", "Title"])
  })

  it("goes back to the declaration on reset", async () => {
    const { id } = renderList({ layouts: [layout.table()] })
    await screen.findAllByRole("row")

    const menu = await openMenu()
    expect(screen.queryByRole("button", { name: "Reset to default" })).toBeNull()
    fireEvent.click(within(menu).getAllByRole("checkbox")[0])
    await waitFor(() => expect(headers()).toEqual(["Author"]))

    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }))

    await waitFor(() => expect(headers()).toEqual(["Title", "Author"]))
    expect(readColumnPreferences(columnPreferencesKey(id, "table"))).toBeNull()
  })
})

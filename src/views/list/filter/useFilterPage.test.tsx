import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

const setFilter = vi.fn()

const resource = {
  "@id": "tasks",
  views: {
    list: {
      filters: {
        inputs: {
          title: { label: "Search", type: "text" },
          status: { label: "Status", type: "text" },
        },
      },
    },
  },
}

const filter = { status: "todo", page: 2 }

// Le contexte est sur la page 2 d'une liste déjà filtrée par statut.
vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({
    resource,
    filter,
    setFilter,
  }),
}))

const { default: useFilter } = await import("@/views/list/filter/useFilter")

describe("useFilter page", () => {
  beforeEach(() => setFilter.mockClear())

  it("goes back to the first page when a filter changes", () => {
    const { result } = renderHook(() => useFilter({}))

    act(() => {
      result.current.formContext.onChange({ name: "title", value: "the" } as any)
    })

    // Sans cela la requête part avec `page: 2`, et une recherche de moins
    // d'une page affiche une liste vide sans pagination pour revenir.
    expect(setFilter).toHaveBeenLastCalledWith({ status: "todo", title: "the" })
    expect(result.current.filter).not.toHaveProperty("page")
  })

  it("changes the page without touching the other filters", () => {
    const { result } = renderHook(() => useFilter({}))

    act(() => {
      result.current.updateFilter({ page: 3 })
    })

    expect(setFilter).toHaveBeenLastCalledWith({ status: "todo", page: 3 })
  })
})

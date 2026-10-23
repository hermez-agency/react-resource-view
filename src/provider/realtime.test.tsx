import { describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { jsonLdDialect } from "@/api/dialect/jsonLdDialect"
import type { ApiDialectInterface } from "@/api/apiDialectInterface"
import { createViewResource, layout, ResourceViewProvider } from "@/index"

let count = 0

function renderList(
  realtime: Parameters<typeof createViewResource>[1]["realtime"],
  dialect?: ApiDialectInterface
) {
  const id = `realtime_tasks_${++count}`
  const getCollection = vi.fn(async () => ({
    data: {
      "@id": "/api/tasks",
      "@type": "Collection",
      member: [{ "@id": `/api/${id}/1`, id: "1", title: "Roast" }],
      totalItems: 1,
    } as never,
  }))
  const tasks = createViewResource(id, {
    name: "Tasks",
    repository: {
      getCollection,
      getItem: async () => ({ data: {} as never }),
      updateItem: async () => ({ data: {} as never }),
      createItem: async () => ({ data: {} as never }),
      removeItem: async () => ({ data: {} as never }),
    },
    form: { inputs: { title: { label: "Title" } } },
    realtime,
    dialect,
    views: { list: { layouts: [layout.table()] } },
  })

  const view = render(
    <ResourceViewProvider
      viewResourceContextParams={{ scope: id, resourceId: id }}
      configuration={{ resources: [tasks], defaultScope: id }}
    />
  )
  return { ...view, getCollection }
}

describe("realtime.subscribe", () => {
  it("is taken when the views mount and let go when they unmount", async () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const { unmount } = renderList({ subscribe })
    await screen.findByText("Roast")

    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("reads the list again each time it calls refresh", async () => {
    let refresh = () => {}
    const { getCollection } = renderList({
      subscribe: (r) => {
        refresh = r
      },
    })
    await screen.findByText("Roast")
    const before = getCollection.mock.calls.length

    await act(async () => refresh())

    expect(getCollection.mock.calls.length).toBe(before + 1)
  })

  it("takes the dialect's channel for `realtime: true`, and not when it is off", async () => {
    const subscribe = vi.fn()
    const dialect = { ...jsonLdDialect(), realtimeSubscribe: () => subscribe }
    renderList(true, dialect)
    renderList(false, dialect)
    await screen.findAllByText("Roast")

    expect(subscribe).toHaveBeenCalledTimes(1)
  })
})

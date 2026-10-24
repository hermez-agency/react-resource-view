import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { createViewResource } from "@/utils/createViewResource"
import { createResourceCollection } from "@/api/collectionShape"
import { getCollectionItems, getCollectionTotal } from "@/api/collection"
import getIdFromObject from "@/internal/id/getIdFromObject"
import type {
  RepositoryCollection,
  RepositoryDefinition,
} from "@/ResourceDefinition"

type Task = { id: string; title: string }

describe("a hand-written repository", () => {
  it("accepts { items, totalItems } without a cast, and the helper's envelope too", () => {
    expectTypeOf<{ items: Task[]; totalItems: number }>().toExtend<
      RepositoryCollection<Task>
    >()
    expectTypeOf<ReturnType<typeof createResourceCollection<Task>>>().toExtend<
      RepositoryCollection<Task>
    >()
    expectTypeOf<{ data: { items: Task[] } }>().toExtend<
      Awaited<ReturnType<RepositoryDefinition<Task>["getCollection"]>>
    >()
  })

  it("gives the views the rows and the total of { items, totalItems }", async () => {
    const tasks = createViewResource<Task>("/api/tasks_shape", {
      path: "/api/tasks_shape",
      idField: "id",
      repository: {
        getCollection: async () => ({
          data: { items: [{ id: "a", title: "A" }], totalItems: 42 },
        }),
      },
    })

    const { data } = await tasks.getCollection()

    expect(getCollectionItems(data)).toEqual([{ id: "a", title: "A" }])
    expect(getCollectionTotal(data)).toBe(42)
  })

  it("always receives { id } as a string, whatever the form it was asked with", async () => {
    const getItem = vi.fn(async (_params: { id: string }) => ({
      data: { id: "7", title: "T" },
    }))
    const removeItem = vi.fn(async (_params: { id: string }) => undefined)
    const updateItem = vi.fn(async (item: Partial<Task>) => ({ data: item as Task }))
    const tasks = createViewResource<Task>("/api/tasks_ids", {
      path: "/api/tasks_ids",
      repository: { getItem, removeItem, updateItem },
    })

    await tasks.getItem({ id: "7" } as never)
    await tasks.getItem({ "@id": "/api/tasks/7" } as never)
    await tasks.getItem({ id: "/api/tasks/7" } as never)
    await tasks.removeItem({ "@id": "/api/tasks/7", title: "T" } as never)
    await tasks.removeItem({ id: 7 } as never)
    await tasks.updateItem({ "@id": "/api/tasks/7", title: "U" } as never)

    getItem.mock.calls.forEach(([params]) => expect(params).toEqual({ id: "7" }))
    removeItem.mock.calls.forEach(([params]) => expect(params).toEqual({ id: "7" }))
    expect(updateItem.mock.calls[0][0]).toMatchObject({ id: "7", title: "U" })
  })

  it("takes the id from idField when it is declared", async () => {
    const removeItem = vi.fn(async (_params: { id: string }) => undefined)
    const tasks = createViewResource<any>("/api/tasks_field", {
      path: "/api/tasks_field",
      idField: "uuid",
      repository: { removeItem },
    })

    await tasks.removeItem({ uuid: "abc", id: 3 } as never)

    expect(removeItem).toHaveBeenCalledWith({ id: "abc" }, expect.anything())
  })
})

describe("idField", () => {
  it("identifies a record without @id, in both forms", () => {
    const resource = { idField: "uuid" }
    const record: any = { uuid: "abc", id: 3 }

    expect(getIdFromObject(record, false, resource)).toBe("abc")
    expect(getIdFromObject(record, true, resource)).toBe("abc")
  })

  it("falls back to the dialect when the record lacks the field", () => {
    expect(getIdFromObject({ id: 3 } as never, false, { idField: "uuid" })).toBe("3")
  })
})

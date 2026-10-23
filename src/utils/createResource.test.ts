import { beforeEach, describe, expect, it, vi } from "vitest"
import { createViewResource } from "./createViewResource"
import { ActionList } from "react-data-form"

// --- Mocks ---

const { mockPublish, mockPubSub } = vi.hoisted(() => {
  const mockPublish = vi.fn()
  const mockPubSub = { publish: mockPublish, subscribe: vi.fn() }
  return { mockPublish, mockPubSub }
})

const mockHttpRepo = {
  getCollection: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  replaceItem: vi.fn(),
}

const mockLocalStorageRepo = {
  getCollection: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  replaceItem: vi.fn(),
}
// Both repositories now live in one package, so they share a single mock.
vi.mock("jsonld-repository", () => ({
  httpRepository: () => mockHttpRepo,
  localStorageRepository: () => mockLocalStorageRepo,
}))

vi.mock("coooking-pubsub", () => ({
  createPubSub: () => mockPubSub,
}))

const context = { viewResourceContext: { resourceId: "my_items" } } as any

// --- Tests ---

describe("createViewResource", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("basic construction", () => {
    it('sets @type to "view-resource"', () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })
      expect(resource["@type"]).toBe("view-resource")
    })

    it("derives the name from @id when none is given", () => {
      const resource = createViewResource("/api/my_items", { path: "/api/my_items" })
      expect(resource.name).toBe("my_items")
    })

    it("keeps the given name", () => {
      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        name: "Mes Éléments",
      })
      expect(resource.name).toBe("Mes Éléments")
    })

    it("creates an onChange through createPubSub", () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })
      expect(resource.onChange).toBe(mockPubSub)
    })

    it("keeps the declaration as it was written", () => {
      const definition = { path: "/api/my_items", realtime: true }
      const resource = createViewResource("my_items", definition)
      expect(resource.definition).toBe(definition)
      expect(resource.realtime).toBe(true)
    })
  })

  describe("views", () => {
    it("creates a view for every action", () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })
      Object.values(ActionList).forEach((action) => {
        expect(resource.views[action].action).toBe(action)
      })
    })

    it("titles each view after the resource, the forms after their action", () => {
      const resource = createViewResource("my_items", {
        name: "Coffee beans",
        path: "/api/my_items",
      })

      expect(resource.views.list.title).toBe("Coffee beans")
      expect(resource.views.read.title).toBe("Coffee beans")
      expect(resource.views.create.title).toBe("Create — Coffee beans")
      expect(resource.views.update.title).toBe("Edit — Coffee beans")
      expect(resource.views.delete.title).toBe("Delete — Coffee beans")
    })

    it("leaves a title the action declares alone", () => {
      const resource = createViewResource("my_items", {
        name: "Coffee beans",
        path: "/api/my_items",
        views: { update: { title: "Reprice a bag" } },
      })

      expect(resource.views.update.title).toBe("Reprice a bag")
      expect(resource.views.list.title).toBe("Coffee beans")
    })

    it("opens the forms on a page and the deletion in a dialog by default", () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })

      expect(resource.views.read.open).toMatchObject({
        type: "page",
        placement: "page",
      })
      expect(resource.views.create.open.type).toBe("page")
      expect(resource.views.update.open.type).toBe("page")
      expect(resource.views.delete.open).toMatchObject({
        type: "dialog",
        placement: "overlay",
      })
    })

    it("lists in a table when no layout is declared", () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })

      expect(resource.views.list.layouts.map((layout) => layout.type)).toEqual([
        "table",
      ])
      expect(resource.views.update.layouts).toEqual([])
    })

    it("offers update and delete on a row by default", () => {
      const resource = createViewResource("my_items", { path: "/api/my_items" })

      expect(resource.views.list.rowActions).toEqual(["update", "delete"])
    })
  })

  describe("repository selection", () => {
    it("uses httpRepository when a path is given", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })
      const resource = createViewResource("my_items", { path: "/api/my_items" })
      await resource.getCollection()
      expect(mockHttpRepo.getCollection).toHaveBeenCalled()
    })

    it('uses localStorageRepository with `storage: "local"`', async () => {
      mockLocalStorageRepo.getCollection.mockResolvedValue({ data: { member: [] } })
      const resource = createViewResource("my_items", { storage: "local" })
      await resource.getCollection()
      expect(mockLocalStorageRepo.getCollection).toHaveBeenCalled()
    })

    it("replaces the calls a `repository` declares, and keeps the others", async () => {
      mockHttpRepo.getItem.mockResolvedValue({ data: {} })
      const getCollection = vi.fn(async () => ({ data: { member: [] } as any }))
      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        repository: { getCollection },
      })

      await resource.getCollection()
      await resource.getItem({ id: "1" })

      expect(getCollection).toHaveBeenCalled()
      expect(mockHttpRepo.getCollection).not.toHaveBeenCalled()
      expect(mockHttpRepo.getItem).toHaveBeenCalled()
    })

    it("needs no data source for a resource made of a screen of its own", async () => {
      const resource = createViewResource("my_page", {
        components: { view: () => null },
      })

      const { data } = await resource.getCollection()
      expect(data.member).toEqual([])
      await expect(resource.createItem({})).rejects.toThrow("no data source")
    })
  })

  describe("hooks.beforeList", () => {
    it("reshapes the query, with the view context", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })
      const beforeList = vi.fn((params: any) => ({ ...params, extra: true }))

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { beforeList },
      })
      await resource.getCollection({ page: 1 }, context)

      expect(beforeList).toHaveBeenCalledWith({ page: 1 }, context)
      expect(mockHttpRepo.getCollection).toHaveBeenCalledWith(
        expect.objectContaining({ extra: true }),
        context
      )
    })

    it("may answer asynchronously", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })
      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { beforeList: async (params) => ({ ...params, tenant: "a" }) },
      })
      await resource.getCollection({ page: 1 })

      expect(mockHttpRepo.getCollection).toHaveBeenCalledWith(
        { page: 1, tenant: "a" },
        {}
      )
    })

    it("merges the context's filter into the params", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })

      const resource = createViewResource("my_items", { path: "/api/my_items" })
      const filtered = {
        viewResourceContext: { filter: { status: "active" } },
      } as any
      await resource.getCollection({ page: 1 }, filtered)

      expect(mockHttpRepo.getCollection).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: "active" }),
        filtered
      )
    })

    it("lets the hook rename a filter key", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: {
          beforeList: ({ search, ...rest }: any) => ({ ...rest, q: search }),
        },
      })
      const filtered = { viewResourceContext: { filter: { search: "x" } } } as any
      await resource.getCollection({}, filtered)

      expect(mockHttpRepo.getCollection).toHaveBeenCalledWith({ q: "x" }, filtered)
    })

    it("lets the hook remove a filter key", async () => {
      mockHttpRepo.getCollection.mockResolvedValue({ data: { member: [] } })

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: {
          beforeList: ({ secret: _secret, ...rest }: any) => rest,
        },
      })
      const filtered = {
        viewResourceContext: { filter: { status: "active", secret: "s" } },
      } as any
      await resource.getCollection({}, filtered)

      expect(mockHttpRepo.getCollection).toHaveBeenCalledWith(
        { status: "active" },
        filtered
      )
    })
  })

  describe("hooks.beforeRead", () => {
    it("reshapes the identifier, with the view context", async () => {
      mockHttpRepo.getItem.mockResolvedValue({ data: { "@id": "/api/my_items/1" } })
      const beforeRead = vi.fn((params: any) => ({ ...params, enriched: true }))

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { beforeRead },
      })
      await resource.getItem({ "@id": "/api/my_items/1" }, context)

      expect(beforeRead).toHaveBeenCalledWith({ "@id": "/api/my_items/1" }, context)
      expect(mockHttpRepo.getItem).toHaveBeenCalledWith(
        expect.objectContaining({ enriched: true }),
        context
      )
    })
  })

  describe("deletion", () => {
    it("publishes onChange with the deleted record", async () => {
      mockHttpRepo.removeItem.mockResolvedValue({})
      const params = { "@id": "/api/my_items/1" }

      const resource = createViewResource("my_items", { path: "/api/my_items" })
      await resource.removeItem(params)

      expect(mockPublish).toHaveBeenCalledWith({
        data: params,
        action: ActionList.delete,
      })
    })

    it("runs beforeDelete and afterDelete around the call", async () => {
      const calls: string[] = []
      mockHttpRepo.removeItem.mockImplementation(async () => calls.push("remove"))
      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: {
          beforeDelete: (item) => {
            calls.push("before")
            return { ...item, reason: "duplicate" }
          },
          afterDelete: (item, hookContext) => {
            calls.push(
              `after ${item.reason} ${hookContext.viewResourceContext?.resourceId}`
            )
          },
        },
      })

      await resource.removeItem({ "@id": "/api/my_items/1" }, context)

      expect(calls).toEqual(["before", "remove", "after duplicate my_items"])
      expect(mockHttpRepo.removeItem).toHaveBeenCalledWith(
        { "@id": "/api/my_items/1", reason: "duplicate" },
        context
      )
    })
  })

  describe("update", () => {
    it("publishes onChange with what the API answered", async () => {
      const updatedItem = { "@id": "/api/my_items/1", name: "updated" }
      mockHttpRepo.updateItem.mockResolvedValue({ data: updatedItem })

      const resource = createViewResource("my_items", { path: "/api/my_items" })
      await resource.updateItem({ "@id": "/api/my_items/1", name: "updated" })

      expect(mockPublish).toHaveBeenCalledWith({
        data: updatedItem,
        action: ActionList.update,
      })
    })

    // 0.x called `updateItem(payload)` without its context once `preUpdate`
    // had run: a repository reading the view it was called from got nothing.
    it("hands the view context to beforeUpdate and to the repository", async () => {
      const updatedItem = { "@id": "/api/my_items/1", name: "updated" }
      mockHttpRepo.updateItem.mockResolvedValue({ data: updatedItem })
      const beforeUpdate = vi.fn((p: any) => ({ ...p, transformed: true }))

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { beforeUpdate },
      })
      await resource.updateItem({ "@id": "/api/my_items/1" }, context)

      expect(beforeUpdate).toHaveBeenCalledWith(
        { "@id": "/api/my_items/1" },
        context
      )
      expect(mockHttpRepo.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({ transformed: true }),
        context
      )
    })

    it("tells afterSave what was saved, and how", async () => {
      const updatedItem = { "@id": "/api/my_items/1", name: "updated" }
      mockHttpRepo.updateItem.mockResolvedValue({ data: updatedItem })
      const afterSave = vi.fn()

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { afterSave },
      })
      await resource.updateItem({ "@id": "/api/my_items/1" }, context)

      expect(afterSave).toHaveBeenCalledWith(updatedItem, {
        ...context,
        action: "update",
      })
    })
  })

  describe("creation", () => {
    it("publishes onChange with what the API answered", async () => {
      const createdItem = { "@id": "/api/my_items/2", name: "new" }
      mockHttpRepo.createItem.mockResolvedValue({ data: createdItem })

      const resource = createViewResource("my_items", { path: "/api/my_items" })
      await resource.createItem({ name: "new" })

      expect(mockPublish).toHaveBeenCalledWith({
        data: createdItem,
        action: ActionList.create,
      })
    })

    // Same bug as the update's, on the way to `createItem`.
    it("hands the view context to beforeCreate and to the repository", async () => {
      const createdItem = { "@id": "/api/my_items/2", name: "new" }
      mockHttpRepo.createItem.mockResolvedValue({ data: createdItem })
      const beforeCreate = vi.fn((p: any) => ({ ...p, enriched: true }))

      const resource = createViewResource("my_items", {
        path: "/api/my_items",
        hooks: { beforeCreate },
      })
      await resource.createItem({ name: "new" }, context)

      expect(beforeCreate).toHaveBeenCalledWith({ name: "new" }, context)
      expect(mockHttpRepo.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ enriched: true }),
        context
      )
    })
  })
})

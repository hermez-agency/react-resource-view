import { describe, expect, it } from "vitest"
import { createResourceCollection } from "@/api/collectionShape"

describe("createResourceCollection", () => {
  it("keeps a missing total undefined instead of counting the rows read", () => {
    const collection = createResourceCollection({
      id: "/api/items",
      items: [{ id: 1 }],
    })

    expect(collection.totalItems).toBeUndefined()
    expect(collection.items).toHaveLength(1)
  })

  it("keeps the total the API gave", () => {
    const collection = createResourceCollection({
      id: "/api/items",
      items: [{ id: 1 }],
      totalItems: 45,
    })

    expect(collection.totalItems).toBe(45)
  })
})

import { beforeEach, describe, expect, it } from "vitest"
import { localRepository } from "@/api/localRepository"
import { createViewResource } from "@/utils/createViewResource"
import { fetchAllRows } from "@/views/list/export/exportRows"

const ROWS = [
  { title: "b", rank: 2, group: "x" },
  { title: "a", rank: 2, group: "y" },
  { title: "c", rank: 1, group: "x" },
]

async function seed(repository = localRepository({ path: "tasks" })) {
  for (const row of ROWS) await repository.createItem(row as never)
  return repository
}

const titles = (response: any) => response.data.member.map((row: any) => row.title)

describe("localRepository", () => {
  beforeEach(() => localStorage.clear())

  it("keeps every record when the filter holds a page size", async () => {
    const repository = await seed()
    const response = await repository.getCollection({ itemsPerPage: 10 })
    expect(titles(response)).toHaveLength(3)
  })

  it("pages client-side and still reports the total", async () => {
    const repository = await seed()
    const second = await repository.getCollection({ itemsPerPage: 2, page: 2 })
    expect(second.data.member).toHaveLength(1)
    expect(second.data.totalItems).toBe(3)
  })

  it("keeps every record when the filter holds a page number", async () => {
    const repository = await seed()
    const response = await repository.getCollection({ page: 1 })
    expect(titles(response)).toHaveLength(3)
  })

  it("sorts on several columns, the first deciding and the next breaking ties", async () => {
    const repository = await seed()
    const response = await repository.getCollection({
      order: { rank: "desc", title: "asc" },
    })
    expect(titles(response)).toEqual(["a", "b", "c"])
    const reversed = await repository.getCollection({
      order: { rank: "asc", title: "desc" },
    })
    expect(titles(reversed)).toEqual(["c", "b", "a"])
  })

  it("still filters on the fields of a record", async () => {
    const repository = await seed()
    const response = await repository.getCollection({
      group: "x",
      order: { title: "asc" },
    })
    expect(titles(response)).toEqual(["b", "c"].sort())
  })

  it("lets the export read every page of a local resource", async () => {
    const resource = createViewResource("tasks", { storage: "local" })
    await seed(resource as never)
    const rows = await fetchAllRows(resource, {
      itemsPerPage: 2,
      order: { title: "asc" },
    })
    expect(rows.map((row) => row.title)).toEqual(["a", "b", "c"])
  })
})

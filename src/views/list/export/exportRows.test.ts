import { describe, expect, it, vi } from "vitest"
import { fetchAllRows, toCsv, toJson } from "@/views/list/export/exportRows"

const COLUMNS = [
  { field: "title", label: "Title" },
  { field: "note", label: "Note" },
]

function pagedResource(total: number, size: number) {
  const all = Array.from({ length: total }, (_, i) => ({ id: i + 1 }))
  const getCollection = vi.fn(async (params?: Record<string, any>) => {
    const page = params?.page ?? 1
    return {
      data: {
        member: all.slice((page - 1) * size, page * size),
        totalItems: total,
      },
    } as any
  })
  return { getCollection }
}

describe("fetchAllRows", () => {
  it("reads every page, keeps the filter and drops the page on screen", async () => {
    const resource = pagedResource(5, 2)
    const onProgress = vi.fn()

    const rows = await fetchAllRows(
      resource,
      { status: "todo", order: { title: "asc" }, page: 3 },
      { onProgress }
    )

    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5])
    expect(resource.getCollection.mock.calls.map(([params]) => params)).toEqual([
      { status: "todo", order: { title: "asc" }, page: 1 },
      { status: "todo", order: { title: "asc" }, page: 2 },
      { status: "todo", order: { title: "asc" }, page: 3 },
    ])
    expect(onProgress.mock.calls.map(([p]) => p)).toEqual([
      { loaded: 2, total: 5 },
      { loaded: 4, total: 5 },
      { loaded: 5, total: 5 },
    ])
  })

  it("stops on a short page when the API gives no total", async () => {
    const getCollection = vi.fn(async (params?: Record<string, any>) => ({
      data: {
        member: params?.page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }],
      } as any,
    }))

    const rows = await fetchAllRows({ getCollection }, {})

    expect(rows).toHaveLength(3)
    expect(getCollection).toHaveBeenCalledTimes(2)
  })

  it("stops when the backend ignores the page", async () => {
    const getCollection = vi.fn(async () => ({
      data: { member: [{ id: 1 }, { id: 2 }] } as any,
    }))

    const rows = await fetchAllRows({ getCollection }, {})

    expect(rows).toHaveLength(2)
    expect(getCollection).toHaveBeenCalledTimes(2)
  })
})

describe("toCsv", () => {
  it("escapes commas, quotes and line breaks", () => {
    const csv = toCsv(
      [
        { title: "Hello, world", note: 'He said "hi"' },
        { title: "Two\nlines", note: null },
      ],
      COLUMNS
    )

    expect(csv).toBe(
      '\uFEFFTitle,Note\r\n"Hello, world","He said ""hi"""\r\n"Two\nlines",\r\n'
    )
  })

  it("writes only the columns given, in their order", () => {
    const csv = toCsv([{ title: "A", note: "B", hidden: "C" }], [COLUMNS[1]])

    expect(csv).toBe("\uFEFFNote\r\nB\r\n")
  })

  it("flattens arrays and objects", () => {
    const csv = toCsv([{ title: ["a", "b"], note: { x: 1 } }], COLUMNS)

    expect(csv).toContain('"a, b","{""x"":1}"')
  })
})

describe("toJson", () => {
  it("keeps raw values and drops the columns not shown", () => {
    const json = toJson([{ title: "A", note: ["x"], hidden: 1 }], COLUMNS)

    expect(JSON.parse(json)).toEqual([{ title: "A", note: ["x"] }])
  })
})

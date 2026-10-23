import { describe, expect, it, vi } from "vitest"
import { createResourceCollection } from "@/api/collectionShape"
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

  it("follows the cursor of each page until the API says there is none", async () => {
    const pages: Record<string, { rows: number[]; next: string | null }> = {
      first: { rows: [1, 2], next: "b" },
      b: { rows: [3, 4], next: "c" },
      c: { rows: [5, 6], next: null },
    }
    const getCollection = vi.fn(async (params?: Record<string, any>) => {
      const page = pages[params?.cursor ?? "first"]
      return {
        data: createResourceCollection({
          id: "/items",
          items: page.rows.map((id) => ({ id })),
          nextCursor: page.next,
        }),
      } as any
    })

    const rows = await fetchAllRows({ getCollection }, {})

    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(getCollection.mock.calls.map(([params]) => params?.cursor)).toEqual([
      undefined,
      "b",
      "c",
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

  it("reads every page of an API that gives no total, through the repository", async () => {
    const all = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }))
    const getCollection = vi.fn(async (params?: Record<string, any>) => {
      const page = params?.page ?? 1
      return {
        data: createResourceCollection({
          id: "/api/items",
          items: all.slice((page - 1) * 30, page * 30),
        }),
      } as any
    })

    const rows = await fetchAllRows({ getCollection }, {})

    expect(rows).toHaveLength(45)
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

  it.each([
    ["=", '=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
    ["+", "+1+cmd|' /C calc'!A0", "'+1+cmd|' /C calc'!A0"],
    ["-", "-2+3", "'-2+3"],
    ["@", "@SUM(A1)", "'@SUM(A1)"],
    ["a tab", "\t=1+1", "'\t=1+1"],
    ["a carriage return", "\r=1+1", `"'\r=1+1"`],
  ])(
    "prefixes a cell starting with %s by an apostrophe",
    (_trigger, value, cell) => {
      const csv = toCsv([{ title: value }], [COLUMNS[0]])

      expect(csv).toBe(`\uFEFFTitle\r\n${cell}\r\n`)
    }
  )

  it("leaves numbers and plain text as they are", () => {
    const csv = toCsv([{ title: -5, note: "a=b" }], COLUMNS)

    expect(csv).toBe("\uFEFFTitle,Note\r\n-5,a=b\r\n")
  })

  it("prefixes each value of an array that starts like a formula", () => {
    const csv = toCsv([{ title: ["=1+1", "b"] }], [COLUMNS[0]])

    expect(csv).toBe('\uFEFFTitle\r\n"\'=1+1, b"\r\n')
  })
})

describe("toJson", () => {
  it("keeps raw values and drops the columns not shown", () => {
    const json = toJson([{ title: "A", note: ["x"], hidden: 1 }], COLUMNS)

    expect(JSON.parse(json)).toEqual([{ title: "A", note: ["x"] }])
  })

  it("keeps a value that starts like a formula as it is", () => {
    const json = toJson([{ title: "=1+1", note: "@x" }], COLUMNS)

    expect(JSON.parse(json)).toEqual([{ title: "=1+1", note: "@x" }])
  })
})

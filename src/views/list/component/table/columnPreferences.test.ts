import { describe, expect, it } from "vitest"
import {
  arrangeColumns,
  moveColumn,
} from "@/views/list/component/table/columnPreferences"

describe("arrangeColumns", () => {
  it("is the declaration while nothing is stored", () => {
    expect(arrangeColumns(["title", "author"], null)).toEqual([
      { field: "title", visible: true },
      { field: "author", visible: true },
    ])
  })

  it("follows the stored order and hides what was unchecked", () => {
    expect(
      arrangeColumns(["title", "author"], {
        order: ["author", "title"],
        hidden: ["title"],
      })
    ).toEqual([
      { field: "author", visible: true },
      { field: "title", visible: false },
    ])
  })

  it("adds a field declared since after the one it follows, and drops a removed one", () => {
    expect(
      arrangeColumns(["title", "status", "author"], {
        order: ["author", "title", "removed"],
        hidden: [],
      }).map((column) => column.field)
    ).toEqual(["author", "title", "status"])
  })

  it("puts a new first field first", () => {
    expect(
      arrangeColumns(["id", "title"], { order: ["title"], hidden: [] }).map(
        (column) => column.field
      )
    ).toEqual(["id", "title"])
  })
})

describe("moveColumn", () => {
  it("moves a field before or after another", () => {
    expect(moveColumn(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
    expect(moveColumn(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
  })
})

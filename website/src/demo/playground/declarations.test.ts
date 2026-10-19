import { describe, expect, it } from "vitest"
import {
  countLines,
  DECLARATIONS,
  findLayoutLines,
  githubUrl,
} from "@/demo/playground/declarations"
import { COMMENTS_ID, PRODUCTS_ID, TASKS_ID } from "@/demo/playground/adminData"

describe("the declarations behind the screens", () => {
  it("marks the single-line entry of a layout", () => {
    const { source } = DECLARATIONS[PRODUCTS_ID]
    const range = findLayoutLines(source, { type: "cards", label: "Cards" })!

    expect(range.from).toBe(range.to)
    expect(source.split("\n")[range.from - 1]).toContain("layout.cards({")
  })

  it("marks an entry that spans several lines up to its closing parenthesis", () => {
    const { source } = DECLARATIONS[TASKS_ID]
    const range = findLayoutLines(source, { type: "table", label: "Table" })!
    const lines = source.split("\n")

    expect(lines[range.from - 1]).toContain("layout.table({")
    expect(lines[range.to - 1].trim()).toBe("}),")
  })

  it("marks nothing for a layout the file does not name", () => {
    expect(
      findLayoutLines(DECLARATIONS[PRODUCTS_ID].source, { type: "calendar" })
    ).toBeUndefined()
    expect(
      findLayoutLines(DECLARATIONS[PRODUCTS_ID].source, undefined)
    ).toBeUndefined()
  })

  it("finds a layout by its type whatever label it shows", () => {
    const { source } = DECLARATIONS[COMMENTS_ID]
    const range = findLayoutLines(source, { type: "items", label: "List" })!

    expect(source.split("\n")[range.from - 1]).toContain("layout.items({")
  })

  it("counts lines and links to the file on GitHub, lines included", () => {
    expect(countLines("a\nb\n")).toBe(2)
    expect(githubUrl({ path: "x/y.ts", source: "" }, { from: 3, to: 5 })).toBe(
      "https://github.com/hermez-agency/react-resource-view/blob/main/x/y.ts#L3-L5"
    )
  })
})

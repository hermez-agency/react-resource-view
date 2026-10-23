import { describe, expect, it } from "vitest"
import { createViewResource } from "./createViewResource"

// Checked by `tsc` (pnpm run typecheck): the item is the shape the API
// returns, whatever the dialect — PostgREST and Strapi rows carry no "@id".
type Row = { id: number; title: string }

describe("createViewResource — item without @id", () => {
  it("types a resource with the row the API returns", () => {
    const rows = createViewResource<Row>("rows", {
      path: "/rest/v1/rows",
      titleField: "title",
      form: { inputs: { title: { label: "Title" } } },
    })

    expect(rows.name).toBe("rows")
  })

  it("still checks the fields against the item", () => {
    createViewResource<Row>("rows", {
      path: "/rest/v1/rows",
      // @ts-expect-error — `missing` is not a field of Row
      titleField: "missing",
    })
  })
})

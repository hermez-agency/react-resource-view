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

describe("createViewResource — form.inputs", () => {
  it("flags an input that is not a field of the item", () => {
    createViewResource<Row>("rows", {
      path: "/rest/v1/rows",
      // @ts-expect-error — `titel` is a typo, not a field of Row
      form: { inputs: { titel: { label: "Title" } } },
    })
  })

  it("accepts a virtual input named in the second generic", () => {
    createViewResource<Row, Row & { confirm: string }>("rows", {
      path: "/rest/v1/rows",
      form: { inputs: { title: { label: "Title" }, confirm: { label: "Confirm" } } },
    })
  })

  it("flags the typo in a view's form as well", () => {
    createViewResource<Row>("rows", {
      path: "/rest/v1/rows",
      views: {
        // @ts-expect-error — `titel` is a typo, not a field of Row
        update: { form: { inputs: { titel: false } } },
      },
    })
  })
})

import { describe, expect, it } from "vitest"
import { createViewResource } from "./createViewResource"
import type { BaseJsonLdItemInterface } from "jsonld-item"
import { layout } from "@/layout/layout"

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

// `[key: string]: any` on BaseJsonLdItemInterface must not turn every field
// name into a valid `string`.
interface Task extends BaseJsonLdItemInterface {
  title: string
  status: string
}

describe("createViewResource — item extending BaseJsonLdItemInterface", () => {
  it("flags a titleField typo", () => {
    createViewResource<Task>("tasks", {
      path: "/api/tasks",
      // @ts-expect-error — `titel` is a typo, not a field of Task
      titleField: "titel",
    })
  })

  it("flags a groupBy typo in a board layout", () => {
    createViewResource<Task>("tasks", {
      path: "/api/tasks",
      views: {
        list: {
          // @ts-expect-error — `statuss` is a typo, not a field of Task
          layouts: [layout.board({ groupBy: "statuss", columns: [] })],
        },
      },
    })
  })

  it("still accepts the declared fields", () => {
    createViewResource<Task>("tasks", {
      path: "/api/tasks",
      titleField: "title",
      views: {
        list: { layouts: [layout.board({ groupBy: "status", columns: [] })] },
      },
    })
  })
})

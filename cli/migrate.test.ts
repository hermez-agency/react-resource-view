import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  formatWithPrettier,
  loadTypeScript,
  runMigrate,
  transformSource,
} from "./migrate.mjs"

/**
 * `migrate` rewrites 0.x declarations into 1.0. The resources of the
 * playground are its fixtures — `before/` as the site declares them in 0.x,
 * `after/` as the command writes them, type-checked against the 1.0 types of
 * `src/` by `pnpm run typecheck`. `UPDATE_FIXTURES=1` writes `after/` again.
 */

const ts = loadTypeScript(process.cwd())
const FIXTURES = join(process.cwd(), "cli/__fixtures__/playground")

const migrate = (source: string, fileName = "resource.ts") =>
  transformSource(source, fileName, ts)

const fixtureFiles = [
  "shared.ts",
  ...readdirSync(join(FIXTURES, "before/resources")).map(
    (file) => `resources/${file}`
  ),
]

describe("the playground, migrated", () => {
  it.each(fixtureFiles)("%s", async (file) => {
    const source = readFileSync(join(FIXTURES, "before", file), "utf8")
    const target = join(FIXTURES, "after", file)
    const { output } = migrate(source, target)
    const formatted = await formatWithPrettier(output, target)

    if (process.env.UPDATE_FIXTURES) writeFileSync(target, formatted)
    expect(formatted).toBe(readFileSync(target, "utf8"))
  })

  it("needs nothing done by hand", () => {
    const notes = fixtureFiles.flatMap(
      (file) =>
        migrate(readFileSync(join(FIXTURES, "before", file), "utf8"), file).notes
    )

    expect(notes).toEqual([])
  })

  it("leaves what it wrote as it is when run again", () => {
    for (const file of fixtureFiles) {
      const after = readFileSync(join(FIXTURES, "after", file), "utf8")
      expect(migrate(after, file).changed).toBe(false)
    }
  })

  it("reports the scope each resource named", () => {
    const { scopes } = migrate(
      readFileSync(join(FIXTURES, "before/resources/tasks.ts"), "utf8")
    )

    expect(scopes).toEqual([{ scope: '"admin"', line: 99 }])
  })
})

describe("the rules of the migration", () => {
  const declare = (body: string) => `import { ActionList } from "react-data-form"
import { createViewResource, tableViewOptionFactory, columnViewOptionFactory } from "react-resource-view"

export const tasks = createViewResource("tasks", {
${body}
})
`

  const outputOf = (body: string) => migrate(declare(body)).output

  it("writes the refusals the 0.x permissions implied", () => {
    expect(
      outputOf(`  path: "/api/tasks",\n  canRead: true,\n  canUpdate: true,`)
    ).toContain("permissions: { create: false, delete: false, export: false },")
    expect(outputOf(`  storage: "local",\n  canRead: true,`)).toContain(
      '  storage: "local",\n  permissions: "readonly",'
    )
    expect(
      outputOf(
        `  path: "/api/tasks",\n  canRead: true,\n  canCreate: true,\n  canUpdate: true,\n  canDelete: true,\n  view: { behavior: { canExport: true } },`
      )
    ).not.toContain("permissions")
  })

  it("keeps a permission function, and a refused list", () => {
    const output = outputOf(
      `  path: "/api/tasks",\n  canRead: true,\n  canList: false,\n  canCreate: true,\n  canUpdate: () => isAdmin(),\n  canDelete: true,\n  view: { behavior: { canExport: true } },`
    )

    expect(output).toContain(
      "permissions: { list: false, update: () => isAdmin() },"
    )
  })

  it("marks the refused update of a board, whose cards 0.x moved anyway", () => {
    const board = `  view: { viewVariants: [columnViewOptionFactory({ identifierKey: "status" })] },`
    const { output, notes } = migrate(
      declare(
        `  path: "/api/tasks",\n  canRead: true,\n  canCreate: true,\n  canUpdate: false,\n${board}`
      )
    )

    expect(output).toMatch(/\/\/ TODO\(RV1-PERM-008\): [^\n]*\n\s*update: false,/)
    expect(notes.map((note) => note.id)).toContain("RV1-PERM-008")
    expect(
      migrate(
        declare(
          `  path: "/api/tasks",\n  canRead: true,\n  canUpdate: true,\n${board}`
        )
      ).notes.map((note) => note.id)
    ).not.toContain("RV1-PERM-008")
    expect(
      migrate(
        declare(`  path: "/api/tasks",\n  canRead: true,\n  canUpdate: false,`)
      ).notes.map((note) => note.id)
    ).not.toContain("RV1-PERM-008")
  })

  it("leaves a declaration without permissions to the 1.0 default, and says so", () => {
    const { output, notes } = migrate(
      declare(`  path: "/api/tasks",\n  scope: "admin",`)
    )

    expect(output).not.toContain("permissions")
    expect(notes.map((note) => note.id)).toEqual(["RV1-PERM-002"])
  })

  it('declares `storage: "local"` where 0.x fell back on it silently', () => {
    expect(outputOf(`  name: "Tasks",\n  canRead: true,`)).toContain(
      'name: "Tasks",\n  storage: "local",'
    )
    expect(outputOf(`  name: "Tasks",\n  path: "/api/tasks",`)).not.toContain(
      "storage"
    )
  })

  it("moves the hooks and the repository methods", () => {
    const output = outputOf(
      `  path: "/api/tasks",\n  preCreate: (data) => data,\n  preGetCollection: (params) => params,\n  getItem: async () => ({ data: {} }),`
    )

    expect(output).toContain(
      "hooks: { beforeCreate: (data) => data, beforeList: (params) => params },"
    )
    expect(output).toContain("repository: { getItem: async () => ({ data: {} }) },")
  })

  it("renames the quota", () => {
    expect(
      outputOf(
        `  path: "/api/tasks",\n  limit: { getLimit: () => ({ current: 1, max: 3 }), fallback: Upgrade },`
      )
    ).toContain("quota: { get: () => ({ current: 1, max: 3 }), fallback: Upgrade },")
  })

  it("spreads `view` over the root and the list", () => {
    const output = outputOf(`  name: "Tasks",
  path: "/api/tasks",
  view: {
    name: "Tasks",
    fullWidth: true,
    itemsPerPage: 50,
    formFilter: { inputs: { title: { label: "Search" } } },
    defaultFilter: { status: "open" },
    viewVariants: [tableViewOptionFactory({ name: "Table" })],
  },`)

    expect(output).toContain(`  fullWidth: true,
  views: {
    list: {
      pageSize: 50,
      filters: {
        inputs: { title: { label: "Search" } },
        initial: { status: "open" },
      },
      layouts: [layout.table()],
    },
  },`)
    expect(output).toContain(
      'import { createViewResource, layout } from "react-resource-view"'
    )
    expect(output).not.toContain("ActionList")
  })

  it("rewrites each option of `behavior` where it has an effect", () => {
    const output = outputOf(`  path: "/api/tasks",
  view: {
    behavior: { eventSourced: true, rowActions: [ActionList.read, ActionList.delete] },
    viewVariants: [
      columnViewOptionFactory({ identifierKey: "status", identifierKeyList: STATUSES }),
    ],
    label: { create: "New task" },
  },
  views: {
    [ActionList.update]: { name: "Edit a task", behavior: { openIn: "window", redirectToAfterUpdate: "/done" } },
    [ActionList.create]: { behavior: { openIn: "drawer", closeAfterUpdate: true } },
    [ActionList.list]: { behavior: { openRecordIn: "popup", bulkActions: [archive] } },
  },`)

    expect(output).toContain('rowActions: ["read", "delete"],')
    // The selection is the list's, whatever its layouts.
    expect(output).toContain("bulkActions: [archive],")
    expect(output).toContain(
      'layouts: [layout.board({ groupBy: "status", columns: STATUSES })],'
    )
    // Where a card opens is where the record's `read` view opens.
    expect(output).toContain('read: { open: "dialog" },')
    expect(output).toContain(
      'update: {\n      title: "Edit a task",\n      open: "page",\n      afterSave: { redirect: () => "/done" },\n    },'
    )
    // Closing is what a drawer does after a save anyway.
    expect(output).toContain('create: { buttonLabel: "New task", open: "drawer" },')
    expect(output).toContain("realtime: true,")
  })

  it("rewrites a shared fragment, typed for what it now holds", () => {
    const { output } = migrate(`import type { Task } from "./task"
const POPUP = { behavior: { openIn: "popup", closeAfterUpdate: true } } as const
const DRAWER = { behavior: { openIn: "drawer" } }
const BOARD: { behavior: object } = { behavior: { openRecordIn: "drawer", selectable: false } }
`)

    expect(output).toContain('const POPUP = { open: "dialog" } as const')
    expect(output).toContain('const DRAWER = { open: "drawer" as const }')
    expect(output).toContain(
      'const BOARD: Pick<ListViewDefinition, "selectable"> = { selectable: false }'
    )
  })

  it("moves the selection of a board to the list", () => {
    const output = outputOf(`  path: "/api/tasks",
  view: {
    viewVariants: [
      columnViewOptionFactory({
        behavior: { selectable: true, bulkActions: [archive] },
        identifierKey: "status",
        identifierKeyList: STATUSES,
      }),
    ],
  },`)

    expect(output).toContain(
      'list: {\n      selectable: true,\n      bulkActions: [archive],\n      layouts: [layout.board({ groupBy: "status", columns: STATUSES })],'
    )
  })

  it("moves a shared fragment of the selection spread into a board to the list", () => {
    const { output } =
      migrate(`import { createViewResource, columnViewOptionFactory } from "react-resource-view"
const BOARD: { behavior: object } = { behavior: { openRecordIn: "drawer", bulkActions: [archive] } }
export const tasks = createViewResource("tasks", {
  path: "/api/tasks",
  view: {
    viewVariants: [
      columnViewOptionFactory({ ...BOARD, identifierKey: "status", identifierKeyList: STATUSES }),
    ],
  },
})
`)

    expect(output).toContain(
      'const BOARD: Pick<ListViewDefinition, "bulkActions"> = { bulkActions: [archive] }'
    )
    expect(output).toContain(
      'list: {\n      ...BOARD,\n      layouts: [layout.board({ groupBy: "status", columns: STATUSES })],'
    )
    expect(output).toContain('read: { open: "drawer" }')
  })

  it("moves the selection of a board of a 1.0 preview to `views.list`", () => {
    const output = outputOf(`  path: "/api/tasks",
  views: {
    list: {
      layouts: [
        layout.board({ groupBy: "status", columns: STATUSES, selectable: true, bulkActions: [archive] }),
      ],
    },
  },`)

    expect(output).toContain("selectable: true,")
    expect(output).toContain("bulkActions: [archive],")
    expect(output).toContain(
      'layouts: [layout.board({ groupBy: "status", columns: STATUSES })],'
    )
  })

  it("marks the selection of a board of a 1.0 preview built away from its resource", () => {
    const source = `import { layout } from "react-resource-view"
export const BOARD = layout.board({ groupBy: "status", columns: STATUSES, bulkActions: [archive] })
`
    const { output, notes } = migrate(source)

    expect(output).toContain(
      "// TODO(RV1-LAYOUT-014): move to the resource's views.list"
    )
    expect(output).toContain("bulkActions: [archive],")
    expect(notes.map((entry) => entry.id)).toContain("RV1-LAYOUT-014")
    // Run again, it is left as it is.
    expect(migrate(output).output).toBe(output)
  })

  it("moves where a board of a 1.0 preview opens its cards to `views.read`", () => {
    const output = outputOf(`  path: "/api/tasks",
  views: {
    list: {
      layouts: [
        layout.board({ groupBy: "status", columns: STATUSES, openRecord: "drawer", expandable: false }),
        layout.table(),
      ],
    },
  },`)

    expect(output).toContain(
      'layout.board({ groupBy: "status", columns: STATUSES }),'
    )
    expect(output).toContain('read: { open: "drawer", expandable: false },')
    expect(output).not.toContain("openRecord")
  })

  it("reports a board of a 1.0 preview built away from its resource", () => {
    const { output, notes } = migrate(`import { layout } from "react-resource-view"
export const board = layout.board({ groupBy: "status", columns: STATUSES, openRecord: "dialog" })
`)

    expect(output).toContain(
      'layout.board({ groupBy: "status", columns: STATUSES })'
    )
    expect(notes.map((note) => note.id)).toEqual(["RV1-LAYOUT-013"])
  })

  it("turns the sub-views into tabs, narrowed on the record", () => {
    const output = outputOf(`  path: "/api/posts",
  views: {
    [ActionList.read]: {
      subViewResource: {
        viewComponent: Summary,
        list: [
          {
            slug: "comments",
            name: "Comments",
            resourceId: COMMENTS_ID,
            resourceAction: ActionList.list,
            onInitViewResource: (view, parent) => {
              const post = (parent?.data as Post | undefined)?.["@id"]
              return { ...view, filter: { post }, defaultData: { post } }
            },
          },
          { slug: "stats", name: "Stats", viewComponent: PostStats },
        ],
      },
    },
  },`)

    expect(output).toContain("aside: Summary,")
    expect(output).toContain(
      'id: "comments",\n            label: "Comments",\n            resource: COMMENTS_ID,'
    )
    expect(output).toContain(
      'filter: ({ item }) => ({ post: (item as Post | undefined)?.["@id"] }),'
    )
    expect(output).toContain('{ id: "stats", label: "Stats", component: PostStats }')
  })

  it("leaves an onInitViewResource it cannot read, with a TODO", () => {
    const { output, notes } = migrate(
      declare(`  path: "/api/posts",
  views: {
    [ActionList.read]: {
      subViewResource: {
        list: [{ resourceId: "comments", onInitViewResource: init }],
      },
    },
  },`)
    )

    expect(output).toContain("// TODO(RV1-TABS-003)")
    expect(notes.map((note) => note.id)).toContain("RV1-TABS-003")
  })

  it("moves the layout's components, and picks the fields of its form", () => {
    expect(
      outputOf(`  path: "/api/tasks",
  view: {
    viewVariants: [
      tableViewOptionFactory({
        name: "Grid",
        rowComponent: TaskRow,
        form: { inputs: { title: FIELDS.title, status: FIELDS.status } },
      }),
    ],
  },`)
    ).toContain(
      'layout.table({\n          label: "Grid",\n          fields: ["title", "status"],\n          components: { row: TaskRow },\n        }),'
    )
  })

  it("rewrites setResourceConfig and a scope's menu", () => {
    const { output } = migrate(`import { ActionList } from "react-data-form"
import { createItemMenuWithResource, setResourceConfig } from "react-resource-view"

setResourceConfig({
  defaultResource: { views: { [ActionList.update]: { behavior: { openIn: "popup" } } } },
})

export const scope = {
  name: "admin",
  resources: [users],
  menu: [createItemMenuWithResource({ resource: users })],
}
`)

    expect(output).toContain(
      'configureResourceView({ defaults: { views: { update: { open: "dialog" } } } })'
    )
    expect(output).toContain("menu: [users],")
    expect(output).toContain(
      'import { configureResourceView } from "react-resource-view"'
    )
  })

  it("renames the types and hooks exported under another name", () => {
    const { output } =
      migrate(`import { useLimit, type ViewResourceInterface } from "react-resource-view"

export function Quota({ resource }: { resource: ViewResourceInterface }) {
  return useLimit(resource.quota, context)
}
`)

    expect(output).toContain(
      'import { useQuota, type ViewResource } from "react-resource-view"'
    )
    expect(output).toContain("{ resource: ViewResource }")
    expect(output).toContain("return useQuota(")
  })

  it("rewrites a layout written out with createView", () => {
    const { output } =
      migrate(`import { createView, createViewResource } from "react-resource-view"

createViewResource("tasks", {
  path: "/api/tasks",
  view: { viewVariants: [createView({ name: "Heatmap", listComponent: HeatmapList, dense: true })] },
})
`)

    expect(output).toContain(
      'layout.custom({\n          type: "heatmap",\n          components: { list: HeatmapList },\n          options: { dense: true },\n        }),'
    )
    expect(output).toContain(
      'import { createViewResource, layout } from "react-resource-view"'
    )
  })

  it("keeps `views` given as a variable, with a TODO", () => {
    const output = outputOf(`  path: "/api/tasks",\n  views: myViews,`)

    expect(output).toContain("// TODO(RV1-VIEW-002)")
    expect(output).toContain("views: myViews,")
  })

  it("writes one `components`, whatever brought them", () => {
    const output = outputOf(
      `  path: "/api/tasks",\n  components: { noResult: Empty },\n  decoratorComponent: Frame,\n  view: { viewComponent: Page },`
    )

    expect(output.match(/components:/g)).toHaveLength(1)
    expect(output).toContain("empty: Empty")
    expect(output).toContain("wrapper: Frame")
    expect(output).toContain("view: Page")
  })

  it("lets an action's own behavior replace the root's, as 0.x did", () => {
    const output = outputOf(`  path: "/api/tasks",
  view: { behavior: { openIn: "popup" }, defaultFilter: { status: "open" } },
  views: {
    [ActionList.update]: { behavior: { refreshDataAfterUpdate: true } },
    [ActionList.list]: { formFilter: { inputs: { title: {} } } },
  },`)

    expect(output).toContain('update: { afterSave: "reload" }')
    expect(output).toContain('read: { open: "dialog" }')
    expect(output).toContain('initial: { status: "open" }')
    expect(output).toContain("inputs: { title: {} }")
  })

  it("leaves alone a `behavior` that is not the library's", () => {
    const source = `export const options = { name: "x", behavior: { retries: 3 } }\n`
    expect(migrate(source).changed).toBe(false)
  })

  it("keeps a multi-line template literal as it was", () => {
    const output = outputOf(
      '  path: "/api/tasks",\n  canRead: true,\n  view: { description: `first\n    second` },'
    )
    expect(output).toContain("`first\n    second`")
  })

  it("keeps the key of a shorthand and the name of a re-export", () => {
    const { output } = migrate(`import { useLimit } from "react-resource-view"
export const hooks = { useLimit }
export { useLimit }
`)

    expect(output).toContain("{ useLimit: useQuota }")
    expect(output).toContain("export { useQuota as useLimit }")
  })

  it("touches nothing in a file that has nothing of 0.x", () => {
    const source = `import { createViewResource, layout } from "react-resource-view"

export const tasks = createViewResource("tasks", {
  path: "/api/tasks",
  views: { list: { layouts: [layout.table()] } },
})
`
    expect(migrate(source).changed).toBe(false)
  })
})

describe("npx react-resource-view migrate", () => {
  it("reports what it would do without writing, and fails a check", async () => {
    const lines: string[] = []
    const code = await runMigrate(
      ["cli/__fixtures__/playground/before", "--check"],
      {
        cwd: process.cwd(),
        log: (line: string) => lines.push(line),
      }
    )

    expect(code).toBe(1)
    const report = lines.join("\n")
    expect(report).toContain(
      "would rewrite cli/__fixtures__/playground/before/resources/tasks.ts"
    )
    expect(report).toContain("10 files to rewrite.")
    expect(report).toContain("Scopes (RV1-SCOPE-001)")
  })
})

describe("migrations/1.0.json and MIGRATION-1.0.md", () => {
  const changes = JSON.parse(
    readFileSync(join(process.cwd(), "migrations/1.0.json"), "utf8")
  ).changes as {
    id: string
    kind: string
    codemod: boolean
    before: string
    after: string
  }[]
  const guide = readFileSync(join(process.cwd(), "MIGRATION-1.0.md"), "utf8")

  it("tell the same changes, in the same order", () => {
    const headings = [...guide.matchAll(/^### (RV1-[A-Z]+-\d{3})$/gm)].map(
      ([, id]) => id
    )
    expect(headings).toEqual(changes.map((change) => change.id))
  })

  it("give every change a kind, a before and an after", () => {
    for (const change of changes) {
      expect(["rename", "move", "merge", "remove", "semantic"]).toContain(
        change.kind
      )
      expect(typeof change.codemod).toBe("boolean")
      expect(change.before.length).toBeGreaterThan(0)
      expect(change.after.length).toBeGreaterThan(0)
    }
  })
})

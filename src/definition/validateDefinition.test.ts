import { describe, expect, it, vi } from "vitest"
import { createViewResource } from "@/utils/createViewResource"
import { layout } from "@/layout/layout"
import { inspectDefinition } from "@/definition/validateDefinition"
import { configureResourceView } from "@/ResourceConfig"
import { open } from "@/open/open"

/**
 * In development a declaration is checked: a key nothing reads, a 0.x key, a
 * resource with nowhere to read its data from — each said, with how to write
 * it, instead of nothing happening.
 */

const messagesOf = (definition: Record<string, any>, name = "Tasks") =>
  inspectDefinition("tasks", definition, name).map(
    ({ level, path, message }) => `${level} ${path}: ${message}`
  )

describe("the development checks of createViewResource", () => {
  it("throws, listing every problem at once", () => {
    expect(() =>
      createViewResource("validate_tasks", {
        storage: "local",
        // @ts-expect-error — a 0.x key (and, below, a typo: one error per object)
        canRead: true,
        fullWdith: true,
      })
    ).toThrow(
      /createViewResource\("validate_tasks"\): 2 problems in the declaration/
    )
  })

  it("gives the 1.0 rewrite of a 0.x key, with its migration id", () => {
    expect(messagesOf({ storage: "local", canDelete: false })).toEqual([
      expect.stringContaining(
        "error (root): `canDelete` is a 0.x key (RV1-PERM-001): declare `permissions` instead"
      ),
    ])
    expect(messagesOf({ storage: "local", view: {} })[0]).toContain("RV1-VIEW-001")
    expect(messagesOf({ storage: "local", preCreate: () => ({}) })[0]).toContain(
      "hooks: { beforeList, beforeRead, beforeCreate"
    )
  })

  it("rewrites each option of a 0.x `behavior`", () => {
    const messages = messagesOf({
      storage: "local",
      views: { update: { behavior: { openIn: "popup", closeAfterUpdate: true } } },
    })

    expect(messages).toContainEqual(
      expect.stringContaining(
        "views.update: `behavior` is a 0.x key (RV1-BEHAV-001)"
      )
    )
    expect(messages).toContainEqual(
      expect.stringContaining(
        'views.update.behavior: `openIn` (RV1-BEHAV-002): `open: "page" | "dialog" | "drawer"`'
      )
    )
    expect(messages).toContainEqual(
      expect.stringContaining(
        "views.update.behavior: `closeAfterUpdate` (RV1-BEHAV-003)"
      )
    )
  })

  it("suggests the closest key for a typo", () => {
    expect(messagesOf({ storage: "local", fullWdith: true })).toEqual([
      "error (root): `fullWdith` does not exist here — did you mean `fullWidth`?",
    ])
    expect(messagesOf({ storage: "local", views: { lsit: {} } })).toEqual([
      "error views: `lsit` does not exist here — did you mean `list`?",
    ])
  })

  it.each([
    ["form", { form: { inptus: {} } }],
    ["views.update.form", { views: { update: { form: { inptus: {} } } } }],
    ["filters inputs", { views: { list: { filters: { inptus: {} } } } }],
    ["filters initial", { views: { list: { filters: { intial: {} } } } }],
    ["sort fields", { views: { list: { sort: { feilds: [] } } } }],
    ["sort initial", { views: { list: { sort: { initail: {} } } } }],
  ])("suggests the closest key for a typo in %s", (_, nested) => {
    const [message] = messagesOf({ storage: "local", ...nested })

    expect(message).toMatch(
      /^error [\w.]+: `\w+` does not exist here — did you mean `(inputs|initial|fields)`\?$/
    )
  })

  it("accepts the keys of form, filters and sort", () => {
    expect(
      messagesOf({
        storage: "local",
        form: { inputs: {}, className: "x" },
        views: {
          list: {
            filters: { inputs: {}, initial: {} },
            sort: { fields: [], initial: {} },
          },
        },
      })
    ).toEqual([])
  })

  it("says where a key belongs when it is written at the wrong level", () => {
    expect(messagesOf({ storage: "local", layouts: [] })).toEqual([
      "error (root): `layouts` does not belong here: it goes in views.list.layouts.",
    ])
    expect(
      messagesOf({ storage: "local", views: { list: { afterSave: "close" } } })
    ).toEqual([
      "error views.list: `afterSave` does not belong here: it goes in views.create.afterSave or views.update.afterSave.",
    ])
    expect(
      messagesOf({ storage: "local", views: { list: { tabs: { items: [] } } } })
    ).toEqual([
      "error views.list: `tabs` does not belong here: it goes in views.read.tabs or views.update.tabs.",
    ])
  })

  it("refuses a resource with nowhere to read its data from", () => {
    expect(messagesOf({ name: "Tasks" })).toEqual([
      expect.stringContaining(
        'error (root): no data source. Declare `path: "/api/…"` to talk to the API, or `storage: "local"`'
      ),
    ])
    expect(messagesOf({ components: { view: () => null } })).toEqual([])
    expect(
      messagesOf({
        repository: {
          getCollection: vi.fn(),
          getItem: vi.fn(),
          createItem: vi.fn(),
          updateItem: vi.fn(),
          removeItem: vi.fn(),
        },
      })
    ).toEqual([])
  })

  it("refuses a resource kept both behind an API and in the browser", () => {
    expect(messagesOf({ path: "/api/tasks", storage: "local" })).toEqual([
      'error (root): `path` and `storage: "local"` both say where the data lives: keep one.',
    ])
  })

  it("refuses two layouts answering to the same URL id", () => {
    expect(
      messagesOf({
        storage: "local",
        form: { inputs: {} },
        views: {
          list: { layouts: [layout.table(), layout.table({ label: "Compact" })] },
        },
      })
    ).toEqual([
      'error views.list.layouts: two layouts answer to the URL id "table": give one of them an `id`.',
    ])
  })

  it("refuses a permission that is not an action", () => {
    expect(messagesOf({ storage: "local", permissions: { delte: false } })).toEqual([
      'error permissions: "delte" is not an action — did you mean "delete"?',
    ])
    expect(messagesOf({ storage: "local", permissions: "read-only" })).toEqual([
      'error permissions: "read-only" is not a permission shortcut: "all" or "readonly".',
    ])
  })

  it("warns about a title the view would get anyway", () => {
    expect(
      messagesOf({ storage: "local", views: { update: { title: "Edit — Tasks" } } })
    ).toEqual([
      'warning views.update.title: "Edit — Tasks" is the title this view gets anyway: the line can go.',
    ])
  })

  it("only warns about it, and still builds the resource", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const resource = createViewResource("validate_warned", {
      name: "Tasks",
      storage: "local",
      views: { list: { title: "Tasks" } },
    })

    expect(resource.views.list.title).toBe("Tasks")
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("views.list.title"))
    warn.mockRestore()
  })
})

describe("the options of the list", () => {
  it("take the selection, its actions and the sort, for every layout", () => {
    expect(
      messagesOf({
        storage: "local",
        components: { error: () => null },
        views: {
          list: {
            selectable: true,
            bulkActions: ["delete"],
            sort: { fields: ["title"], initial: { title: "asc" } },
          },
        },
      })
    ).toEqual([])
  })

  it("say where the selection goes when written on another action", () => {
    expect(
      messagesOf({ storage: "local", views: { update: { bulkActions: [] } } })
    ).toContainEqual(expect.stringContaining("it goes in views.list.bulkActions"))
  })
})

describe("the development checks of tabs", () => {
  const tabs = (...items: object[]) => ({
    storage: "local",
    views: { read: { tabs: { items } } },
  })

  it("refuses a tab with neither resource nor component", () => {
    expect(messagesOf(tabs({ label: "Empty" }))).toEqual([
      expect.stringContaining(
        "error views.read.tabs.items[0]: a tab needs a `resource`"
      ),
    ])
  })

  it("refuses a tab whose resource id is unknown", () => {
    expect(messagesOf(tabs({ resource: "nope" }))).toEqual([
      expect.stringContaining(
        'error views.read.tabs.items[0].resource: "nope" is not a known resource'
      ),
    ])
  })

  it("accepts a component, or the resource itself", () => {
    expect(messagesOf(tabs({ component: () => null }))).toEqual([])
    expect(messagesOf(tabs({ resource: { "@id": "/x" } }))).toEqual([])
    expect(messagesOf(tabs({ resource: "tasks" }))).toEqual([])
  })
})

describe("the development checks of layout.*", () => {
  it("refuses a board that does not know what to group by", () => {
    expect(() =>
      // @ts-expect-error — `groupBy` and `columns` are missing
      layout.board({})
    ).toThrow(/a board needs `groupBy`[\s\S]*a board needs `columns`/)
  })

  it("refuses a chart that measures nothing", () => {
    expect(() => layout.chart({})).toThrow(/a chart needs `groupBy`/)
    expect(() => layout.chart({ groupBy: "status" })).not.toThrow()
    expect(() => layout.chart({ dateField: "createdAt" })).not.toThrow()
  })

  it("refuses cards outside 1 to 6 columns", () => {
    // @ts-expect-error — 8 is not a number of columns
    expect(() => layout.cards({ columns: 8 })).toThrow(/from 1 to 6 — not 8/)
    expect(() => layout.cards({ columns: 6 })).not.toThrow()
    expect(() => layout.cards()).not.toThrow()
  })

  it("rewrites a 0.x option of a layout", () => {
    expect(() =>
      // @ts-expect-error — a 0.x option
      layout.board({ identifierKey: "status", columns: [] })
    ).toThrow(
      "`identifierKey` is a 0.x key (RV1-LAYOUT-004): this option of `layout.board` was renamed: `identifierKey` → `groupBy`"
    )
    expect(() =>
      // @ts-expect-error — a 0.x option
      layout.board({ groupBy: "status", columns: [], openRecordIn: "drawer" })
    ).toThrow("where `views.read.open` says")
    expect(() =>
      // @ts-expect-error — where a card opens is the read view's to say
      layout.board({ groupBy: "status", columns: [], openRecord: "drawer" })
    ).toThrow(
      "`openRecord` is a 0.x key (RV1-LAYOUT-013): a card opens the record's `read` view where that view says"
    )
    expect(() =>
      // @ts-expect-error — the selection is the list's
      layout.board({ groupBy: "status", columns: [], bulkActions: [] })
    ).toThrow(
      "`bulkActions` is a 0.x key (RV1-LAYOUT-014): the selection is the list's, for every layout"
    )
    // @ts-expect-error — a 0.x option
    expect(() => layout.cards({ grid: 3 })).toThrow("`grid` → `columns`")
    // @ts-expect-error — a 0.x option
    expect(() => layout.table({ name: "Table" })).toThrow("RV1-LAYOUT-009")
  })

  it("suggests the closest option for a typo", () => {
    // @ts-expect-error — a typo
    expect(() => layout.calendar({ dateFeild: "dueDate" })).toThrow(
      "`dateFeild` does not exist here — did you mean `dateField`?"
    )
  })
})

describe("the types of a declaration", () => {
  // Never run: the development checks would refuse what follows, which is the
  // point — the type checker refuses it first.
  const neverRun = (declare: () => void) => declare

  interface Task {
    "@id": string
    id: string
    title: string
    status: "todo" | "done"
  }

  it("tells a permission which record it is asked about", () => {
    neverRun(() => {
      createViewResource<Task>("typed_permissions", {
        storage: "local",
        permissions: {
          delete: ({ item }) => item?.status !== "done",
          update: async ({ item }) => Boolean(item?.title),
        },
      })
      createViewResource<Task>("typed_permissions_wrong", {
        storage: "local",
        // @ts-expect-error — not a field of Task
        permissions: { delete: ({ item }) => item?.state !== "done" },
      })
    })
  })

  it("offers each action only what has an effect there", () => {
    neverRun(() => {
      createViewResource<Task>("typed_views", {
        storage: "local",
        titleField: "title",
        views: {
          list: { pageSize: 50, rowActions: ["read", "delete"] },
          create: { open: "drawer", afterSave: "close" },
          update: { afterSave: { redirect: (task) => `/tasks/${task.id}` } },
          read: { tabs: { items: [{ resource: "comments" }] } },
        },
      })
      createViewResource<Task>("typed_views_wrong", {
        storage: "local",
        // @ts-expect-error — not a field of Task
        titleField: "name",
        views: {
          // @ts-expect-error — a list has no `afterSave`
          list: { afterSave: "close" },
          // @ts-expect-error — a deletion has no tabs
          delete: { tabs: { items: [] } },
          // @ts-expect-error — `window` is now `page`
          update: { open: "window" },
        },
      })
    })
  })

  it("checks the field names of a form against the item", () => {
    neverRun(() => {
      createViewResource<Task>("typed_form", {
        storage: "local",
        form: { inputs: { title: { label: "Title" }, status: false } },
      })
    })
  })
})

describe("the 0.x keys the checks recognise", () => {
  it("are those of migrations/1.0.json, with the same rewrite", async () => {
    const { changes } = (await import("../../migrations/1.0.json")).default as {
      changes: {
        id: string
        hint?: string
        detect?: { in: string; key: string }[]
      }[]
    }
    const { LEGACY_HINTS, LEGACY_KEYS } = await import("@/definition/legacyKeys")

    const fromJson = changes.flatMap((change) =>
      change.hint
        ? (change.detect ?? []).map((detect) => [detect.in, detect.key, change.id])
        : []
    )
    expect(LEGACY_KEYS).toEqual(fromJson)
    for (const change of changes) {
      if (change.hint && change.detect)
        expect(LEGACY_HINTS[change.id]).toBe(change.hint)
    }
  })
})

describe("the `path` of a JSON-LD resource", () => {
  it("rejects a relative path, which would be glued to the host", () => {
    expect(messagesOf({ path: "api/books" })).toEqual([
      expect.stringContaining('error path: "api/books" does not start with a `/`'),
    ])
  })

  it("accepts a rooted path and an absolute URL", () => {
    expect(messagesOf({ path: "/api/books" })).toEqual([])
    expect(messagesOf({ path: "https://api.example.com/api/books" })).toEqual([])
  })

  it("leaves the path of another dialect alone", () => {
    expect(
      messagesOf({ path: "books", dialect: { referencesAreIris: false } })
    ).toEqual([])
  })

  it("warns when `realtime: true` has no topic to subscribe to", () => {
    expect(messagesOf({ path: "/v1/books", realtime: true })).toEqual([
      expect.stringContaining('warning realtime: "/v1/books" is not under `/api/`'),
    ])
    expect(messagesOf({ path: "/api/books", realtime: true })).toEqual([])
    expect(
      messagesOf({ path: "/v1/books", realtime: { subscribe: () => () => {} } })
    ).toEqual([])
  })
})

const Frame = () => null

describe("the values of a declaration", () => {
  const withList = (list: Record<string, any>) =>
    messagesOf({ storage: "local", form: { inputs: {} }, views: { list } })
  const withView = (action: string, view: Record<string, any>) =>
    messagesOf({ storage: "local", form: { inputs: {} }, views: { [action]: view } })

  it("refuses a row action that is not one", () => {
    expect(withList({ rowActions: ["edit"] })).toEqual([
      expect.stringContaining(
        'error views.list.rowActions: "edit" is not a row action. Expected a list of: "read", "update", "delete".'
      ),
    ])
    expect(withList({ rowActions: "update" })[0]).toContain(
      "not a list of row actions"
    )
    expect(withList({ rowActions: ["read", "update", "delete"] })).toEqual([])
  })

  it("refuses a frame nobody knows, and lists the admitted ones", () => {
    expect(withView("update", { open: "modal" })[0]).toContain(
      'Expected one of: "page", "dialog", "drawer"'
    )
    expect(withView("read", { open: "drawer" })).toEqual([])
  })

  it("accepts a registered frame, and a frame of one's own", () => {
    configureResourceView({
      open: { accordion: open.custom({ type: "accordion", component: Frame }) },
    })
    try {
      expect(withView("read", { open: "accordion" })).toEqual([])
      expect(withView("read", { open: "acordion" })[0]).toContain(
        'did you mean "accordion"?'
      )
    } finally {
      configureResourceView({})
    }
    expect(
      withView("read", { open: open.custom({ type: "popover", component: Frame }) })
    ).toEqual([])
    expect(withView("read", { open: { type: "popover" } })[0]).toContain(
      "open.custom"
    )
  })

  it("refuses an afterSave that is not one", () => {
    expect(withView("update", { afterSave: "closed" })[0]).toContain(
      'did you mean "close"?'
    )
    expect(withView("update", { afterSave: { redirect: "/x" } })).toHaveLength(1)
    expect(withView("update", { afterSave: { redirect: () => "/x" } })).toEqual([])
    expect(withView("create", { afterSave: "reload" })).toEqual([])
  })

  it("refuses a pageSize that is not a whole number", () => {
    expect(withList({ pageSize: "20" })[0]).toContain('not "20"')
    expect(withList({ pageSize: 0 })).toHaveLength(1)
    expect(withList({ pageSize: 2.5 })).toHaveLength(1)
    expect(withList({ pageSize: 20 })).toEqual([])
  })

  it("refuses a permission that is neither a boolean nor a function", () => {
    expect(
      messagesOf({
        storage: "local",
        form: { inputs: {} },
        permissions: { delete: "no" },
      })
    ).toEqual([
      expect.stringContaining('error permissions.delete: "no" is not a permission'),
    ])
    expect(
      messagesOf({
        storage: "local",
        form: { inputs: {} },
        permissions: { delete: () => true, update: false },
      })
    ).toEqual([])
  })

  it("refuses layouts that are not a list", () => {
    expect(withList({ layouts: layout.table() })[0]).toContain("`layouts` is a list")
    expect(withList({ layouts: [layout.table()] })).toEqual([])
  })

  it("warns of a declared table without a form, unless a level gives one", () => {
    const noForm = (definition: Record<string, any>) =>
      messagesOf({ storage: "local", ...definition })

    expect(noForm({})).toEqual([])
    expect(noForm({ views: { list: { layouts: [layout.table()] } } })).toEqual([
      expect.stringContaining(
        "warning views.list.layouts: a table draws its columns"
      ),
    ])
    expect(noForm({ views: { list: { layouts: [layout.cards()] } } })).toEqual([])
    expect(noForm({ views: { list: { form: { inputs: {} } } } })).toEqual([])
    expect(
      noForm({
        views: { list: { layouts: [layout.table({ form: { inputs: {} } })] } },
      })
    ).toEqual([])
  })
})

describe("the fields a declaration names", () => {
  const form = { inputs: { title: {}, status: {}, dueDate: {} } }
  const list = (view: Record<string, any>, root: Record<string, any> = {}) =>
    messagesOf({ storage: "local", form, views: { list: view }, ...root })

  it("warn about a `groupBy` that is not an input, with the closest one", () => {
    expect(
      list({ layouts: [layout.board({ groupBy: "statuss" as never, columns: [] })] })
    ).toEqual([
      "warning views.list.layouts.board.groupBy: `statuss` is not an input of the form — did you mean `status`?",
    ])
  })

  it("warn about a layout `fields` that is not an input", () => {
    expect(
      list({ layouts: [layout.table({ fields: ["titel"] as never })] })
    ).toEqual([
      "warning views.list.layouts.table.fields: `titel` is not an input of the form — did you mean `title`?",
    ])
  })

  it("warn about a `sort.fields` that is not an input", () => {
    expect(list({ sort: { fields: ["titel"] } })).toEqual([
      "warning views.list.sort.fields: `titel` is not an input of the form — did you mean `title`?",
    ])
  })

  it("warn about a `titleField` that is not an input", () => {
    expect(list({}, { titleField: "titel" })).toEqual([
      "warning titleField: `titel` is not an input of the form — did you mean `title`?",
    ])
  })

  it("let the inputs through, and say nothing without a form", () => {
    expect(
      list({
        sort: { fields: ["title"] },
        layouts: [
          layout.board({ groupBy: "status", columns: [] }),
          layout.table({ fields: ["title"] }),
        ],
      })
    ).toEqual([])
    expect(
      messagesOf({
        storage: "local",
        titleField: "titel",
        views: { list: { sort: { fields: ["titel"] } } },
      })
    ).toEqual([])
  })

  it("checks a singleton: one way to name the record, and a view it can open", () => {
    expect(
      messagesOf({ storage: "local", singleton: { get: async () => undefined } })
    ).toEqual([])
    expect(messagesOf({ storage: "local", singleton: { id: "me" } })).toEqual([])
    expect(messagesOf({ storage: "local", singleton: {} })).toEqual([
      expect.stringContaining("name the record with `singleton: { id }`"),
    ])
    expect(
      messagesOf({ storage: "local", singleton: { id: "me", get: () => null } })
    ).toEqual([expect.stringContaining("one of the two, not both")])
    expect(
      messagesOf({ storage: "local", singleton: { id: "me", action: "list" } })
    ).toEqual([
      'error singleton.action: "list" is not a view a singleton opens: "update" or "read".',
    ])
    expect(messagesOf({ storage: "local", singleton: true })).toEqual([
      "error singleton: `singleton` is an object: `{ id }` or `{ get }`.",
    ])
    expect(
      messagesOf({ storage: "local", singleton: { gett: () => 1 } })[0]
    ).toContain("gett")
  })
})

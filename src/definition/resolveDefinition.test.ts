import { afterEach, describe, expect, it } from "vitest"
import { createViewResource } from "@/utils/createViewResource"
import { configureResourceView } from "@/ResourceConfig"
import { layout } from "@/layout/layout"
import { normalizePermissions } from "@/definition/resolveDefinition"

/**
 * What one declaration becomes: the root of the resource, then the action's
 * own options, then the layout — each merged deeply over the one before, with
 * the application's defaults beneath them all.
 */

let count = 0
const id = () => `resolve_${++count}`

const FIELDS = {
  title: { label: "Title", required: true },
  status: { label: "Status" },
  notes: { label: "Notes" },
}

afterEach(() => configureResourceView({ defaults: {} }))

describe("the merge of a declaration", () => {
  it("gives every action what the root declares", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      fullWidth: true,
      form: { inputs: FIELDS },
    })

    for (const action of ["list", "read", "create", "update", "delete"] as const) {
      expect(resource.views[action].fullWidth).toBe(true)
      expect(Object.keys(resource.views[action].form?.inputs ?? {})).toEqual([
        "title",
        "status",
        "notes",
      ])
    }
  })

  it("lets an action adjust one field and keep the others", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      form: { inputs: FIELDS },
      views: { update: { form: { inputs: { title: { label: "Name" } } } } },
    })

    expect(resource.views.update.form?.inputs?.title).toEqual({
      label: "Name",
      required: true,
    })
    expect(resource.views.update.form?.inputs?.status).toEqual({ label: "Status" })
    expect(resource.views.create.form?.inputs?.title).toEqual(FIELDS.title)
  })

  it("lets an action remove a field it inherits with `false`", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      form: { inputs: FIELDS },
      views: { create: { form: { inputs: { notes: false } } } },
    })

    expect(Object.keys(resource.views.create.form?.inputs ?? {})).toEqual([
      "title",
      "status",
    ])
    expect(resource.views.update.form?.inputs?.notes).toEqual(FIELDS.notes)
  })

  // 0.x merged `{ ...view, ...views[action] }`: a view declaring one component
  // lost every other one the resource declared.
  it("keeps the components an action does not name", () => {
    const Top = () => null
    const Bottom = () => null
    const resource = createViewResource(id(), {
      storage: "local",
      components: { top: Top },
      views: { update: { components: { bottom: Bottom } } },
    })

    expect(resource.views.update.components.top).toBe(Top)
    expect(resource.views.update.components.bottom).toBe(Bottom)
  })

  it("removes an inherited component set to null", () => {
    const Top = () => null
    const resource = createViewResource(id(), {
      storage: "local",
      components: { top: Top },
      views: { list: { components: { top: null } } },
    })

    expect(resource.views.list.components.top).toBeUndefined()
    expect(resource.views.read.components.top).toBe(Top)
  })

  it("merges a layout's form over the view's, and keeps the fields it picks", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      form: { inputs: FIELDS },
      views: {
        list: {
          layouts: [
            layout.table({
              fields: ["status", "title"],
              form: { inputs: { status: { label: "State" } } },
            }),
          ],
        },
      },
    })

    const [table] = resource.views.list.layouts
    expect(Object.keys(table.form?.inputs ?? {})).toEqual(["status", "title"])
    expect(table.form?.inputs?.status).toEqual({ label: "State" })
    expect(table.form?.inputs?.title).toEqual(FIELDS.title)
  })

  it("gives a board one column per option of the input it groups by", () => {
    const STATUSES = [
      { value: "todo", label: "To do" },
      { value: "done", label: "Done" },
    ]
    const boardOf = (columns?: typeof STATUSES) =>
      createViewResource(id(), {
        storage: "local",
        form: { inputs: { status: { type: "select", options: STATUSES } } },
        views: {
          list: { layouts: [layout.board({ groupBy: "status", columns })] },
        },
      }).views.list.layouts[0].options.columns

    expect(boardOf()).toEqual(STATUSES)
    expect(boardOf([STATUSES[1]])).toEqual([STATUSES[1]])
  })

  it("keeps a layout's width apart from the view's", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      views: {
        list: {
          fullWidth: false,
          layouts: [
            layout.board({ groupBy: "status", columns: [], fullWidth: true }),
          ],
        },
      },
    })

    expect(resource.views.list.fullWidth).toBe(false)
    expect(resource.views.list.layouts[0].fullWidth).toBe(true)
  })
})

describe("configureResourceView", () => {
  it("merges its defaults beneath every resource", () => {
    configureResourceView({
      defaults: { views: { update: { open: "drawer" }, delete: { open: "page" } } },
    })
    const resource = createViewResource(id(), {
      storage: "local",
      views: { delete: { open: "dialog" } },
    })

    expect(resource.views.update.open.type).toBe("drawer")
    expect(resource.views.delete.open.type).toBe("dialog")
  })

  it("reaches the resources declared before it is called", () => {
    const resource = createViewResource(id(), { storage: "local" })
    expect(resource.views.update.open.type).toBe("page")

    configureResourceView({ defaults: { views: { update: { open: "dialog" } } } })

    expect(resource.views.update.open.type).toBe("dialog")
  })

  // 0.x's `setResourceConfig` merged shallowly: a `defaultResource` erased the
  // components the library drew a list with.
  it("never erases what the library draws with", () => {
    configureResourceView({ defaults: { components: { top: () => null } } })
    const resource = createViewResource(id(), { storage: "local" })

    expect(resource.views.list.components.view).toBeTypeOf("function")
    expect(resource.views.list.layouts[0].components.list).toBeTypeOf("function")
  })

  it("lets a resource's root win over the defaults of one of its views", () => {
    configureResourceView({ defaults: { views: { list: { fullWidth: true } } } })
    const resource = createViewResource(id(), { storage: "local", fullWidth: false })

    expect(resource.views.list.fullWidth).toBe(false)
  })

  it('lets `"all"` lift a restriction the defaults set', () => {
    configureResourceView({ defaults: { permissions: "readonly" } })
    const resource = createViewResource(id(), {
      storage: "local",
      permissions: "all",
    })

    expect(resource.permissions.delete).toBe(true)
  })

  it("restricts every resource with its permissions, unless one says otherwise", () => {
    configureResourceView({ defaults: { permissions: { delete: false } } })
    const locked = createViewResource(id(), { storage: "local" })
    const open = createViewResource(id(), {
      storage: "local",
      permissions: { delete: true },
    })

    expect(locked.permissions.delete).toBe(false)
    expect(open.permissions.delete).toBe(true)
  })
})

describe("normalizePermissions", () => {
  it("allows everything when nothing is declared", () => {
    expect(normalizePermissions(undefined)).toEqual({
      list: true,
      read: true,
      create: true,
      update: true,
      delete: true,
      export: true,
    })
  })

  it('reads "readonly" as list, read and export', () => {
    expect(normalizePermissions("readonly")).toEqual({
      list: true,
      read: true,
      create: false,
      update: false,
      delete: false,
      export: true,
    })
  })

  it("reads a list as those actions and nothing else", () => {
    expect(normalizePermissions(["list", "update"])).toEqual({
      list: true,
      read: false,
      create: false,
      update: true,
      delete: false,
      export: false,
    })
  })

  it("reads an object as restrictions, the rest allowed", () => {
    const rule = () => false
    expect(normalizePermissions({ delete: rule, create: false })).toEqual({
      list: true,
      read: true,
      create: false,
      update: true,
      delete: rule,
      export: true,
    })
  })

  it("keeps `move` only where it is named", () => {
    expect(normalizePermissions({ update: false, move: true })).toMatchObject({
      update: false,
      move: true,
    })
    expect(normalizePermissions(["list", "move"])).toMatchObject({
      update: false,
      move: true,
    })
    expect(normalizePermissions({ move: false }, "readonly")).not.toHaveProperty(
      "move"
    )
  })
})

describe("optimism and the link to the full page", () => {
  it("draw every write before the answer, unless the resource says otherwise", () => {
    const optimistic = createViewResource(id(), { storage: "local" })
    const waiting = createViewResource(id(), {
      storage: "local",
      optimistic: false,
      views: { update: { optimistic: true } },
    })

    expect(optimistic.views.update.optimistic).toBe(true)
    expect(optimistic.views.delete.optimistic).toBe(true)
    expect(waiting.views.delete.optimistic).toBe(false)
    expect(waiting.views.update.optimistic).toBe(true)
  })

  it("take the application's default beneath the resource's", () => {
    configureResourceView({ defaults: { optimistic: false } })
    const resource = createViewResource(id(), {
      storage: "local",
      views: { create: { optimistic: true } },
    })

    expect(resource.views.update.optimistic).toBe(false)
    expect(resource.views.create.optimistic).toBe(true)
  })

  it("offer the full page from read and update, not from create or delete", () => {
    const resource = createViewResource(id(), {
      storage: "local",
      views: { read: { expandable: false }, delete: { expandable: true } },
    })

    expect(resource.views.read.expandable).toBe(false)
    expect(resource.views.update.expandable).toBe(true)
    expect(resource.views.create.expandable).toBe(false)
    expect(resource.views.delete.expandable).toBe(true)
  })
})

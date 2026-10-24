import type {
  FormDefinition,
  Permission,
  PermissionKey,
  Permissions,
  ResourceDefaults,
  ResourceDefinition,
  TabsDefinition,
} from "@/ResourceDefinition"
import type { ResolvedTabs, ResolvedView, ViewResource } from "@/ViewResource"
import type { BoardColumnsContext, Layout, ResolvedLayout } from "@/layout/layout"
import { layout as layouts } from "@/layout/layout"
import { mergeDefinition } from "@/definition/mergeDefinition"
import { columnsFromForm } from "@/definition/boardColumns"
import { toForm } from "@/definition/toForm"
import { derivedTitle } from "@/definition/validateDefinition"
import { lazyComponent } from "@/internal/lazyComponent"
import { resolveOpen, type OpenFrame } from "@/open/open"

// Declaring a resource must not bundle the views it may show: they are loaded
// when the first one is drawn.
const DefaultViewComponent = /* @__PURE__ */ lazyComponent<object>(() =>
  import("@/views/list/component/DefaultViewComponent").then(
    (m) => m.DefaultViewComponent
  )
)

export const ACTIONS = ["list", "read", "create", "update", "delete"] as const
export type ActionName = (typeof ACTIONS)[number]

const PERMISSION_KEYS = [...ACTIONS, "export"] as const

/**
 * One permission per action out of whatever shape was declared — see
 * {@link Permissions}. Anything not restricted is allowed. `move` is kept only
 * where it was named: `update` answers for it otherwise.
 */
export function normalizePermissions(
  ...levels: (Permissions | undefined)[]
): ViewResource["permissions"] {
  const result: ViewResource["permissions"] = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, true])
  ) as Record<(typeof PERMISSION_KEYS)[number], Permission>

  for (const level of levels) {
    if (level === undefined) continue
    if (level === "all") {
      for (const key of PERMISSION_KEYS) result[key] = true
      delete result.move
      continue
    }
    if (level === "readonly") {
      for (const key of PERMISSION_KEYS) {
        result[key] = key === "list" || key === "read" || key === "export"
      }
      delete result.move
      continue
    }
    if (Array.isArray(level)) {
      for (const key of PERMISSION_KEYS) result[key] = level.includes(key)
      if (level.includes("move")) result.move = true
      else delete result.move
      continue
    }
    for (const [key, permission] of Object.entries(level)) {
      if (permission !== undefined) result[key as PermissionKey] = permission
    }
  }

  return result
}

function resolveLayout(
  layout: Layout,
  viewForm: FormDefinition | undefined
): ResolvedLayout {
  const form = layout.form
    ? mergeDefinition<FormDefinition>(viewForm, layout.form)
    : viewForm

  // A board that names no columns takes the options of the input it groups by.
  const formColumns = columnsFromForm(form, layout.options.groupBy)
  const columns = layout.options.columns
  const options =
    layout.type !== "board"
      ? layout.options
      : !columns
        ? { ...layout.options, columns: formColumns }
        : typeof columns === "function"
          ? {
              ...layout.options,
              columns: (context: BoardColumnsContext) =>
                columns({ ...context, defaults: formColumns ?? [] }),
            }
          : layout.options

  return {
    ...layout,
    options,
    form: toForm(form, layout.fields),
  }
}

function resolveTabs(tabs: TabsDefinition | undefined): ResolvedTabs | undefined {
  if (!tabs) return undefined

  return {
    orientation: tabs.orientation ?? "horizontal",
    aside: tabs.aside,
    items: tabs.items ?? [],
  }
}

/** The keys of a declaration that every action inherits. */
const COMMON_KEYS = [
  "form",
  "fullWidth",
  "titleField",
  "className",
  "components",
  "description",
] as const

function pickCommon(level: Record<string, any> | undefined): Record<string, any> {
  if (!level) return {}

  return Object.fromEntries(
    COMMON_KEYS.filter((key) => level[key] !== undefined).map((key) => [
      key,
      level[key],
    ])
  )
}

/**
 * The five views of a resource: the library's defaults, then the application's
 * (`configureResourceView`), then the resource's root, then the action's own
 * options — each level merged deeply over the one before. `frames` are the
 * frames registered by name, which `open: "accordion"` refers to.
 */
export function resolveViews(
  definition: ResourceDefinition,
  defaults: ResourceDefaults | undefined,
  name: string,
  frames?: Record<string, OpenFrame>
): Record<ActionName, ResolvedView> {
  return Object.fromEntries(
    ACTIONS.map((action) => {
      const own = mergeDefinition<Record<string, any>>(
        defaults?.views?.[action],
        definition.views?.[action]
      )
      // The application's defaults come first, its root then its action;
      // the resource's root then its action over them.
      const merged = mergeDefinition<Record<string, any>>(
        pickCommon(defaults),
        defaults?.views?.[action],
        pickCommon(definition),
        definition.views?.[action]
      )
      const form = merged.form as FormDefinition | undefined

      const declaredLayouts: Layout[] | undefined = merged.layouts
      const resolvedLayouts =
        action === "list"
          ? (declaredLayouts?.length ? declaredLayouts : [layouts.table()]).map(
              (layout) => resolveLayout(layout, form)
            )
          : []

      const view: ResolvedView = {
        action,
        id: action,
        title: own.title ?? derivedTitle(action, name),
        description: merged.description,
        buttonLabel: own.buttonLabel,
        fullWidth: merged.fullWidth ?? false,
        className: merged.className,
        titleField: merged.titleField,
        // The only place the frame of a view is decided: the button, the
        // board's card, the route and the form all read this one.
        open: resolveOpen(own.open, frames, action === "delete" ? "dialog" : "page"),
        expandable: own.expandable ?? (action === "read" || action === "update"),
        optimistic:
          own.optimistic ?? definition.optimistic ?? defaults?.optimistic ?? true,
        afterSave: own.afterSave,
        form: toForm(form),
        components: {
          view: DefaultViewComponent,
          ...withoutNulls(merged.components),
        },
        layouts: resolvedLayouts,
        filters: merged.filters,
        pageSize: merged.pageSize,
        empty: merged.empty,
        rowActions: merged.rowActions ?? ["update", "delete"],
        sort: merged.sort,
        selectable: merged.selectable,
        bulkActions: merged.bulkActions ?? [],
        presets: action === "list" ? (merged.presets ?? []) : [],
        savedViews: action === "list" && merged.savedViews === true,
        tabs: resolveTabs(merged.tabs),
      }

      return [action, view]
    })
  ) as Record<ActionName, ResolvedView>
}

/** `components: { top: null }` removes an inherited component. */
function withoutNulls<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {}

  return Object.fromEntries(
    Object.entries(value).filter(([, component]) => component !== null)
  ) as Partial<T>
}

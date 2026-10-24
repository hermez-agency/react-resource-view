import type { FilterInterface } from "@/views/list/filter/useFilter"
import type { SortState } from "@/ResourceDefinition"

/** What a view remembers of the columns a table shows: their order, and those hidden. */
export interface SavedViewColumns {
  /** The fields in the order they come. */
  order?: string[]
  /** The fields left out. */
  hidden?: string[]
}

/**
 * A combination of filters, sort, layout and columns, under a name — what
 * `views.list.presets` declares in code and what a reader saves with
 * `views.list.savedViews`.
 */
export interface ListPreset<Item = any> {
  /**
   * What the URL carries (`?savedView=late-tasks`). Defaults to the name,
   * written as a slug: give one when the name may be renamed without breaking
   * the links shared.
   */
  id?: string
  /** The tab's label. */
  name: string
  /** The filters applied, as the filter bar and the URL spell them. */
  filter?: FilterInterface
  /** The sort the rows come in. */
  sort?: SortState<Item>
  /** The `id` of one of the list's layouts. */
  layout?: string
  /** The columns of a table. */
  columns?: SavedViewColumns
}

/** A view a reader saved: a preset the store gave an `id`. */
export interface SavedView<Item = any> extends ListPreset<Item> {
  id: string
}

/** What is given to the store to save a view: the store chooses its `id`. */
export type SavedViewInput<Item = any> = Omit<SavedView<Item>, "id">

type MaybePromise<T> = T | Promise<T>

/**
 * Where the views readers save are kept — `configurePorts({ savedViews })`.
 * Every method may be asynchronous. The default keeps them in the browser's
 * `localStorage`, per resource; an API that shares them between users
 * implements these four calls:
 *
 * ```ts
 * configurePorts({
 *   savedViews: {
 *     list: (resource) => fetch(`/api/saved-views?resource=${resource}`).then((r) => r.json()),
 *     create: (resource, view) =>
 *       fetch("/api/saved-views", {
 *         method: "POST",
 *         headers: { "Content-Type": "application/json" },
 *         body: JSON.stringify({ ...view, resource }),
 *       }).then((r) => r.json()),
 *     update: (resource, id, changes) =>
 *       fetch(`/api/saved-views/${id}`, {
 *         method: "PATCH",
 *         headers: { "Content-Type": "application/json" },
 *         body: JSON.stringify(changes),
 *       }).then((r) => r.json()),
 *     remove: (resource, id) =>
 *       fetch(`/api/saved-views/${id}`, { method: "DELETE" }).then(() => undefined),
 *   },
 * })
 * ```
 */
export interface SavedViewsStoreInterface {
  /** The views saved for a resource, in the order the tabs come. */
  list: (resourceId: string) => MaybePromise<SavedView[]>
  /** Saves a new view and returns it with its `id`. */
  create: (resourceId: string, view: SavedViewInput) => MaybePromise<SavedView>
  /** Changes a view — its name, or the state it remembers — and returns it. */
  update: (
    resourceId: string,
    id: string,
    changes: Partial<SavedViewInput>
  ) => MaybePromise<SavedView>
  /** Forgets a view. */
  remove: (resourceId: string, id: string) => MaybePromise<void>
}

const STORAGE_PREFIX = "react-resource-view:saved-views:"

/** One entry per resource. */
export function savedViewsKey(resourceId: string): string {
  return STORAGE_PREFIX + resourceId
}

function readAll(resourceId: string): SavedView[] {
  if (typeof window === "undefined") return []

  try {
    const value = JSON.parse(
      window.localStorage.getItem(savedViewsKey(resourceId)) ?? "[]"
    )
    return Array.isArray(value)
      ? value.filter((view) => view && typeof view.id === "string")
      : []
  } catch {
    return []
  }
}

function writeAll(resourceId: string, views: SavedView[]) {
  try {
    window.localStorage.setItem(savedViewsKey(resourceId), JSON.stringify(views))
  } catch {
    throw new Error("The saved views could not be written to the local storage.")
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

/** The default store: the browser's `localStorage`, one entry per resource. */
export const localSavedViewsStore: SavedViewsStoreInterface = {
  list: readAll,
  create: (resourceId, view) => {
    const created = { ...view, id: newId() }
    writeAll(resourceId, [...readAll(resourceId), created])
    return created
  },
  update: (resourceId, id, changes) => {
    const views = readAll(resourceId)
    const current = views.find((view) => view.id === id)
    if (!current) throw new Error(`The saved view "${id}" does not exist.`)
    const updated = { ...current, ...changes, id }
    writeAll(
      resourceId,
      views.map((view) => (view.id === id ? updated : view))
    )
    return updated
  },
  remove: (resourceId, id) => {
    writeAll(
      resourceId,
      readAll(resourceId).filter((view) => view.id !== id)
    )
  },
}

/** A name as a URL carries it: `Late tasks` → `late-tasks`. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** The presets of a list with their `id`, the one the URL carries. */
export function withPresetIds<Item>(presets: ListPreset<Item>[]): SavedView<Item>[] {
  return presets.map((preset) => ({
    ...preset,
    id: preset.id ?? (slugify(preset.name) || "preset"),
  }))
}

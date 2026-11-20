import { getInStorage, removeInStorage, setInStorage } from "ssr-safe-storage"

/**
 * What a reader changed in the fields a list shows, for one resource: the
 * fields they hid, and those hidden by default (`views.list.fields.hidden`)
 * they chose to show. The declaration stays the default — nothing stored, the
 * fields it hides are hidden and every other one is shown.
 *
 * A field is a data key, nested ones written with dots: `price`, `user.name`.
 * Hiding `user` hides everything under it.
 */
export interface FieldVisibilityState {
  /** The fields the reader hid. */
  hidden: string[]
  /** The fields hidden by default the reader showed. */
  shown: string[]
}

type MaybePromise<T> = T | Promise<T>

/**
 * Where the fields a reader hides are kept — `configurePorts({ fieldVisibility })`.
 * `read` and `write` may be asynchronous. The default keeps them in the
 * browser's `localStorage`, one entry per resource; an API that keeps them
 * per user implements the same calls:
 *
 * ```ts
 * configurePorts({
 *   fieldVisibility: {
 *     read: (resource) =>
 *       fetch(`/api/field-visibility/${resource}`).then((r) => (r.ok ? r.json() : null)),
 *     write: (resource, state) =>
 *       fetch(`/api/field-visibility/${resource}`, {
 *         method: state ? "PUT" : "DELETE",
 *         headers: { "Content-Type": "application/json" },
 *         body: state ? JSON.stringify(state) : undefined,
 *       }).then(() => undefined),
 *   },
 * })
 * ```
 */
export interface FieldVisibilityStoreInterface {
  /** What the reader changed for a resource, or `null` when nothing. */
  read: (resourceId: string) => MaybePromise<FieldVisibilityState | null>
  /** Keeps what the reader changed; `null` goes back to the declaration. */
  write: (
    resourceId: string,
    state: FieldVisibilityState | null
  ) => MaybePromise<void>
  /**
   * Calls `listener` when the state of a resource changed elsewhere — another
   * tab, another device — and returns what stops it. Optional: without it, a
   * list reads the store when it opens.
   */
  subscribe?: (resourceId: string, listener: () => void) => () => void
}

const STORAGE_PREFIX = "react-resource-view:fields:"

/** One entry per resource, shared by all its layouts. */
export function fieldVisibilityKey(resourceId: string): string {
  return STORAGE_PREFIX + resourceId
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : []

/** A state as a store may hand it back: anything else is no state. */
export function normaliseFieldVisibility(
  value: unknown
): FieldVisibilityState | null {
  if (!value || typeof value !== "object") return null
  const state = value as Record<string, unknown>

  return { hidden: strings(state.hidden), shown: strings(state.shown) }
}

const localListeners = new Map<string, Set<() => void>>()

function notifyLocal(resourceId: string) {
  localListeners.get(resourceId)?.forEach((listener) => listener())
}

/** The default store: the browser's `localStorage`, one entry per resource. */
export const localFieldVisibilityStore: FieldVisibilityStoreInterface = {
  read: (resourceId) => {
    try {
      return normaliseFieldVisibility(getInStorage(fieldVisibilityKey(resourceId)))
    } catch {
      // Unreadable entry, or storage disabled: the declaration.
      return null
    }
  },
  write: (resourceId, state) => {
    try {
      if (state) setInStorage(fieldVisibilityKey(resourceId), state)
      else removeInStorage(fieldVisibilityKey(resourceId))
    } catch {
      // Storage disabled or full: the list just forgets the reader's fields.
    }
    notifyLocal(resourceId)
  },
  subscribe: (resourceId, listener) => {
    const listeners = localListeners.get(resourceId) ?? new Set()
    listeners.add(listener)
    localListeners.set(resourceId, listeners)
    // Another tab changed them: this one follows.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === fieldVisibilityKey(resourceId)) {
        listener()
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage)
    }
    return () => {
      listeners.delete(listener)
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage)
      }
    }
  },
}

/** `user.address.city` → `user`, `user.address`, `user.address.city`. */
export function fieldPathsOf(field: string): string[] {
  const parts = field.split(".")
  return parts.map((_, index) => parts.slice(0, index + 1).join("."))
}

/** The fields hidden on screen: those hidden by default and not shown since, and those the reader hid. */
export function hiddenFields(
  state: FieldVisibilityState | null,
  defaults: readonly string[] = []
): string[] {
  const shown = new Set(state?.shown ?? [])
  return [
    ...new Set([
      ...defaults.filter((field) => !shown.has(field)),
      ...(state?.hidden ?? []),
    ]),
  ]
}

/** Whether a field is shown: neither it nor anything it sits under is hidden. */
export function isFieldVisible(field: string, hidden: readonly string[]): boolean {
  if (!hidden.length) return true
  return !fieldPathsOf(field).some((path) => hidden.includes(path))
}

/**
 * The state once `field` is hidden or shown. Showing a field shows what it
 * sits under too — `user.name` cannot be on screen without `user` — but not
 * what sits under it that was hidden on its own.
 */
export function withFieldVisible(
  state: FieldVisibilityState | null,
  defaults: readonly string[],
  field: string,
  visible: boolean
): FieldVisibilityState {
  const hidden = new Set(state?.hidden ?? [])
  const shown = new Set(state?.shown ?? [])

  if (visible) {
    for (const path of fieldPathsOf(field)) {
      hidden.delete(path)
      if (defaults.includes(path)) shown.add(path)
    }
  } else {
    hidden.add(field)
    shown.delete(field)
  }

  return { hidden: [...hidden], shown: [...shown] }
}

/** The state that hides exactly `hidden`, whatever the declaration hides. */
export function fieldVisibilityFromHidden(
  hidden: readonly string[],
  defaults: readonly string[]
): FieldVisibilityState {
  return {
    hidden: [...hidden],
    shown: defaults.filter((field) => !hidden.includes(field)),
  }
}

/* -------------------------------------------------------------------------- */
/* Columns hidden before 2.2                                                  */
/* -------------------------------------------------------------------------- */

const LEGACY_COLUMNS_PREFIX = "react-resource-view:columns:"

/**
 * The columns a reader unchecked in a table before the fields were shared by
 * every layout, kept per layout under
 * `react-resource-view:columns:<resource>:<layout>`. Read when a resource has
 * no field state yet: what was hidden in any of its tables is hidden
 * everywhere. `clear` then leaves the tables only their order, once the state
 * is written. `null` when there is nothing to carry over.
 */
export function readLegacyHiddenColumns(
  resourceId: string
): { hidden: string[]; clear: () => void } | null {
  if (typeof window === "undefined") return null

  const prefix = LEGACY_COLUMNS_PREFIX + resourceId + ":"
  const hidden = new Set<string>()
  const entries: { key: string; order: string[] }[] = []
  try {
    const storage = window.localStorage
    const keys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter(
      (key): key is string =>
        !!key && key.startsWith(prefix) && !key.slice(prefix.length).includes(":")
    )
    for (const key of keys) {
      const value = JSON.parse(storage.getItem(key) ?? "null")
      const columns = strings(value?.hidden)
      if (!columns.length) continue
      columns.forEach((column) => hidden.add(column))
      entries.push({ key, order: strings(value?.order) })
    }
  } catch {
    return null
  }
  if (!hidden.size) return null

  return {
    hidden: [...hidden],
    clear: () => {
      try {
        for (const { key, order } of entries) {
          window.localStorage.setItem(key, JSON.stringify({ order }))
        }
      } catch {
        // Left as they are: read again, they hide nothing more.
      }
    },
  }
}

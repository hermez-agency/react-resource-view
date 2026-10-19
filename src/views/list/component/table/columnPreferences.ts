import { useCallback, useSyncExternalStore } from "react"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"

/**
 * What a reader changed in a table's columns: their order, and those hidden.
 * The declaration stays the default — nothing stored, the columns it declares
 * in the order it declares them.
 */
export interface ColumnPreferences {
  /** The fields in the order the reader put them. */
  order: string[]
  /** The fields the reader unchecked. */
  hidden: string[]
}

const STORAGE_PREFIX = "react-resource-view:columns:"

/** One entry per resource and layout: `tasks` in `table` is not `tasks` in `compact`. */
export function columnPreferencesKey(resourceId: string, layoutId: string): string {
  return STORAGE_PREFIX + resourceId + ":" + layoutId
}

const listeners = new Set<() => void>()
// `useSyncExternalStore` wants the same object back as long as nothing
// changed: the parsed entries are kept by their raw string.
const parsed = new Map<string, { raw: string; value: ColumnPreferences }>()

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function readColumnPreferences(key: string): ColumnPreferences | null {
  const raw = readRaw(key)
  if (raw === null) return null

  const cached = parsed.get(key)
  if (cached?.raw === raw) return cached.value

  try {
    const value = JSON.parse(raw)
    const preferences: ColumnPreferences = {
      order: Array.isArray(value?.order) ? value.order.map(String) : [],
      hidden: Array.isArray(value?.hidden) ? value.hidden.map(String) : [],
    }
    parsed.set(key, { raw, value: preferences })
    return preferences
  } catch {
    return null
  }
}

export function writeColumnPreferences(
  key: string,
  preferences: ColumnPreferences | null
) {
  if (typeof window === "undefined") return

  try {
    if (preferences) {
      window.localStorage.setItem(key, JSON.stringify(preferences))
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Storage disabled or full: the table just forgets the reader's columns.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changed them: this one follows.
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

/**
 * The declared fields as the reader arranged them, hidden ones included. A
 * field declared since is added where the declaration puts it — after the
 * field it follows — and a field no longer declared is dropped.
 */
export function arrangeColumns(
  declared: string[],
  preferences: ColumnPreferences | null
): { field: string; visible: boolean }[] {
  if (!preferences) return declared.map((field) => ({ field, visible: true }))

  const ordered = preferences.order.filter((field) => declared.includes(field))
  declared.forEach((field, index) => {
    if (ordered.includes(field)) return
    const previous = declared[index - 1]
    const at = previous === undefined ? 0 : ordered.indexOf(previous) + 1
    ordered.splice(at, 0, field)
  })

  return ordered.map((field) => ({
    field,
    visible: !preferences.hidden.includes(field),
  }))
}

/** The field a column shows: the input's `name`, or its `id`. */
export function fieldOfInput(input: { name?: unknown; id?: unknown }): string {
  return String(input.name ?? input.id)
}

/** `fields` moved from `from` to `to`. */
export function moveColumn(fields: string[], from: number, to: number): string[] {
  const next = [...fields]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * The columns of the table on screen, as the reader left them for this
 * resource and this layout, and what changes them.
 */
export function useColumnPreferences(declared: string[]) {
  const { resourceId, layout } = useCurrentViewResourceContext()
  const key = columnPreferencesKey(String(resourceId), layout?.id ?? "table")

  const preferences = useSyncExternalStore(
    subscribe,
    () => readColumnPreferences(key),
    () => null
  )
  const columns = arrangeColumns(declared, preferences)

  const save = useCallback(
    (next: { field: string; visible: boolean }[]) =>
      writeColumnPreferences(key, {
        order: next.map((column) => column.field),
        hidden: next
          .filter((column) => !column.visible)
          .map((column) => column.field),
      }),
    [key]
  )

  return {
    columns,
    /** Whether the reader changed anything: the declaration is on screen otherwise. */
    customised: preferences !== null,
    /** Sorts and filters inputs — the header's, a row's — as the reader wants them. */
    arrange: <Input extends { name?: unknown; id?: unknown }>(
      inputs: Input[]
    ): Input[] =>
      columns
        .filter((column) => column.visible)
        .map((column) =>
          inputs.find((input) => fieldOfInput(input) === column.field)
        )
        .filter((input): input is Input => input !== undefined),
    toggle: (field: string, visible: boolean) =>
      save(
        columns.map((column) =>
          column.field === field ? { ...column, visible } : column
        )
      ),
    move: (from: number, to: number) => {
      if (from === to || to < 0 || to >= columns.length) return
      save(
        moveColumn(
          columns.map((column) => column.field),
          from,
          to
        ).map((field) => columns.find((column) => column.field === field)!)
      )
    },
    /** Back to the declaration. */
    reset: () => writeColumnPreferences(key, null),
  }
}

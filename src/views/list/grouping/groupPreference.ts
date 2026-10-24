import { useCallback, useSyncExternalStore } from "react"
import { createForm, getFormInputsFromForm } from "react-data-form"
import type { ValueOptionInterface } from "react-data-form"
import { translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { fieldOfInput } from "@/views/list/component/table/columnPreferences"

const STORAGE_PREFIX = "react-resource-view:groupby:"

/** One entry per resource and layout, as the columns' are. */
export function groupPreferenceKey(resourceId: string, layoutId: string): string {
  return STORAGE_PREFIX + resourceId + ":" + layoutId
}

const listeners = new Set<() => void>()

/**
 * The field the reader grouped by; `""` when they chose not to group at all;
 * `null` when they chose nothing, and the declaration stands.
 */
export function readGroupPreference(key: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeGroupPreference(key: string, field: string | null) {
  if (typeof window === "undefined") return

  try {
    if (field === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, field)
  } catch {
    // Storage disabled or full: the list just forgets the reader's grouping.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changed it: this one follows.
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

/** A field the reader may group by: a select, whose options make the sections. */
export interface GroupableField {
  field: string
  label: string
}

/**
 * How the list on screen is grouped: by the field the reader picked in the
 * Properties menu, else by the one the layout declares.
 */
export function useGroupBy(declared: string | undefined, layoutId: string) {
  const { resourceId, view } = useCurrentViewResourceContext()
  const key = groupPreferenceKey(String(resourceId), layoutId)
  const stored = useSyncExternalStore(
    subscribe,
    () => readGroupPreference(key),
    () => null
  )

  const inputs = view.form
    ? getFormInputsFromForm(createForm(view.form)).filter(
        (input) => !input.generatedValue
      )
    : []
  const optionsOf = (field: string): ValueOptionInterface[] | undefined => {
    const input = inputs.find((candidate) => fieldOfInput(candidate) === field)
    const options = (input as { options?: unknown } | undefined)?.options
    return Array.isArray(options) && options.length ? options : undefined
  }

  const field = stored === null ? declared : stored || undefined
  const groupable: GroupableField[] = inputs
    .filter(
      (input) => optionsOf(fieldOfInput(input)) || fieldOfInput(input) === declared
    )
    .map((input) => ({
      field: fieldOfInput(input),
      label: translate(String(input.label ?? input["name"] ?? input.id)),
    }))

  const select = useCallback(
    (next: string | undefined) => writeGroupPreference(key, next ?? ""),
    [key]
  )
  const reset = useCallback(() => writeGroupPreference(key, null), [key])

  return {
    /** The field the list is grouped by; `undefined` for a flat list. */
    field,
    /** The labels of its sections, from the options of its input. */
    options: field ? optionsOf(field) : undefined,
    groupable,
    customised: stored !== null,
    select,
    reset,
  }
}

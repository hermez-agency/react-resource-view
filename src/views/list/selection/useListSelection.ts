import { SetStateAction, useEffect, useState } from "react"
import { BaseJsonLdItemInterface } from "jsonld-item"
import { RowInterface } from "@/ViewResource"
import type { ResolvedLayout } from "@/layout/layout"
import getIdFromObject from "@/internal/id/getIdFromObject"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"

/**
 * The records selected in a list, whatever its layout: the table's checkboxes,
 * the cards', the board's. The bulk actions run on them.
 */
export interface ListSelectionInterface {
  /** Whether the list on screen lets its records be selected. */
  selectable: boolean
  /** The ids of the selected records, in the order they were selected. */
  selected: string[]
  setSelected: (value: SetStateAction<string[]>) => void
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  clear: () => void
  /** The id a row is selected by. */
  idOf: (row: RowInterface) => string
  rowsOf: (ids: string[]) => RowInterface[]
  /** Whether every row given — a page — is selected. */
  areAllSelected: (rows: RowInterface[]) => boolean
  /** Selects every row given, or none of them if they all are already. */
  toggleAll: (rows: RowInterface[]) => void
}

/**
 * Whether a list can be selected: never in a layout that draws no selection
 * (`supports: ["selection"]`); otherwise as `views.list.selectable` says, and
 * otherwise on a board — its cards are moved together — or when the list
 * declares bulk actions.
 */
export function isListSelectable(
  selectable: boolean | undefined,
  layout: Pick<ResolvedLayout, "type" | "supports"> | undefined,
  bulkActionCount: number
): boolean {
  if (layout && !layout.supports?.includes("selection")) return false
  if (selectable !== undefined) return selectable
  return layout?.type === "board" || bulkActionCount > 0
}

export function useListSelection(rows: RowInterface[]): ListSelectionInterface {
  const currentResource = useCurrentViewResourceContext()
  const { resource, view, layout } = currentResource
  const selectable = isListSelectable(
    view.selectable,
    layout,
    view.bulkActions?.length ?? 0
  )

  const [rawSelected, setSelected] = useState<string[]>([])

  const idOf = (row: RowInterface) =>
    String(getIdFromObject(row.data as BaseJsonLdItemInterface, true, resource))

  // A record drawn before the API created it has no id to be selected by.
  const byId = new Map(
    rows.filter((row) => row.pending !== "create").map((row) => [idOf(row), row])
  )

  // A record filtered out, deleted or paged away is not selected any more, nor
  // is one in a layout that draws no selection: it is set aside, and comes
  // back with the layout that can show it.
  const selected = selectable ? rawSelected.filter((id) => byId.has(id)) : []

  const clear = () => setSelected([])

  // Escape empties the selection — unless it is closing something drawn over
  // the list, a dialog or a menu, which has its own use for the key.
  useEffect(() => {
    if (!selected.length) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest("[role='dialog'],[role='alertdialog'],[role='menu']")) {
        return
      }
      clear()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [selected.length])

  const selectableIds = (candidates: RowInterface[]) =>
    candidates.filter((row) => row.pending !== "create").map(idOf)

  const areAllSelected = (candidates: RowInterface[]) => {
    const ids = selectableIds(candidates)
    return ids.length > 0 && ids.every((id) => selected.includes(id))
  }

  return {
    selectable,
    selected,
    setSelected,
    isSelected: (id) => selected.includes(id),
    toggle: (id) =>
      setSelected((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
      ),
    clear,
    idOf,
    rowsOf: (ids) =>
      ids.map((id) => byId.get(id)).filter((row): row is RowInterface => !!row),
    areAllSelected,
    toggleAll: (candidates) => {
      const ids = selectableIds(candidates)
      if (areAllSelected(candidates)) {
        setSelected((current) => current.filter((id) => !ids.includes(id)))
      } else {
        setSelected((current) => [
          ...current,
          ...ids.filter((id) => !current.includes(id)),
        ])
      }
    },
  }
}

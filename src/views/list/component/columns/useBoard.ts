import { createContext, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { translate } from "react-mini-i18n"
import { BaseJsonLdItemInterface } from "jsonld-item"
import { ValueOptionInterface } from "react-data-form"
import { RowInterface } from "@/ViewResource"
import getIdFromObject from "@/internal/id/getIdFromObject"
import getIdentityFromObject from "@/internal/id/getIdentityFromObject"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { permissionResource } from "@/utils/permissionResource"
import { updateRecord } from "@/hook/useResourceMutation"
import {
  draggedIds,
  selectRange,
  toggleSelection,
} from "@/views/list/component/columns/boardSelection"

export interface BoardInterface {
  identifierKey: string
  columns: ValueOptionInterface[]
  selectable: boolean
  /** The ids of the selected cards, in the order they were selected. */
  selected: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  /** Shift+click: everything between the last card clicked and this one. */
  extendTo: (id: string, columnIds: string[]) => void
  clear: () => void
  idOf: (row: RowInterface) => string
  /**
   * The column a card is drawn in — the one it is being moved to, if any: the
   * rows already carry the writes in flight.
   */
  columnOf: (row: RowInterface) => unknown
  rowsOf: (ids: string[]) => RowInterface[]
  /** The cards being dragged, from the drag start to the drop. */
  dragging: string[]
  startDrag: (id: string) => string[]
  /** The cards of the drag under way, read at the drop. */
  draggedNow: () => string[]
  endDrag: () => void
  /**
   * Writes the new column of every card back, one update per record through
   * the resource's repository, and draws them there before the answers come
   * back — unless the resource's updates are not optimistic. A card whose
   * update fails goes back where it was.
   */
  moveTo: (ids: string[], value: unknown) => Promise<void>
}

export const BoardContext = createContext<BoardInterface | null>(null)

export function useBoardContext(): BoardInterface | null {
  return useContext(BoardContext)
}

export function useBoard({
  rows,
  identifierKey,
  columns,
  selectable,
}: {
  rows: RowInterface[]
  identifierKey: string
  columns: ValueOptionInterface[]
  selectable: boolean
}): BoardInterface {
  const currentResource = useCurrentViewResourceContext()
  const resource = currentResource.resource

  // The list's selection — the one its bulk actions run on. A board drawn
  // outside a list keeps one of its own.
  const listSelection = useListViewContext().selection
  const [localSelected, setLocalSelected] = useState<string[]>([])
  const rawSelected = listSelection ? listSelection.selected : localSelected
  const setSelected = listSelection ? listSelection.setSelected : setLocalSelected
  const [anchor, setAnchor] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string[]>([])
  // Read by the drop, which may come before the render the drag start asked
  // for.
  const draggingRef = useRef<string[]>([])

  const idOf = (row: RowInterface) =>
    String(getIdFromObject(row.data as BaseJsonLdItemInterface, true, resource))

  const byId = new Map(rows.map((row) => [idOf(row), row]))

  // A card deleted is not selected any more; the list empties its selection
  // when the page or the filter changes.
  const selected = rawSelected.filter((id) => byId.has(id))

  const columnOf = (row: RowInterface) => row.data?.[identifierKey]

  const clear = () => {
    setSelected([])
    setAnchor(null)
  }

  // Escape empties the selection — unless it is closing something drawn over
  // the board, a dialog or a menu, which has its own use for the key. The
  // list's selection already listens.
  useEffect(() => {
    if (!selected.length || listSelection) return
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
  }, [selected.length, listSelection])

  const moveTo = async (ids: string[], value: unknown) => {
    const candidates = ids
      .map((id) => byId.get(id))
      .filter((row): row is RowInterface => !!row?.data && columnOf(row) !== value)
    // A record the resource refuses to move — to update, unless `move` is
    // declared — stays in its column.
    const answers = candidates.map((row) =>
      permissionResource(resource, "move", {
        item: row.data,
        context: currentResource.viewResource,
      })
    )
    // Waited for only when a rule answers later: the cards move at once
    // otherwise.
    const allowed = answers.every((answer) => typeof answer === "boolean")
      ? (answers as boolean[])
      : await Promise.all(answers)
    const moving = candidates.filter((_, index) => allowed[index])
    // Dropped back where they were: there is nothing to save, nor to announce.
    if (!moving.length) return

    const movingIds = moving.map(idOf)
    const context = { viewResourceContext: currentResource.viewResource }

    const results = await Promise.allSettled(
      moving.map((row) => {
        // The record is sent with the whole identity its dialect knows it by
        // — an `@id` included, which is what the local repository matches on.
        const data = {
          ...getIdentityFromObject(row.data as BaseJsonLdItemInterface, resource),
          [identifierKey]: value,
        }
        return updateRecord(
          resource,
          { id: getIdFromObject(data, true, resource), ...data },
          { context }
        )
      })
    )

    const failed = movingIds.filter((_, i) => results[i].status === "rejected")
    results.forEach((result) => {
      if (result.status === "rejected") console.error(result.reason)
    })

    // A card that could not be moved is already back in its column; the
    // others stay where they were dropped until the list says the same.
    // The cards moved leave the selection; the ones still to move stay in it,
    // so trying again is one click away.
    setSelected((current) =>
      current.filter((id) => !movingIds.includes(id) || failed.includes(id))
    )

    if (!failed.length) {
      toast(translate("Saved"))
    } else if (failed.length === moving.length) {
      toast(translate("An error occurred"), {
        description: translate("No card could be moved."),
      })
    } else {
      toast(
        translate("{{failed}} of {{total}} cards could not be moved", {
          failed: String(failed.length),
          total: String(moving.length),
        }),
        { description: translate("They are back in their column.") }
      )
    }

    await currentResource.fetchData()
  }

  return {
    identifierKey,
    columns,
    selectable,
    selected,
    isSelected: (id) => selected.includes(id),
    toggle: (id) => {
      setSelected(toggleSelection(selected, id))
      setAnchor(id)
    },
    extendTo: (id, columnIds) => {
      setSelected(selectRange(selected, columnIds, anchor, id))
      setAnchor(id)
    },
    clear,
    idOf,
    columnOf,
    rowsOf: (ids) =>
      ids.map((id) => byId.get(id)).filter((row): row is RowInterface => !!row),
    dragging,
    startDrag: (id) => {
      const ids = selectable ? draggedIds(selected, id) : [id]
      draggingRef.current = ids
      setDragging(ids)
      return ids
    },
    draggedNow: () => draggingRef.current,
    endDrag: () => {
      draggingRef.current = []
      setDragging([])
    },
    moveTo,
  }
}

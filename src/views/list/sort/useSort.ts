import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import type { SortDirection, SortState } from "@/ResourceDefinition"

export interface SortInterface {
  /** The fields `views.list.sort.fields` lets the list be sorted by. */
  fields: string[]
  /** The sort the rows come in. */
  sort?: SortState
  isSortable: (field: string) => boolean
  directionOf: (field: string) => SortDirection | undefined
  /** Where the field comes in the sort, from 1 — `undefined` when it is not in it. */
  rankOf: (field: string) => number | undefined
  /** How many fields the sort holds: a rank only means something past one. */
  count: number
  /**
   * Ascending, then descending, then not sorted by this field any more.
   * `additive` keeps the other fields of the sort and queues this one behind
   * them; without it, the field is the only one the list is sorted by.
   */
  toggle: (field: string, additive?: boolean) => void
  setSort: (sort: SortState | undefined) => void
}

/** What comes after `direction` when the header of its field is clicked. */
export function nextSortDirection(
  direction: SortDirection | undefined
): SortDirection | undefined {
  if (direction === undefined) return "asc"
  if (direction === "asc") return "desc"
  return undefined
}

/**
 * The sort of the list on screen, for a column header — the table's — or a
 * layout of one's own:
 *
 * ```tsx
 * const sort = useSort()
 * <button onClick={() => sort.toggle("title")}>{sort.directionOf("title")}</button>
 * ```
 */
export function useSort(): SortInterface {
  const view = useCurrentViewResourceContext().view
  const { filterContext } = useListViewContext()
  const fields = (view.sort?.fields ?? []) as string[]
  const sort = filterContext?.sort

  const entries = Object.entries(sort ?? {})
  const directionOf = (field: string) => sort?.[field]
  const rankOf = (field: string) => {
    const index = entries.findIndex(([key]) => key === field)
    return index < 0 ? undefined : index + 1
  }
  const setSort = (next: SortState | undefined) => filterContext?.setSort(next)

  return {
    fields,
    sort,
    isSortable: (field) => fields.includes(field),
    directionOf,
    rankOf,
    count: entries.length,
    toggle: (field, additive = false) => {
      const direction = nextSortDirection(directionOf(field))
      if (!additive) {
        setSort(direction ? { [field]: direction } : undefined)
        return
      }
      // A field already in the sort keeps its rank while its direction moves on.
      const others = entries.filter(([key]) => key !== field)
      const rank = rankOf(field)
      const next = [...others]
      if (direction)
        next.splice(rank ? rank - 1 : others.length, 0, [field, direction])
      setSort(next.length ? Object.fromEntries(next) : undefined)
    },
    setSort,
  }
}

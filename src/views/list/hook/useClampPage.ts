import { useEffect } from "react"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { getCollectionItems, getCollectionTotal } from "@/api/collection"
import type { FilterOutputsInterface } from "@/views/list/filter/useFilter"

/**
 * Brings the list back to its last page when the page asked for lies beyond
 * it — the last row of the last page deleted, a whole page removed at once, a
 * link to `page: 50` — rather than leaving an empty page with no pagination.
 */
export default function useClampPage(
  originalData: unknown,
  filterContext: FilterOutputsInterface
) {
  const { resource, view, isLoading, error } = useCurrentViewResourceContext()
  const page = Number(filterContext.filter["page"] ?? 1)

  useEffect(() => {
    if (isLoading || error || !originalData || !(page > 1)) return
    if (getCollectionItems(originalData, resource).length > 0) return

    const total = getCollectionTotal(originalData, resource)
    if (!total) return

    const lastPage = Math.ceil(total / (view.pageSize ?? 30))
    if (page > lastPage) filterContext.updateFilter({ page: lastPage })
    // `filterContext` and `resource` change identity on every render; the clamp
    // is only worth checking when the data, the load state or the page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalData, isLoading, error, page])
}

import { Trans } from "react-mini-i18n"
import { getCollectionTotal } from "@/api/collection"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"

/**
 * Sections are made from the page on screen, there being no grouping done by
 * the API: when it holds more records, the counts are a page's, and say so.
 */
export function PartialGroupingNote({ shown }: { shown: number }) {
  const { resource } = useCurrentViewResourceContext() ?? {}
  const listView = useListViewContext()
  const total = listView?.originalData
    ? getCollectionTotal(listView.originalData, resource)
    : undefined

  if (total === undefined || total <= shown) return null

  return (
    <p data-slot="group-note" className="px-2 py-1 text-xs text-muted-foreground">
      <Trans params={{ count: String(shown), total: String(total) }}>
        {"Grouped over the {{count}} records of this page, out of {{total}}"}
      </Trans>
    </p>
  )
}

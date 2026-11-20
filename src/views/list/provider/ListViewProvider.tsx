import { ListViewContext } from "@/views/list/provider/ListViewContext"
import { PropsWithChildren } from "react"
import useFilter from "@/views/list/filter/useFilter"
import useList from "@/views/list/hook/useList"
import useClampPage from "@/views/list/hook/useClampPage"
import { useListSelection } from "@/views/list/selection/useListSelection"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { FieldVisibilityProvider } from "@/views/list/fields/FieldVisibilityProvider"

export default function ListViewProviderComponent({ children }: PropsWithChildren) {
  const filterContext = useFilter({})
  const listView = useList()
  useClampPage(listView.originalData, filterContext)
  const selection = useListSelection(listView.rows, filterContext.filter)
  const { resourceId, view } = useCurrentViewResourceContext()

  return (
    <ListViewContext
      value={{
        filterContext,
        selection,
        ...listView,
      }}
    >
      {/* One choice of fields per resource, whatever its layout. */}
      <FieldVisibilityProvider
        resourceId={String(resourceId)}
        defaults={view.fields?.hidden}
        persist={view.fields?.persist}
      >
        {children}
      </FieldVisibilityProvider>
    </ListViewContext>
  )
}

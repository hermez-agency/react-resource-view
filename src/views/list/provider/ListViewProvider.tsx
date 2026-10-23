import { ListViewContext } from "@/views/list/provider/ListViewContext"
import { PropsWithChildren } from "react"
import useFilter from "@/views/list/filter/useFilter"
import useList from "@/views/list/hook/useList"
import useClampPage from "@/views/list/hook/useClampPage"
import { useListSelection } from "@/views/list/selection/useListSelection"

export default function ListViewProviderComponent({ children }: PropsWithChildren) {
  const filterContext = useFilter({})
  const listView = useList()
  useClampPage(listView.originalData, filterContext)
  const selection = useListSelection(listView.rows, filterContext.filter)

  return (
    <ListViewContext
      value={{
        filterContext,
        selection,
        ...listView,
      }}
    >
      {children}
    </ListViewContext>
  )
}

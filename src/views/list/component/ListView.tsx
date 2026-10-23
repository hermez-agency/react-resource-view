import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import ListViewProviderComponent from "@/views/list/provider/ListViewProvider"
import { PageLoader } from "@/ui/Loader"
import { Trans } from "react-mini-i18n"
import { FormElement } from "react-data-form"
import { NoResult } from "@/views/list/component/NoResult"
import { Button } from "@/ui/button"
import { CircleX } from "lucide-react"
import { ListComponentPropsInterface } from "@/ViewResource"
import { DefaultRowComponent } from "@/views/list/component/DefaultRowComponent"
import { ListHeader } from "@/views/list/component/ListHeader"
import { getFormFilter } from "@/views/list/filter/useFilter"
import {
  ListFilterBar,
  listFilterFormClassName,
} from "@/views/list/component/ListFilterBar"
import { useInlineClaim } from "@/open/childViewRoute"
import { LoadError } from "@/components/LoadError"
import { ListSelectionBar } from "@/views/list/selection/ListSelectionBar"

export default function ListView() {
  return (
    <ListViewProviderComponent>
      <ContentList />
    </ListViewProviderComponent>
  )
}

export const ContentList = () => {
  // The views opened inline are drawn under the rows of this list, when its
  // layout can.
  useInlineClaim()

  return (
    <div className={"g:p-0 lg:min-w-75 gap-2 flex flex-col"}>
      <ListHeader />
      <FormFilter />
      <List />
      <NoResult />
      <SelectionBar />
    </div>
  )
}

const List = () => {
  const currentResource = useCurrentViewResourceContext()
  const view = currentResource.view
  const viewOptionName = currentResource.viewVariant
  const listView = useListViewContext()

  if (currentResource.error) return <LoadError />
  if (currentResource.isLoading && listView.data.length === 0) return <PageLoader />

  if (listView.data.length === 0) {
    return <></>
  }

  return (
    <ListComponent rows={listView.rows} key={"view-" + view.id + viewOptionName} />
  )
}

/**
 * The selection bar of every layout but the board, which draws its own with
 * "Move to…" in it.
 */
function SelectionBar() {
  const { layout } = useCurrentViewResourceContext()
  if (layout?.type === "board") return null

  return <ListSelectionBar />
}

function FormFilter() {
  const listViewContext = useListViewContext()
  const { filterContext } = listViewContext
  const formContext = listViewContext.filterContext.formContext
  const currentResource = useCurrentViewResourceContext()
  const filter = getFormFilter(currentResource.resource)

  if (!filter) {
    return null
  }

  return (
    <>
      {filterContext.filter && (
        <div className={"lg:min-w-75 max-w-full"}>
          {!filterContext.filterIsEmpty && filterContext.filter && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => filterContext.resetFilter({})}
            >
              <CircleX />
              <Trans>Clear the search</Trans>
            </Button>
          )}
          <ListFilterBar>
            <FormElement className={listFilterFormClassName} {...formContext} />
          </ListFilterBar>
        </div>
      )}
    </>
  )
}

function ListComponent({ rows = [] }: ListComponentPropsInterface) {
  const view = useCurrentViewResourceContext().view

  const currentResource = useCurrentViewResourceContext()

  if (!view.components.row) {
    return <Trans>List component is undefined</Trans>
  }

  const ListComponent = currentResource.view.components.list
  if (ListComponent) {
    return <ListComponent rows={rows} />
  }

  return (
    <>
      {rows.map((row, e) => {
        return (
          <div key={"row-" + e}>
            <DefaultRowComponent row={row} />
          </div>
        )
      })}
    </>
  )
}

import { CircleX, Search } from "lucide-react"
import { Button } from "@/ui/button"
import { Card, CardContent } from "@/ui/card"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { FC } from "react"
import { Trans, translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ResourceViewButton from "@/action/ResourceViewButton"
import { ActionList } from "react-data-form"
import { getCollectionItems, getCollectionTotal } from "@/api/collection"

export function NoResult() {
  const listViewContext = useListViewContext()
  const currentResource = useCurrentViewResourceContext()
  const currentView = currentResource.view
  const collection = listViewContext?.originalData
  const resource = currentResource.resource

  // A list that could not be loaded is not empty: the error says so.
  if (!collection || currentResource.error) {
    return null
  }

  // An API that reports no total still answers with its rows, and an empty
  // page is an empty result — otherwise Supabase, which counts only when
  // asked, would never say so.
  const totalItems =
    getCollectionTotal(collection, resource) ??
    getCollectionItems(collection, resource).length

  if (totalItems > 0) {
    return null
  }

  const Empty = currentView?.components.empty
  if (Empty) {
    return <Empty />
  }

  const empty = currentView?.empty
  const { filterIsEmpty, resetFilter } = listViewContext.filterContext

  // The same screen, but a filter is what emptied it: say so, and offer the way back.
  if (!filterIsEmpty) {
    return (
      <NoResultComponent
        icon={empty?.icon ?? resource.icon}
        title={empty?.filteredTitle ?? translate("No results")}
        onClearFilters={() => resetFilter({})}
      />
    )
  }

  const body = empty?.body
  return (
    <NoResultComponent
      icon={empty?.icon ?? resource.icon}
      title={empty?.title ?? translate("No {{name}} yet", { name: resource.name })}
      body={
        typeof body === "string"
          ? () => <span>{body}</span>
          : (body ?? (() => <span>{translate("Nothing has been added yet.")}</span>))
      }
    />
  )
}

interface NoResultPropsInterface {
  title?: string
  body?: FC
  icon?: FC<{ className?: string }>
  /** Draws a button that clears the active filters. */
  onClearFilters?: () => void
}

export function NoResultComponent({
  title,
  body,
  icon,
  onClearFilters,
}: NoResultPropsInterface) {
  const CurrentBody = body
    ? body
    : () => {
        return (
          <span>
            <Trans>
              Nothing matched your search. Try different criteria, or come back
              later.
            </Trans>
          </span>
        )
      }

  const Icon = icon ?? Search

  return (
    <div className="flex items-center justify-center min-h-100 p-8">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            {title ?? translate("No results yet")}
          </h3>

          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            <CurrentBody />
          </p>

          <div className="flex gap-2">
            {onClearFilters && (
              <Button variant="secondary" size="lg" onClick={onClearFilters}>
                <CircleX />
                <Trans>Clear the filters</Trans>
              </Button>
            )}
            <ResourceViewButton action={ActionList.create} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from "react"
import ListPagination from "@/views/list/component/ListPagination"
import { Trans } from "react-mini-i18n"
import { ListComponentPropsInterface } from "@/ViewResource"
import { cn } from "@/ui/cn"
import type { SplitLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import { rowKey } from "@/views/list/component/rowKey"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ViewResourceContextProvider from "@/provider/ViewResourceContextProvider"
import { ActionList } from "react-data-form"
import { generateLinkByResource } from "@/routes/routes"
import { JsonLDItem } from "jsonld-item"
import { getIdFromIri } from "jsonld-item"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { Button } from "@/ui/button"
import { ArrowLeft, Send } from "lucide-react"
import { useNavigate } from "@/ports"
import { ScrollArea } from "@/ui/scroll-area"

import { DefaultRowComponent } from "@/views/list/component/DefaultRowComponent"

export default function ListSplit({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<SplitLayoutOptions>().options
  const navigate = useNavigate()
  const currentResource = useCurrentViewResourceContext()
  const EmptyComponent = options.emptyState ?? BaseEmptyComponent
  const action = options.action ?? ActionList.update
  const [id, setId] = useState(currentResource.id)
  // The URL is the source of truth: the browser's Back button changes it
  // without going through selectRow or handleBack.
  const [urlId, setUrlId] = useState(currentResource.id)
  if (urlId !== currentResource.id) {
    setUrlId(currentResource.id)
    setId(currentResource.id)
  }

  const getLink = (id: undefined | string) => {
    return generateLinkByResource({
      resourceAction: ActionList.list,
      resource: currentResource.resource,
      id: id,
      // Selecting a row is a navigation, and a link that forgot the layout
      // dropped the reader back into the first variant declared — clicking an
      // item in the split view switched it to the table.
      viewVariantId: currentResource.viewVariant,
    })
  }

  const selectRow = (data: JsonLDItem<any>) => {
    const newId = getIdFromObject(data, false, currentResource.resource)
    if (!newId) {
      return
    }

    void Promise.resolve(navigate({ to: getLink(newId) })).then(() => setId(newId))
  }

  const handleBack = () => {
    void Promise.resolve(navigate({ to: getLink(undefined) })).then(() =>
      setId(undefined)
    )
  }

  if (!rows) return <Trans>No data yet</Trans>

  return (
    // Tall enough to be a working screen, capped so the layout can also be
    // embedded in a page without swallowing it whole.
    <div className="flex flex-col bg-background h-[min(calc(100dvh-13rem),40rem)] min-h-[400px]">
      <div className="flex flex-1 min-h-0">
        <div
          className={cn(
            "md:w-96 md:shrink-0 rounded-2xl bg-muted min-h-0",
            id ? "hidden md:flex md:flex-col w-full" : "flex flex-col w-full"
          )}
        >
          <ScrollArea className="h-full w-full">
            <div className="p-4 flex flex-col gap-3">
              {rows.map((row, e) => {
                const rowId = getIdFromObject(
                  row.data,
                  false,
                  currentResource.resource
                )
                // The current id may be an IRI, after a click, or a UUID, from
                // the URL, so normalised identifiers are compared.
                const isSelected = Boolean(
                  rowId && id && getIdFromIri(rowId) === getIdFromIri(id)
                )
                return (
                  // An overlay button rather than a button-shaped card: this
                  // keeps the row's own actions out of an interactive control.
                  // Those inner controls sit above it, through z-20.
                  <div
                    key={rowKey(row, e, currentResource.resource)}
                    className={cn(
                      "relative hover:bg-secondary rounded-2xl border transition-colors",
                      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent"
                    )}
                  >
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => selectRow(row.data)}
                      className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                    >
                      <span className="sr-only">
                        <Trans>View details</Trans>
                      </span>
                    </button>
                    <DefaultRowComponent row={row} />
                  </div>
                )
              })}
              <ListPagination />
              {rows.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Trans>Nothing found yet</Trans>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <main
          className={cn(
            "flex-1 min-w-0 bg-card",
            !id && "hidden md:flex md:items-center md:justify-center"
          )}
          key={id + "view-split"}
        >
          {id ? (
            <div className="flex h-full w-full flex-col">
              <div className="bg-card px-4 py-2 border-b md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <Trans>Back to the list</Trans>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-8">
                  <ViewResourceContextProvider
                    resource={currentResource.resource}
                    id={id}
                    resourceAction={action}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyComponent />
          )}
        </main>
      </div>
    </div>
  )
}

function BaseEmptyComponent() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Send className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">
          <Trans>Nothing selected</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Pick an item from the list to see its details</Trans>
        </p>
      </div>
    </div>
  )
}

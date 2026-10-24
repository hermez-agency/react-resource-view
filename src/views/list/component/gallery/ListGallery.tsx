import ListPagination from "@/views/list/component/ListPagination"
import { Trans } from "react-mini-i18n"
import type { GalleryLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import { cn } from "@/ui/cn"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { ListComponentPropsInterface } from "@/ViewResource"
import { RecordCard } from "@/views/list/component/RecordCard"
import { InlineChildView } from "@/components/ChildViewResourceDialog"
import { Fragment } from "react"
import { SelectRowCheckbox } from "@/views/list/selection/SelectRowCheckbox"
import { GalleryCover } from "@/views/list/component/gallery/GalleryCover"
import { coverImageOf } from "@/views/list/component/gallery/coverImage"

// Written out in full: see `GRID_CLASSES` in `ListCard`.
const GRID_CLASSES: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
}

export function ListGallery({ rows = [] }: ListComponentPropsInterface) {
  const { imageField, titleField, aspect, fit, columns } =
    useLayout<GalleryLayoutOptions>().options
  const view = useCurrentViewResourceContext().view
  const viewContext = useListViewContext()

  if (!viewContext.data) return <Trans>No data yet</Trans>
  const grid = columns ?? 4

  return (
    <div className={"w-full"}>
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          grid > 1 && "sm:grid-cols-2",
          GRID_CLASSES[grid]
        )}
      >
        {rows.map((row, e) => (
          <Fragment key={"row-" + e}>
            <div className="relative flex min-w-0 flex-col [&>*]:flex-1">
              <RecordCard
                row={row}
                withActions
                cover={
                  <GalleryCover
                    src={
                      imageField ? coverImageOf(row.data?.[imageField]) : undefined
                    }
                    alt={getRecordTitle(row.data, titleField ?? view?.titleField)}
                    aspect={aspect ?? "4/3"}
                    fit={fit ?? "cover"}
                  />
                }
                className={cn(
                  viewContext.selection?.selectable &&
                    row.pending !== "create" &&
                    viewContext.selection.isSelected(
                      viewContext.selection.idOf(row)
                    ) &&
                    "border-primary bg-primary/5"
                )}
              />
              <SelectRowCheckbox row={row} className="absolute top-3 right-3" />
            </div>
            <div className="col-span-full empty:hidden">
              <InlineChildView row={row} />
            </div>
          </Fragment>
        ))}
      </div>
      <div className={"mt-5"}>
        <ListPagination />
      </div>
    </div>
  )
}

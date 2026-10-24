import ListPagination from "@/views/list/component/ListPagination"
import { Trans, translate } from "react-mini-i18n"
import type { CardsLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import { cn } from "@/ui/cn"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { ListComponentPropsInterface } from "@/ViewResource"

import { RecordCard } from "@/views/list/component/RecordCard"
import { InlineChildView } from "@/components/ChildViewResourceDialog"
import { rowKey } from "@/views/list/component/rowKey"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { Fragment } from "react"
import { SelectRowCheckbox } from "@/views/list/selection/SelectRowCheckbox"
import { useGroupBy } from "@/views/list/grouping/groupPreference"
import { groupRows } from "@/views/list/grouping/groupRows"
import { GroupSection, useFolded } from "@/views/list/grouping/GroupSection"
import { PartialGroupingNote } from "@/views/list/grouping/PartialGroupingNote"
import type { RowInterface } from "@/ViewResource"

// Tailwind only generates classes written out in full in the sources. A class
// built at runtime (`"md:grid-cols-" + grid`) is never detected, and works only
// as long as some other file happens to spell out the same one.
const GRID_CLASSES: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
}

export function ListCard({ rows = [] }: ListComponentPropsInterface) {
  const layoutOptions = useLayout<CardsLayoutOptions>()
  const { columns, groupBy } = layoutOptions.options
  const viewContext = useListViewContext()
  const currentResource = useCurrentViewResourceContext()
  const grouping = useGroupBy(groupBy, layoutOptions.id)
  const folded = useFolded()

  if (!viewContext.data) return <Trans>No data yet</Trans>
  const grid = columns ?? 4
  const gridClassName = cn(
    "grid grid-cols-1 gap-4",
    grid > 1 && "sm:grid-cols-2",
    GRID_CLASSES[grid]
  )

  const renderRows = (list: RowInterface[]) =>
    list.map((row, e) => (
      <Fragment key={rowKey(row, e, currentResource?.resource)}>
        {/* The grid used to drop the row component straight onto the
            page, so a "card" layout produced cards with no card around
            them. */}
        <div className="relative flex min-w-0 flex-col [&>*]:flex-1">
          <RecordCard
            row={row}
            withActions
            className={cn(
              viewContext.selection?.selectable && "pr-10",
              viewContext.selection?.selectable &&
                row.pending !== "create" &&
                viewContext.selection.isSelected(viewContext.selection.idOf(row)) &&
                "border-primary bg-primary/5"
            )}
          />
          <SelectRowCheckbox row={row} className="absolute top-4 right-4" />
        </div>
        {/* A view opened inline takes a line of its own, after the card. */}
        <div className="col-span-full empty:hidden">
          <InlineChildView row={row} />
        </div>
      </Fragment>
    ))

  return (
    <div className={"w-full"}>
      {grouping.field ? (
        <div className="flex flex-col gap-4">
          <PartialGroupingNote shown={rows.length} />
          {groupRows(
            rows,
            grouping.field,
            grouping.options,
            translate("No value")
          ).map((group) => (
            <GroupSection
              key={"group-" + group.key}
              label={group.label}
              count={group.rows.length}
              expanded={folded.isExpanded(group.key)}
              regionId={folded.regionId(group.key)}
              onToggle={() => folded.toggle(group.key)}
              className={gridClassName}
            >
              {renderRows(group.rows)}
            </GroupSection>
          ))}
        </div>
      ) : (
        <div className={gridClassName}>{renderRows(rows)}</div>
      )}
      <div className={"mt-5"}>
        <ListPagination />
      </div>
    </div>
  )
}

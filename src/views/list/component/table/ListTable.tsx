import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table"
import { Fragment, useEffect, useRef } from "react"
import ListPagination from "@/views/list/component/ListPagination"
import { getFormInputsFromForm } from "react-data-form"
import { ListComponentPropsInterface } from "@/ViewResource"
import { Trans, translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { createForm } from "react-data-form"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { DefaultRowComponent } from "@/views/list/component/DefaultRowComponent"
import { useInlineChildView } from "@/open/childViewRoute"
import { InlineChildView } from "@/components/ChildViewResourceDialog"
import { RowInterface } from "@/ViewResource"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/ui/cn"
import {
  STICKY_ACTIONS_CELL,
  STICKY_FIRST_CELL,
} from "@/views/list/component/table/stickyCells"
import { useLayout } from "@/layout/useLayout"
import type { TableLayoutOptions } from "@/layout/layout"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { useSort } from "@/views/list/sort/useSort"
import { SelectAllCheckbox } from "@/views/list/selection/SelectRowCheckbox"
import {
  fieldOfInput,
  useColumnPreferences,
} from "@/views/list/component/table/columnPreferences"
import { ColumnsMenu } from "@/views/list/component/table/ColumnsMenu"
import { useGroupBy } from "@/views/list/grouping/groupPreference"
import { groupRows } from "@/views/list/grouping/groupRows"
import { GroupToggle, useFolded } from "@/views/list/grouping/GroupSection"
import { PartialGroupingNote } from "@/views/list/grouping/PartialGroupingNote"

export function ListTable({ rows = [] }: ListComponentPropsInterface) {
  const currentResource = useCurrentViewResourceContext()
  const layoutOptions = useLayout<TableLayoutOptions>()
  const grouping = useGroupBy(layoutOptions.options.groupBy, layoutOptions.id)
  const folded = useFolded()

  if (!currentResource.view.form) {
    return <Trans>Form is needed for build a table</Trans>
  }

  const renderRow = (row: RowInterface) => {
    const key =
      "row-" +
      getIdFromObject(row.data, false, currentResource.resource) +
      "-" +
      JSON.stringify(row.data)

    return (
      <Fragment key={key}>
        <DefaultRowComponent row={row} />
        <InlineRow row={row} />
      </Fragment>
    )
  }

  return (
    <div className="rounded-md border flex-col gap-2">
      <Toolbar />
      <ListPagination />
      {grouping.field && <PartialGroupingNote shown={rows.length} />}
      <ScrollHint>
        <Table>
          <Header rows={rows} />
          <TableBody>
            {grouping.field
              ? groupRows(
                  rows,
                  grouping.field,
                  grouping.options,
                  translate("No value")
                ).map((group) => (
                  <Fragment key={"group-" + group.key}>
                    <TableRow
                      data-slot="group-row"
                      className="bg-muted/40 hover:bg-muted/40"
                    >
                      <TableCell colSpan={1000} className="p-0">
                        <GroupToggle
                          label={group.label}
                          count={group.rows.length}
                          expanded={folded.isExpanded(group.key)}
                          onToggle={() => folded.toggle(group.key)}
                        />
                      </TableCell>
                    </TableRow>
                    {folded.isExpanded(group.key) && group.rows.map(renderRow)}
                  </Fragment>
                ))
              : rows.map(renderRow)}
          </TableBody>
        </Table>
      </ScrollHint>
      <ListPagination />
    </div>
  )
}

/** The declared columns of the table: its form's inputs, the generated ones aside. */
function useDeclaredInputs() {
  const form = useCurrentViewResourceContext().view.form
  if (!form) return []

  return getFormInputsFromForm(createForm(form)).filter(
    (input) => !input.generatedValue
  )
}

function Toolbar() {
  const inputs = useDeclaredInputs()
  const preferences = useColumnPreferences(inputs.map(fieldOfInput))
  const layoutOptions = useLayout<TableLayoutOptions>()
  const grouping = useGroupBy(layoutOptions.options.groupBy, layoutOptions.id)
  const labels = Object.fromEntries(
    inputs.map((input) => [
      fieldOfInput(input),
      String(input.label ?? input["name"] ?? input.id),
    ])
  )

  if (!inputs.length) return null

  return (
    <div data-slot="table-toolbar" className="flex justify-end p-2">
      <ColumnsMenu preferences={preferences} labels={labels} grouping={grouping} />
    </div>
  )
}

/**
 * Tells, with a fade on the edge, that columns are hidden beyond it: the table
 * scrolls in its own container, and the fades follow its scroll position.
 */
function ScrollHint({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = ref.current
    const container = wrapper?.querySelector<HTMLElement>(
      "[data-slot=table-container]"
    )
    if (!wrapper || !container) return

    const update = () => {
      const max = container.scrollWidth - container.clientWidth
      wrapper.dataset.scrollLeft = String(container.scrollLeft > 1)
      wrapper.dataset.scrollRight = String(container.scrollLeft < max - 1)
    }
    update()
    container.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      container.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-slot="table-scroll-hint"
      className="group/hint relative"
      data-scroll-left="false"
      data-scroll-right="false"
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-linear-to-r from-foreground/10 to-transparent opacity-0 transition-opacity group-data-[scroll-left=true]/hint:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-linear-to-l from-foreground/10 to-transparent opacity-0 transition-opacity group-data-[scroll-right=true]/hint:opacity-100"
      />
    </div>
  )
}

/** The view opened inline under a row: one cell across the whole table. */
function InlineRow({ row }: { row: RowInterface }) {
  const child = useInlineChildView(row.data)
  if (!child) return null

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={1000} className="p-0">
        <InlineChildView row={row} />
      </TableCell>
    </TableRow>
  )
}

export function Header({ rows = [] }: { rows?: RowInterface[] }) {
  const currentView = useCurrentViewResourceContext().view
  const { selection } = useListViewContext()
  const sort = useSort()
  const { stickyActions, stickyFirstColumn } =
    useLayout<TableLayoutOptions>().options
  const declared = useDeclaredInputs()
  const preferences = useColumnPreferences(declared.map(fieldOfInput))

  if (!currentView.form) return

  const inputs = preferences.arrange(declared)

  return (
    <TableHeader>
      <TableRow>
        {selection?.selectable && (
          <TableHead className="w-10">
            <SelectAllCheckbox rows={rows} />
          </TableHead>
        )}
        {inputs.map((input, e) => {
          const sticky = stickyFirstColumn && e === 0 ? STICKY_FIRST_CELL : ""
          const field = fieldOfInput(input)
          const label = <Trans>{input.label ?? input["name"]}</Trans>
          if (!sort.isSortable(field)) {
            return (
              <TableHead key={"row-table-header-" + e} className={cn("fc", sticky)}>
                {label}
              </TableHead>
            )
          }

          const direction = sort.directionOf(field)
          const rank = sort.rankOf(field)
          const Icon =
            direction === "asc"
              ? ArrowUp
              : direction === "desc"
                ? ArrowDown
                : ArrowUpDown

          return (
            <TableHead
              key={"row-table-header-" + e}
              className={cn("fc", sticky)}
              aria-sort={
                direction === "asc"
                  ? "ascending"
                  : direction === "desc"
                    ? "descending"
                    : "none"
              }
            >
              <button
                type="button"
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground focus-visible:outline-2"
                onClick={(event) => sort.toggle(field, event.shiftKey)}
              >
                {label}
                <Icon
                  aria-hidden
                  className={cn("size-3.5", !direction && "opacity-40")}
                />
                {rank && sort.count > 1 && (
                  <span aria-hidden className="text-xs tabular-nums">
                    {rank}
                  </span>
                )}
              </button>
            </TableHead>
          )
        })}
        <TableHead className={cn(stickyActions && STICKY_ACTIONS_CELL)} />
      </TableRow>
    </TableHeader>
  )
}

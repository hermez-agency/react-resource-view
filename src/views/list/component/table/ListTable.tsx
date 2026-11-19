import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table"
import { useEffect, useLayoutEffect, useRef } from "react"
import ListPagination from "@/views/list/component/ListPagination"
import { getFormInputsFromForm } from "react-data-form"
import { ListComponentPropsInterface } from "@/ViewResource"
import { Trans, translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { createForm } from "react-data-form"
import { rowKey } from "@/views/list/component/rowKey"
import { DefaultRowComponent } from "@/views/list/component/DefaultRowComponent"
import { useInlineChildOf } from "@/open/childViewRoute"
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
import {
  resolveVirtualize,
  useTableVirtualizer,
  VirtualRowContext,
  type VirtualRowProps,
} from "@/views/list/component/table/virtualRows"
import type { Virtualizer } from "@tanstack/react-virtual"

/** One `<tr>` of the table's body: a group's header, a record, or the view opened under it. */
type TableEntry =
  | {
      kind: "group"
      key: string
      group: string
      label: string
      count: number
      expanded: boolean
    }
  | { kind: "row"; key: string; row: RowInterface }
  | { kind: "inline"; key: string; row: RowInterface }

// Before a row is drawn and measured: a line of text with its padding and border.
const ESTIMATED_HEIGHT: Record<TableEntry["kind"], number> = {
  group: 45,
  row: 53,
  inline: 320,
}

export function ListTable({ rows = [] }: ListComponentPropsInterface) {
  const currentResource = useCurrentViewResourceContext()
  const layoutOptions = useLayout<TableLayoutOptions>()
  const grouping = useGroupBy(layoutOptions.options.groupBy, layoutOptions.id)
  const folded = useFolded()
  const inlineChildOf = useInlineChildOf()

  if (!currentResource.view.form) {
    return <Trans>Form is needed for build a table</Trans>
  }

  // Groups, records and views opened inline in one flat list: the order they
  // are drawn in, whether all of them are or only those on screen.
  const entries: TableEntry[] = []
  // In a group, a draft's key — its position — is the group's own.
  const pushRows = (list: RowInterface[], prefix = "") =>
    list.forEach((row, index) => {
      const key = prefix + rowKey(row, index, currentResource.resource)
      entries.push({ kind: "row", key, row })
      if (inlineChildOf(row.data)) {
        entries.push({ kind: "inline", key: "inline-" + key, row })
      }
    })

  if (grouping.field) {
    for (const group of groupRows(
      rows,
      grouping.field,
      grouping.options,
      translate("No value")
    )) {
      const expanded = folded.isExpanded(group.key)
      entries.push({
        kind: "group",
        key: "group-" + group.key,
        group: group.key,
        label: group.label,
        count: group.rows.length,
        expanded,
      })
      if (expanded) pushRows(group.rows, group.key + "/")
    }
  } else {
    pushRows(rows)
  }

  const virtualize = resolveVirtualize(
    layoutOptions.options.virtualize,
    entries.length
  )

  return (
    <div className="flex-col gap-2 overflow-hidden rounded-md border bg-card">
      <Toolbar />
      <ListPagination />
      {grouping.field && <PartialGroupingNote shown={rows.length} />}
      <ScrollHint>
        <Table
          aria-rowcount={virtualize.enabled ? entries.length + 1 : undefined}
          data-virtualized={virtualize.enabled ? "" : undefined}
        >
          <Header rows={rows} rowIndexed={virtualize.enabled} />
          <TableRows
            entries={entries}
            virtualize={virtualize}
            onToggleGroup={folded.toggle}
          />
        </Table>
      </ScrollHint>
      <ListPagination />
    </div>
  )
}

/**
 * The body of the table: every entry, or — virtualized — those on screen
 * between two spacer rows standing for the others. The arrows move from row to
 * row, scrolling to one not drawn yet.
 */
function TableRows({
  entries,
  virtualize,
  onToggleGroup,
}: {
  entries: TableEntry[]
  virtualize: { enabled: boolean; overscan: number }
  onToggleGroup: (key: string) => void
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const estimateSize = (index: number) =>
    ESTIMATED_HEIGHT[entries[index]?.kind ?? "row"]
  const virtualizer = useTableVirtualizer({
    bodyRef,
    count: entries.length,
    enabled: virtualize.enabled,
    overscan: virtualize.overscan,
    estimateSize,
    getItemKey: (index) => entries[index]?.key ?? String(index),
  })
  const focusRow = useRowFocus(bodyRef, virtualizer, virtualize.enabled)
  useStableColumnWidths(bodyRef, virtualize.enabled)

  const renderEntry = (entry: TableEntry, index: number) => {
    const rowProps: VirtualRowProps | undefined = virtualize.enabled
      ? {
          "data-index": index,
          "aria-rowindex": index + 2,
          ref: virtualizer.measureElement,
        }
      : undefined
    switch (entry.kind) {
      case "group":
        return (
          <TableRow
            key={entry.key}
            data-slot="group-row"
            className="bg-muted/40 hover:bg-muted/40"
            {...rowProps}
          >
            <TableCell colSpan={1000} className="p-0">
              <GroupToggle
                label={entry.label}
                count={entry.count}
                expanded={entry.expanded}
                onToggle={() => onToggleGroup(entry.group)}
              />
            </TableCell>
          </TableRow>
        )
      case "row":
        return (
          <VirtualRowContext key={entry.key} value={rowProps}>
            <DefaultRowComponent row={entry.row} />
          </VirtualRowContext>
        )
      case "inline":
        return <InlineRow key={entry.key} row={entry.row} rowProps={rowProps} />
    }
  }

  if (!virtualize.enabled) {
    return (
      <TableBody ref={bodyRef} onKeyDown={focusRow}>
        {entries.map(renderEntry)}
      </TableBody>
    )
  }

  const items = virtualizer.getVirtualItems()
  const margin = virtualizer.options.scrollMargin
  // Before the scrolling box is known nothing is drawn, and the estimate holds
  // the table's height: it is what makes that box scroll.
  const total = items.length
    ? virtualizer.getTotalSize()
    : entries.reduce((sum, _, index) => sum + estimateSize(index), 0)
  const before = items.length ? items[0].start - margin : 0
  const after = items.length ? total - (items[items.length - 1].end - margin) : total

  return (
    <TableBody ref={bodyRef} onKeyDown={focusRow}>
      <SpacerRow height={before} />
      {items.map((item) => renderEntry(entries[item.index], item.index))}
      <SpacerRow height={after} />
    </TableBody>
  )
}

/** The height of the rows not drawn, above or below those on screen. */
function SpacerRow({ height }: { height: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden data-slot="table-spacer" style={{ height }}>
      <td colSpan={1000} className="p-0" />
    </tr>
  )
}

const EDITING =
  "input,textarea,select,[contenteditable=''],[contenteditable=true],[role=combobox],[role=listbox],[role=menu],[role=slider]"
const FOCUSABLE =
  "a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])"

/**
 * ↑ / ↓ move the focus to the same cell of the previous or next row, Ctrl+Home
 * / Ctrl+End to the first or last one — scrolling to it first when the
 * virtualizer has not drawn it. A field being edited keeps its arrows.
 */
function useRowFocus(
  bodyRef: React.RefObject<HTMLTableSectionElement | null>,
  virtualizer: Virtualizer<Element, HTMLTableRowElement>,
  virtualized: boolean
) {
  const pending = useRef<{ index: number; cell: number } | null>(null)

  const focusIn = (row: HTMLTableRowElement, cell: number) => {
    const target =
      row.cells[Math.min(cell, row.cells.length - 1)]?.querySelector<HTMLElement>(
        FOCUSABLE
      ) ?? row.querySelector<HTMLElement>(FOCUSABLE)
    if (target) return target.focus()
    row.tabIndex = -1
    row.focus()
  }

  const rowAt = (index: number) =>
    virtualized
      ? bodyRef.current?.querySelector<HTMLTableRowElement>(
          `:scope > tr[data-index='${index}']`
        )
      : bodyRef.current?.querySelectorAll<HTMLTableRowElement>(":scope > tr")[index]

  // The row scrolled to is drawn on the next render: the focus waits for it.
  useLayoutEffect(() => {
    if (!pending.current) return
    const row = rowAt(pending.current.index)
    if (!row) return
    focusIn(row, pending.current.cell)
    pending.current = null
  })

  return (event: React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.shiftKey) {
      return
    }
    const target = event.target as HTMLElement
    if (target.closest(EDITING)) return
    const body = bodyRef.current
    const row = target.closest("tr")
    if (!body || !row || row.parentElement !== body) return

    const rows = [...body.querySelectorAll<HTMLTableRowElement>(":scope > tr")]
    const index = virtualized ? Number(row.dataset.index) : rows.indexOf(row)
    const count = virtualized ? virtualizer.options.count : rows.length
    if (Number.isNaN(index) || index < 0) return

    let next: number
    if (event.key === "ArrowDown" && !event.ctrlKey) next = index + 1
    else if (event.key === "ArrowUp" && !event.ctrlKey) next = index - 1
    else if (event.key === "Home" && event.ctrlKey) next = 0
    else if (event.key === "End" && event.ctrlKey) next = count - 1
    else return
    if (next < 0 || next >= count || next === index) return

    event.preventDefault()
    const cell = target.closest("td")?.cellIndex ?? 0
    const drawn = rowAt(next)
    if (virtualized) virtualizer.scrollToIndex(next, { align: "auto" })
    if (drawn) return focusIn(drawn, cell)
    pending.current = { index: next, cell }
  }
}

/**
 * A column is as wide as its widest cell drawn: the virtualizer drawing other
 * rows would make the columns jump while scrolling. Each header cell keeps, as
 * its minimum, the widest it has been; the columns only grow.
 */
function useStableColumnWidths(
  bodyRef: React.RefObject<HTMLTableSectionElement | null>,
  enabled: boolean
) {
  const widths = useRef<{ columns: string; values: number[] }>({
    columns: "",
    values: [],
  })

  useLayoutEffect(() => {
    const headers = bodyRef.current?.parentElement?.querySelectorAll<HTMLElement>(
      ":scope > thead > tr > th"
    )
    if (!headers) return
    if (!enabled) {
      headers.forEach((th) => th.style.removeProperty("min-width"))
      widths.current = { columns: "", values: [] }
      return
    }
    const columns = [...headers].map((th) => th.textContent).join("\u0000")
    if (columns !== widths.current.columns) {
      headers.forEach((th) => th.style.removeProperty("min-width"))
      widths.current = { columns, values: [] }
    }
    const { values } = widths.current
    headers.forEach((th, index) => {
      const width = Math.ceil(th.getBoundingClientRect().width)
      if (width <= (values[index] ?? 0)) return
      values[index] = width
      th.style.minWidth = width + "px"
    })
  })
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
  const { stickyActions, stickyFirstColumn } =
    useLayout<TableLayoutOptions>().options
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
      {/* A pinned column draws its own shadow: a veil over it would darken it. */}
      {!stickyFirstColumn && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-linear-to-r from-foreground/10 to-transparent opacity-0 transition-opacity group-data-[scroll-left=true]/hint:opacity-100"
        />
      )}
      {!stickyActions && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-linear-to-l from-foreground/10 to-transparent opacity-0 transition-opacity group-data-[scroll-right=true]/hint:opacity-100"
        />
      )}
    </div>
  )
}

/** The view opened inline under a row: one cell across the whole table. */
function InlineRow({
  row,
  rowProps,
}: {
  row: RowInterface
  rowProps?: VirtualRowProps
}) {
  return (
    <TableRow className="hover:bg-transparent" {...rowProps}>
      <TableCell colSpan={1000} className="p-0">
        <InlineChildView row={row} />
      </TableCell>
    </TableRow>
  )
}

export function Header({
  rows = [],
  rowIndexed = false,
}: {
  rows?: RowInterface[]
  /** Numbers the header row for a screen reader: the body is virtualized. */
  rowIndexed?: boolean
}) {
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
      <TableRow
        className="hover:bg-transparent"
        aria-rowindex={rowIndexed ? 1 : undefined}
      >
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
        <TableHead className={cn(stickyActions && STICKY_ACTIONS_CELL)}>
          <span className="sr-only">
            <Trans>Actions</Trans>
          </span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

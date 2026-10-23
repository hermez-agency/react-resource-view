import { useMemo, useState } from "react"
import ListPagination from "@/views/list/component/ListPagination"
import {
  addDays,
  addWeeks,
  differenceInDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/ui/button"
import { cn } from "@/ui/cn"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { Trans } from "react-mini-i18n"
import {
  ListComponentPropsInterface,
  RowInterface,
  ViewResource,
} from "@/ViewResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import type { TimelineGroupInterface, TimelineLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import { EventPreview } from "@/views/list/component/preview/EventPreview"
import { formatEventPeriod } from "@/views/list/component/preview/formatEventPeriod"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { parseRowDate } from "@/utils/parseRowDate"
import { getDateLocale, getWeekStartsOn } from "@/ports"

const UNASSIGNED_GROUP_ID = "__unassigned__"

function getTitle(
  data: Record<string, any>,
  key?: string,
  resource?: ViewResource
): string {
  if (!data) return ""
  if (key && typeof data[key] === "string") return data[key] as string
  if (typeof data.title === "string") return data.title as string
  if (typeof data.name === "string") return data.name as string
  return getIdFromObject(data, false, resource) ?? ""
}

function assignLanes(entries: { start: Date; end: Date }[]): number[] {
  const indexed = entries.map((entry, idx) => ({ ...entry, originalIdx: idx }))
  indexed.sort((a, b) => a.start.getTime() - b.start.getTime())

  const laneEnds: Date[] = []
  const assignments = new Array<number>(entries.length).fill(0)

  for (const entry of indexed) {
    let placed = -1
    for (let i = 0; i < laneEnds.length; i++) {
      if (startOfDay(laneEnds[i]).getTime() < startOfDay(entry.start).getTime()) {
        placed = i
        laneEnds[i] = entry.end
        break
      }
    }
    if (placed === -1) {
      laneEnds.push(entry.end)
      placed = laneEnds.length - 1
    }
    assignments[entry.originalIdx] = placed
  }

  return assignments
}

function defaultResolveGroupForRow(
  data: Record<string, any>,
  groupBy: string,
  resource?: ViewResource
): TimelineGroupInterface | undefined {
  const raw = data?.[groupBy]
  if (!raw) return undefined

  if (typeof raw === "string") {
    return { id: raw, label: raw }
  }

  if (typeof raw === "object") {
    const id = getIdFromObject(raw, false, resource)
    const label = raw.name ?? raw.label ?? raw.title ?? id
    if (!id) return undefined
    return { id: String(id), label: String(label) }
  }

  return undefined
}

export default function ListTimeline({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<TimelineLayoutOptions>().options
  const { resource } = useCurrentViewResourceContext() ?? {}

  const startField = options.startField ?? "startDate"
  const endField = options.endField ?? "endDate"
  const groupBy = options.groupBy
  const statusField = options.statusField ?? "state"
  const showUnassigned = options.showUnassigned !== false
  const { resolveGroups, resolveGroupForRow } = options

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [daysToShow, setDaysToShow] = useState<number>(options.daysToShow ?? 14)

  const viewStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: getWeekStartsOn() }),
    [currentDate]
  )
  const viewEnd = useMemo(
    () => addDays(viewStart, daysToShow - 1),
    [viewStart, daysToShow]
  )

  const days = useMemo(
    () => eachDayOfInterval({ start: viewStart, end: viewEnd }),
    [viewStart, viewEnd]
  )

  const rowsWithDates = useMemo(() => {
    return rows
      .map((row) => {
        const data = row.data as Record<string, any>
        const start = parseRowDate(data?.[startField])
        if (!start) return null
        const end = parseRowDate(data?.[endField]) ?? start
        const groupResolver =
          resolveGroupForRow ??
          (groupBy
            ? (item: Record<string, any>) =>
                defaultResolveGroupForRow(item, groupBy, resource)
            : undefined)
        const group = groupResolver?.(data)
        return { row, data, start, end, group }
      })
      .filter(
        (
          entry
        ): entry is {
          row: RowInterface
          data: Record<string, any>
          start: Date
          end: Date
          group: TimelineGroupInterface | undefined
        } => entry !== null
      )
  }, [rows, startField, endField, groupBy, resolveGroupForRow, resource])

  const groups = useMemo<TimelineGroupInterface[]>(() => {
    if (resolveGroups) {
      return resolveGroups(rows as RowInterface<Record<string, any>>[])
    }

    const seen = new Map<string, TimelineGroupInterface>()
    for (const entry of rowsWithDates) {
      if (entry.group && !seen.has(entry.group.id)) {
        seen.set(entry.group.id, entry.group)
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label, getDateLocale().code)
    )
  }, [resolveGroups, rows, rowsWithDates])

  const unassignedRows = useMemo(
    () => rowsWithDates.filter((entry) => !entry.group),
    [rowsWithDates]
  )

  const calculateBarPosition = (start: Date, end: Date) => {
    const resStart = startOfDay(start)
    const resEnd = startOfDay(end)
    const sViewStart = startOfDay(viewStart)
    const sViewEnd = startOfDay(viewEnd)

    if (resEnd < sViewStart || resStart > sViewEnd) {
      return null
    }

    const effectiveStart = resStart < sViewStart ? sViewStart : resStart
    const effectiveEnd = resEnd > sViewEnd ? sViewEnd : resEnd

    const startOffset = differenceInDays(effectiveStart, sViewStart)
    const duration = differenceInDays(effectiveEnd, effectiveStart) + 1

    const cellWidth = 100 / daysToShow
    const left = startOffset * cellWidth
    const width = duration * cellWidth

    return {
      left,
      width,
      startsBeforeView: resStart < sViewStart,
      endsAfterView: resEnd > sViewEnd,
    }
  }

  const isToday = (date: Date) => isSameDay(date, new Date())
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prev) =>
      direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)
    )
  }

  const goToToday = () => setCurrentDate(new Date())

  const visibleCount = rowsWithDates.filter(
    (entry) => calculateBarPosition(entry.start, entry.end) !== null
  ).length

  return (
    <div className="flex flex-col h-full bg-card rounded-md border shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">
            {format(viewStart, "d MMM", { locale: getDateLocale() })} -{" "}
            {format(viewEnd, "d MMM yyyy", { locale: getDateLocale() })}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Trans>Today</Trans>
          </Button>

          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => navigateWeek("prev")}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => navigateWeek("next")}
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setDaysToShow((p) => Math.max(7, p - 7))}
              disabled={daysToShow <= 7}
              aria-label="Narrow the range"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              <Trans params={{ count: String(daysToShow) }}>
                {"{{count}} days"}
              </Trans>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setDaysToShow((p) => Math.min(28, p + 7))}
              disabled={daysToShow >= 28}
              aria-label="Widen the range"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex sticky top-0 z-20 bg-card border-b">
            <div className="w-40 md:w-52 flex-shrink-0 px-3 py-2 font-medium text-sm border-r bg-muted/50 sticky left-0 z-30">
              <Trans>
                {options.groupsLabel ?? (groupBy ? "Groups" : "Bookings")}
              </Trans>
            </div>
            <div className="flex flex-1">
              {days.map((day, idx) => (
                <div
                  key={"head-" + idx}
                  className={cn(
                    "flex-1 text-center py-2 border-r last:border-r-0 min-w-[60px] md:min-w-[80px]",
                    isToday(day) && "bg-primary/10",
                    isWeekend(day) && "bg-muted/50"
                  )}
                >
                  <div className="text-[10px] uppercase text-muted-foreground font-medium">
                    {format(day, "EEE", { locale: getDateLocale() })}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isToday(day) && "text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {groups.map((group) => {
            const groupEntries = rowsWithDates.filter(
              (entry) => entry.group?.id === group.id
            )

            return (
              <TimelineRow
                key={"row-" + group.id}
                label={group.label}
                sublabel={group.sublabel}
                days={days}
                entries={groupEntries}
                calculateBarPosition={calculateBarPosition}
                statusField={statusField}
                colorByStatus={options.colorByStatus}
                titleField={options.titleField}
              />
            )
          })}

          {showUnassigned && unassignedRows.length > 0 && (
            <TimelineRow
              key={"row-" + UNASSIGNED_GROUP_ID}
              label={options.unassignedLabel ?? "Unassigned"}
              sublabel={`${unassignedRows.length} entries`}
              days={days}
              entries={unassignedRows}
              calculateBarPosition={calculateBarPosition}
              statusField={statusField}
              colorByStatus={options.colorByStatus}
              titleField={options.titleField}
              dashed
            />
          )}

          {groups.length === 0 && unassignedRows.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Trans>No entries to show over this period.</Trans>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        {/* Each count in its own element: two bare text runs side by side are
            a single anonymous flex item, which is why they read as one glued
            sentence instead of sitting at either end. */}
        <span>
          <Trans params={{ count: String(visibleCount) }}>
            {"{{count}} entries over the period"}
          </Trans>
        </span>
        <span>
          <Trans params={{ count: String(groups.length) }}>{"{{count}} rows"}</Trans>
        </span>
      </div>

      <ListPagination />
    </div>
  )
}

interface TimelineRowProps {
  label: string
  sublabel?: string
  days: Date[]
  entries: {
    row: RowInterface
    data: Record<string, any>
    start: Date
    end: Date
  }[]
  calculateBarPosition: (
    start: Date,
    end: Date
  ) => {
    left: number
    width: number
    startsBeforeView: boolean
    endsAfterView: boolean
  } | null
  statusField?: string
  /** Bar colour per value of `statusField`. Any CSS colour, variables included. */
  colorByStatus?: Record<string, string>
  titleField?: string
  dashed?: boolean
}

function TimelineRow({
  label,
  sublabel,
  days,
  entries,
  calculateBarPosition,
  statusField,
  colorByStatus,
  titleField,
  dashed = false,
}: TimelineRowProps) {
  const { resource } = useCurrentViewResourceContext() ?? {}
  const isToday = (date: Date) => isSameDay(date, new Date())
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

  const visibleEntries = entries.flatMap((entry) => {
    const position = calculateBarPosition(entry.start, entry.end)
    return position ? [{ entry, position }] : []
  })

  const laneAssignments = assignLanes(
    visibleEntries.map(({ entry }) => ({ start: entry.start, end: entry.end }))
  )

  const laneCount = laneAssignments.length > 0 ? Math.max(...laneAssignments) + 1 : 1
  const laneHeight = laneCount === 1 ? 48 : 28
  const laneGap = 4
  const verticalPadding = 8
  const rowHeight =
    verticalPadding * 2 +
    laneCount * laneHeight +
    Math.max(0, laneCount - 1) * laneGap

  return (
    <div
      className={cn(
        "flex border-b hover:bg-muted/20 transition-colors",
        dashed && "bg-destructive/5"
      )}
      style={{ minHeight: rowHeight }}
    >
      <div
        className={cn(
          "w-40 md:w-52 flex-shrink-0 px-3 py-3 border-r sticky left-0 z-10",
          dashed ? "bg-destructive/5" : "bg-card"
        )}
      >
        <div
          className={cn(
            "font-medium text-sm truncate",
            dashed && "text-destructive"
          )}
        >
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-muted-foreground truncate">{sublabel}</div>
        )}
      </div>

      <div className="flex-1 relative" style={{ height: rowHeight }}>
        <div className="absolute inset-0 flex">
          {days.map((day, idx) => (
            <div
              key={"cell-" + idx}
              className={cn(
                "flex-1 border-r last:border-r-0 min-w-[60px] md:min-w-[80px]",
                isToday(day) && "bg-primary/5",
                isWeekend(day) && "bg-muted/30"
              )}
            />
          ))}
        </div>

        <div className="absolute inset-0 px-0.5">
          {visibleEntries.map(({ entry, position }, idx) => {
            const title = getTitle(entry.data, titleField, resource)
            const lane = laneAssignments[idx]
            const top = verticalPadding + lane * (laneHeight + laneGap)
            // The view declares a colour per status; without one every bar
            // falls back to the primary wash it has always used.
            const status = statusField
              ? (entry.data as Record<string, unknown>)[statusField]
              : undefined
            const color =
              colorByStatus && typeof status === "string"
                ? colorByStatus[status]
                : undefined

            return (
              <Popover
                key={"bar-" + (getIdFromObject(entry.data, false, resource) ?? idx)}
              >
                <PopoverTrigger
                  className={cn(
                    "absolute flex items-center px-2 text-xs font-medium truncate border transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer text-left",
                    !color && "bg-primary/30",
                    dashed && "border-dashed border-2",
                    position.startsBeforeView ? "rounded-l-none" : "rounded-l-md",
                    position.endsAfterView ? "rounded-r-none" : "rounded-r-md"
                  )}
                  style={{
                    left: `${position.left}%`,
                    width: `calc(${position.width}% - 4px)`,
                    top,
                    height: laneHeight,
                    ...(color
                      ? {
                          backgroundColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                          borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
                        }
                      : {}),
                  }}
                  title={title}
                >
                  <span className="truncate">{title || "—"}</span>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <EventPreview
                    row={entry.row}
                    title={title}
                    // A bar spans days: its hours are an implementation
                    // detail of the record, not what the band is read for.
                    period={formatEventPeriod(entry.start, entry.end, false)}
                    color={color}
                  />
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>
    </div>
  )
}

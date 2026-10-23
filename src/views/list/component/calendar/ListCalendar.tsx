import { LoadError } from "@/components/LoadError"
import ListPagination from "@/views/list/component/ListPagination"
import { useMemo, useState } from "react"
import { useMediaQuery } from "@/internal/browser/useMediaQuery"
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"
import { isDateOnly, parseRowDate } from "@/utils/parseRowDate"
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Trans } from "react-mini-i18n"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { cn } from "@/ui/cn"
import { ScrollArea } from "@/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import {
  ListComponentPropsInterface,
  RowInterface,
  ViewResource,
} from "@/ViewResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { getDateLocale, getWeekStartsOn } from "@/ports"
import { EventPreview } from "@/views/list/component/preview/EventPreview"
import { formatEventPeriod } from "@/views/list/component/preview/formatEventPeriod"
import type { CalendarLayoutOptions, CalendarMode } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { usePermission } from "@/utils/permissionResource"
import { ActionList } from "react-data-form"
import { useNavigate } from "@/ports"
import { useViewLinkBuilder } from "@/open/childViewRoute"

// Indexed like Date#getDay(): Sunday first.
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]
const HOUR_HEIGHT = 64
// Below Tailwind's `sm`: a month cell is too narrow to hold an event title.
const NARROW_MONTH_QUERY = "(max-width: 639px)"
const MAX_DOTS = 3

function getRowStart(
  row: RowInterface<Record<string, unknown>>,
  dateKey: string
): Date | undefined {
  return parseRowDate(row.data?.[dateKey])
}

function getRowEnd(
  row: RowInterface<Record<string, unknown>>,
  endDateKey: string | undefined,
  start: Date
): Date {
  if (endDateKey) {
    const value = parseRowDate(row.data?.[endDateKey])
    if (value && value > start) return value
  }
  return new Date(start.getTime() + 60 * 60 * 1000)
}

function getRowTitle(
  row: RowInterface<Record<string, unknown>>,
  titleKey?: string,
  resource?: ViewResource
): string {
  const data = row.data
  if (!data) return ""
  if (titleKey && typeof data[titleKey] === "string") return data[titleKey] as string
  if (typeof data["title"] === "string") return data["title"] as string
  if (typeof data["name"] === "string") return data["name"] as string
  return getIdFromObject(data, false, resource) ?? ""
}

function getRowColor(
  row: RowInterface<Record<string, unknown>>,
  colorKey?: string
): string | undefined {
  if (!colorKey) return undefined
  const value = row.data?.[colorKey]
  return typeof value === "string" ? value : undefined
}

interface LaidOutEvent {
  entry: DayWithRows
  top: number
  height: number
  /** horizontal offset as a fraction of the column width (0..1) */
  left: number
  /** width as a fraction of the column width (0..1) */
  width: number
}

/**
 * Lays a day's events out in columns so they do not overlap: events sharing a
 * time span sit side by side and split the available width.
 */
function layoutDayEvents(
  entries: DayWithRows[],
  getEventPosition: (start: Date, end: Date) => { top: number; height: number }
): LaidOutEvent[] {
  const sorted = [...entries].sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime()
  )

  const result: LaidOutEvent[] = []
  let columns: DayWithRows[][] = []
  let groupEnd = 0

  const flush = () => {
    const columnCount = columns.length
    columns.forEach((column, columnIndex) => {
      column.forEach((entry) => {
        const { top, height } = getEventPosition(entry.start, entry.end)
        result.push({
          entry,
          top,
          height,
          left: columnIndex / columnCount,
          width: 1 / columnCount,
        })
      })
    })
    columns = []
    groupEnd = 0
  }

  for (const entry of sorted) {
    // An event overlapping nothing in the current group closes that group.
    if (columns.length > 0 && entry.start.getTime() >= groupEnd) {
      flush()
    }

    let placed = false
    for (const column of columns) {
      const last = column[column.length - 1]
      if (entry.start.getTime() >= last.end.getTime()) {
        column.push(entry)
        placed = true
        break
      }
    }
    if (!placed) columns.push([entry])

    groupEnd = Math.max(groupEnd, entry.end.getTime())
  }

  flush()
  return result
}

export function ListCalendar({ rows = [] }: ListComponentPropsInterface) {
  const currentResourceContext = useCurrentViewResourceContext()
  const options = useLayout<CalendarLayoutOptions>().options
  const dateKey = options.dateField ?? "dueDate"
  const initialMode: CalendarMode = options.mode ?? "month"
  const hourStart = options.hourStart ?? 7
  const hourEnd = options.hourEnd ?? 21

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [mode, setMode] = useState<CalendarMode>(initialMode)
  const canCreate = usePermission(ActionList.create)
  const navigate = useNavigate()
  const buildLink = useViewLinkBuilder()

  // The creation opens where `views.create.open` says, with the day filled in
  // and no id: there is no record to load.
  const openCreate = (date: Date) => {
    if (!canCreate) return
    navigate({
      to: buildLink({
        resource: currentResourceContext.resource,
        action: ActionList.create,
        defaultData: { [dateKey]: date.toISOString() },
      }).to,
    })
  }

  const rowsWithDate = useMemo(() => {
    return rows
      .map((row) => {
        const start = getRowStart(
          row as RowInterface<Record<string, unknown>>,
          dateKey
        )
        if (!start) return null
        const end = getRowEnd(
          row as RowInterface<Record<string, unknown>>,
          options.endDateField,
          start
        )
        return {
          row,
          start,
          end,
          allDay: isDateOnly(row.data?.[dateKey]),
        }
      })
      .filter(
        (
          entry
        ): entry is {
          row: RowInterface
          start: Date
          end: Date
          allDay: boolean
        } => entry !== null
      )
  }, [rows, dateKey, options.endDateField])

  const getRowsForDate = (date: Date) =>
    rowsWithDate.filter((entry) => isSameDay(entry.start, date))

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: getWeekStartsOn() }),
      end: endOfWeek(monthEnd, { weekStartsOn: getWeekStartsOn() }),
    })
  }, [currentDate])

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: getWeekStartsOn() }),
      end: endOfWeek(currentDate, { weekStartsOn: getWeekStartsOn() }),
    })
  }, [currentDate])

  const dayHours = useMemo(() => {
    return eachHourOfInterval({
      start: setMinutes(setHours(new Date(), hourStart), 0),
      end: setMinutes(setHours(new Date(), hourEnd), 0),
    })
  }, [hourStart, hourEnd])

  const handlePrevious = () => {
    if (mode === "month") setCurrentDate((d) => subMonths(d, 1))
    else if (mode === "week") setCurrentDate((d) => subWeeks(d, 1))
    else setCurrentDate((d) => subDays(d, 1))
  }

  const handleNext = () => {
    if (mode === "month") setCurrentDate((d) => addMonths(d, 1))
    else if (mode === "week") setCurrentDate((d) => addWeeks(d, 1))
    else setCurrentDate((d) => addDays(d, 1))
  }

  const handleToday = () => setCurrentDate(new Date())

  const getViewTitle = () => {
    if (mode === "month")
      return format(currentDate, "MMMM yyyy", { locale: getDateLocale() })
    if (mode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: getWeekStartsOn() })
      const end = endOfWeek(currentDate, { weekStartsOn: getWeekStartsOn() })
      return `${format(start, "d MMM", { locale: getDateLocale() })} - ${format(end, "d MMM yyyy", { locale: getDateLocale() })}`
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: getDateLocale() })
  }

  const getEventPosition = (start: Date, end: Date) => {
    const top =
      ((start.getHours() - hourStart) * 60 + start.getMinutes()) * (HOUR_HEIGHT / 60)
    const height = ((end.getTime() - start.getTime()) / 60000) * (HOUR_HEIGHT / 60)
    return { top: Math.max(0, top), height: Math.max(20, height) }
  }

  if (currentResourceContext.error) {
    return <LoadError />
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="size-4" />
            <span className="sr-only">
              <Trans>Previous</Trans>
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <Trans>Today</Trans>
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="size-4" />
            <span className="sr-only">
              <Trans>Next</Trans>
            </span>
          </Button>
        </div>

        <h3 className="text-base font-semibold capitalize text-foreground sm:order-none order-first">
          {getViewTitle()}
        </h3>

        <Tabs value={mode} onValueChange={(value) => setMode(value as CalendarMode)}>
          <TabsList>
            <TabsTrigger value="day" className="gap-1.5">
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">
                <Trans>Day</Trans>
              </span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarRange className="size-4" />
              <span className="hidden sm:inline">
                <Trans>Week</Trans>
              </span>
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5">
              <Calendar className="size-4" />
              <span className="hidden sm:inline">
                <Trans>Month</Trans>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "month" && (
        <MonthView
          days={monthDays}
          reference={currentDate}
          getRowsForDate={getRowsForDate}
          onDayClick={canCreate ? openCreate : undefined}
          onDayDoubleClick={(date) => {
            setCurrentDate(date)
            setMode("day")
          }}
        />
      )}
      {mode === "week" && (
        <WeekView
          days={weekDays}
          hours={dayHours}
          rowsWithDate={rowsWithDate}
          getEventPosition={getEventPosition}
          onSlotClick={canCreate ? openCreate : undefined}
          onDayClick={(date) => {
            setCurrentDate(date)
            setMode("day")
          }}
        />
      )}
      {mode === "day" && (
        <DayView
          day={currentDate}
          hours={dayHours}
          dayRows={getRowsForDate(currentDate)}
          getEventPosition={getEventPosition}
          onSlotClick={canCreate ? openCreate : undefined}
        />
      )}

      <ListPagination />
    </div>
  )
}

interface DayWithRows {
  row: RowInterface
  start: Date
  end: Date
  allDay: boolean
}

function MonthView({
  days,
  reference,
  getRowsForDate,
  onDayClick,
  onDayDoubleClick,
}: {
  days: Date[]
  reference: Date
  getRowsForDate: (date: Date) => DayWithRows[]
  onDayClick?: (date: Date) => void
  onDayDoubleClick: (date: Date) => void
}) {
  const narrow = useMediaQuery(NARROW_MONTH_QUERY)
  const [picked, setPicked] = useState<Date | null>(null)
  const selected =
    picked && isSameMonth(picked, reference)
      ? picked
      : isSameMonth(new Date(), reference)
        ? new Date()
        : startOfMonth(reference)

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted-foreground">
        {days.slice(0, 7).map((day) => (
          <div key={"weekday-" + WEEKDAY_KEYS[day.getDay()]} className="py-1">
            {narrow ? (
              format(day, "EEEEE", { locale: getDateLocale() })
            ) : (
              <Trans>{WEEKDAY_KEYS[day.getDay()]}</Trans>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayRows = getRowsForDate(day)
          const inCurrentMonth = isSameMonth(day, reference)

          if (narrow) {
            return (
              <NarrowDayCell
                key={"day-" + day.toISOString()}
                day={day}
                entries={dayRows}
                inCurrentMonth={inCurrentMonth}
                selected={isSameDay(day, selected)}
                onSelect={() => setPicked(day)}
              />
            )
          }

          return (
            <MonthDayCell
              key={"day-" + day.toISOString()}
              day={day}
              entries={dayRows}
              inCurrentMonth={inCurrentMonth}
              onClick={onDayClick ? () => onDayClick(day) : undefined}
              onDoubleClick={() => onDayDoubleClick(day)}
            />
          )
        })}
      </div>
      {narrow && (
        <NarrowAgenda
          day={selected}
          entries={getRowsForDate(selected)}
          onCreate={onDayClick ? () => onDayClick(selected) : undefined}
        />
      )}
    </>
  )
}

function NarrowDayCell({
  day,
  entries,
  inCurrentMonth,
  selected,
  onSelect,
}: {
  day: Date
  entries: DayWithRows[]
  inCurrentMonth: boolean
  selected: boolean
  onSelect: () => void
}) {
  const options = useLayout<CalendarLayoutOptions>().options
  const isCurrentDay = isToday(day)

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={format(day, "EEEE d MMMM", { locale: getDateLocale() })}
      onClick={onSelect}
      className={cn(
        "flex h-12 flex-col items-center justify-start gap-1 rounded-md border bg-background py-1 text-xs font-medium transition-colors",
        !inCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentDay && "border-primary",
        selected && "bg-accent"
      )}
    >
      <span>{format(day, "d")}</span>
      <span className="flex h-1.5 items-center gap-0.5">
        {entries.slice(0, MAX_DOTS).map((entry, index) => (
          <span
            key={"dot-" + index}
            className="size-1.5 rounded-full bg-primary"
            style={{
              backgroundColor: getRowColor(
                entry.row as RowInterface<Record<string, unknown>>,
                options.colorField
              ),
            }}
          />
        ))}
      </span>
    </button>
  )
}

function NarrowAgenda({
  day,
  entries,
  onCreate,
}: {
  day: Date
  entries: DayWithRows[]
  onCreate?: () => void
}) {
  const { resource } = useCurrentViewResourceContext()

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium capitalize">
          {format(day, "EEEE d MMMM", { locale: getDateLocale() })}
        </p>
        {onCreate && (
          <Button size="sm" variant="outline" onClick={onCreate}>
            <Trans>Create</Trans>
          </Button>
        )}
      </div>
      {entries.map((entry, index) => (
        <CalendarEvent
          key={
            "agenda-" + (getIdFromObject(entry.row.data, false, resource) ?? index)
          }
          entry={entry}
          showTime
        />
      ))}
    </div>
  )
}

function MonthDayCell({
  day,
  entries,
  inCurrentMonth,
  onClick,
  onDoubleClick,
}: {
  day: Date
  entries: DayWithRows[]
  inCurrentMonth: boolean
  onClick?: () => void
  onDoubleClick: () => void
}) {
  const { resource } = useCurrentViewResourceContext()
  const isCurrentDay = isToday(day)
  const visible = entries.slice(0, 2)
  const overflow = entries.length - visible.length

  return (
    <div
      className={cn(
        "flex min-h-24 flex-col gap-1 rounded-md border bg-background p-1 transition-colors",
        !inCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentDay && "border-primary",
        onClick && "cursor-pointer hover:bg-accent/40"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-center justify-between px-1">
        <span
          className={cn(
            "text-xs font-medium",
            isCurrentDay &&
              "rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground"
          )}
        >
          {format(day, "d")}
        </span>
        {entries.length > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {entries.length}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {visible.map((entry, index) => (
          <CalendarEvent
            key={
              "event-" + (getIdFromObject(entry.row.data, false, resource) ?? index)
            }
            entry={entry}
            showTime
          />
        ))}
        {overflow > 0 && (
          <DayOverflow entries={entries} day={day} count={overflow} />
        )}
      </div>
    </div>
  )
}

function DayView({
  day,
  hours,
  dayRows,
  getEventPosition,
  onSlotClick,
}: {
  day: Date
  hours: Date[]
  dayRows: DayWithRows[]
  getEventPosition: (start: Date, end: Date) => { top: number; height: number }
  onSlotClick?: (date: Date) => void
}) {
  const { resource } = useCurrentViewResourceContext()
  return (
    <div className="flex flex-col">
      <div className="border-b py-2 text-center">
        <div
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full text-lg font-medium",
            isToday(day) && "bg-primary text-primary-foreground"
          )}
        >
          {format(day, "d")}
        </div>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {format(day, "EEEE", { locale: getDateLocale() })}
        </p>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour.toISOString()} className="flex h-16 border-b">
              <div className="w-16 shrink-0 p-2 text-right text-xs text-muted-foreground">
                {format(hour, "HH:mm")}
              </div>
              <div
                className={cn(
                  "flex-1",
                  onSlotClick && "cursor-pointer hover:bg-accent/40"
                )}
                onClick={
                  onSlotClick
                    ? () =>
                        onSlotClick(setMinutes(setHours(day, hour.getHours()), 0))
                    : undefined
                }
              />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 left-16">
            {layoutDayEvents(dayRows, getEventPosition).map(
              ({ entry, top, height, left, width }, index) => (
                <div
                  key={
                    "event-" +
                    (getIdFromObject(entry.row.data, false, resource) ?? index)
                  }
                  className="pointer-events-auto absolute"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(${left * 100}% + 2px)`,
                    width: `calc(${width * 100}% - 4px)`,
                  }}
                >
                  <PositionedEvent entry={entry} compact={false} />
                </div>
              )
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function WeekView({
  days,
  hours,
  rowsWithDate,
  getEventPosition,
  onDayClick,
  onSlotClick,
}: {
  days: Date[]
  hours: Date[]
  rowsWithDate: DayWithRows[]
  getEventPosition: (start: Date, end: Date) => { top: number; height: number }
  onDayClick: (date: Date) => void
  onSlotClick?: (date: Date) => void
}) {
  const { resource } = useCurrentViewResourceContext()
  return (
    <div className="flex flex-col overflow-x-auto">
      <div className="flex min-w-[700px] border-b">
        <div className="w-16 shrink-0" />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onDayClick(day)}
            className={cn(
              "min-w-[80px] flex-1 cursor-pointer border-l py-2 text-center hover:bg-accent/50",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs capitalize text-muted-foreground">
              {format(day, "EEE", { locale: getDateLocale() })}
            </p>
            <div
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full text-sm font-medium",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </button>
        ))}
      </div>
      <ScrollArea className="h-[500px]">
        <div className="relative min-w-[700px]">
          {hours.map((hour) => (
            <div key={hour.toISOString()} className="flex h-16 border-b">
              <div className="w-16 shrink-0 p-2 text-right text-xs text-muted-foreground">
                {format(hour, "HH:mm")}
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-w-[80px] flex-1 border-l",
                    onSlotClick && "cursor-pointer hover:bg-accent/40"
                  )}
                  onClick={
                    onSlotClick
                      ? () =>
                          onSlotClick(setMinutes(setHours(day, hour.getHours()), 0))
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
          {days.map((day, dayIndex) => {
            const dayEntries = rowsWithDate.filter((entry) =>
              isSameDay(entry.start, day)
            )
            return (
              <div
                key={day.toISOString()}
                className="pointer-events-none absolute top-0 bottom-0"
                style={{
                  left: `calc(4rem + ${dayIndex} * ((100% - 4rem) / 7))`,
                  width: `calc((100% - 4rem) / 7)`,
                }}
              >
                {layoutDayEvents(dayEntries, getEventPosition).map(
                  ({ entry, top, height, left, width }, index) => (
                    <div
                      key={
                        "event-" +
                        (getIdFromObject(entry.row.data, false, resource) ?? index)
                      }
                      className="pointer-events-auto absolute"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(${left * 100}% + 1px)`,
                        width: `calc(${width * 100}% - 2px)`,
                      }}
                    >
                      <PositionedEvent entry={entry} compact />
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function CalendarEvent({
  entry,
  showTime,
}: {
  entry: DayWithRows
  showTime?: boolean
}) {
  const { resource } = useCurrentViewResourceContext()
  const options = useLayout<CalendarLayoutOptions>().options
  const title = getRowTitle(
    entry.row as RowInterface<Record<string, unknown>>,
    options.titleField,
    resource
  )
  const color = getRowColor(
    entry.row as RowInterface<Record<string, unknown>>,
    options.colorField
  )
  const Icon = options.getIcon?.(entry.row as RowInterface<Record<string, unknown>>)

  const style = color ? { backgroundColor: color + "30", color } : undefined

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium",
          !color && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
        style={style}
      >
        {Icon ? (
          <Icon className="size-3 shrink-0" />
        ) : (
          color && (
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          )
        )}
        {showTime && !entry.allDay && (
          <span className="shrink-0 tabular-nums">
            {format(entry.start, "HH:mm")}
          </span>
        )}
        <span className="truncate">{title || "—"}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <EventPreview
          row={entry.row}
          title={title}
          period={formatEventPeriod(entry.start, entry.end)}
          color={color}
          icon={Icon}
        />
      </PopoverContent>
    </Popover>
  )
}

function PositionedEvent({
  entry,
  compact,
}: {
  entry: DayWithRows
  compact: boolean
}) {
  const { resource } = useCurrentViewResourceContext()
  const options = useLayout<CalendarLayoutOptions>().options
  const title = getRowTitle(
    entry.row as RowInterface<Record<string, unknown>>,
    options.titleField,
    resource
  )
  const color =
    getRowColor(
      entry.row as RowInterface<Record<string, unknown>>,
      options.colorField
    ) ?? "var(--primary)"
  const Icon = options.getIcon?.(entry.row as RowInterface<Record<string, unknown>>)

  return (
    <Popover>
      <PopoverTrigger
        className="h-full w-full overflow-hidden rounded-md p-1 text-left transition-opacity hover:opacity-80"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <p className="flex items-center gap-1 truncate text-xs font-medium text-foreground">
          {Icon && <Icon className="size-3 shrink-0" />}
          <span className="truncate">{title || "—"}</span>
        </p>
        {!compact && !entry.allDay && (
          <p className="text-xs text-muted-foreground">
            {format(entry.start, "HH:mm")} - {format(entry.end, "HH:mm")}
          </p>
        )}
        {compact && !entry.allDay && (
          <p className="text-[11px] text-muted-foreground">
            {format(entry.start, "HH:mm")}
          </p>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <EventPreview
          row={entry.row}
          title={title}
          period={formatEventPeriod(entry.start, entry.end)}
          color={color}
          icon={Icon}
        />
      </PopoverContent>
    </Popover>
  )
}

function DayOverflow({
  entries,
  day,
  count,
}: {
  entries: DayWithRows[]
  day: Date
  count: number
}) {
  const { resource } = useCurrentViewResourceContext()
  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-secondary"
      >
        +{count} <Trans>more</Trans>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium capitalize">
          {format(day, "EEEE d MMMM", { locale: getDateLocale() })}
        </div>
        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-1 p-2">
            {entries.map((entry, index) => (
              <CalendarEvent
                key={
                  "overflow-" +
                  (getIdFromObject(entry.row.data, false, resource) ?? index)
                }
                entry={entry}
                showTime
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

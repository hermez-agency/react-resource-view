import { useMemo } from "react"
import { ActionList } from "react-data-form"
import { Trans, translate } from "react-mini-i18n"
import ListPagination from "@/views/list/component/ListPagination"
import { InlineChildView } from "@/components/ChildViewResourceDialog"
import { cn } from "@/ui/cn"
import type { FeedLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import { Link, getDateLocale } from "@/ports"
import { useViewLink } from "@/open/childViewRoute"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { usePermission } from "@/utils/permissionResource"
import { ListComponentPropsInterface, RowInterface } from "@/ViewResource"
import { coverImageOf } from "@/views/list/component/gallery/coverImage"
import {
  actorName,
  dayKind,
  fullDateLabel,
  fullDayLabel,
  groupByDay,
  initialsOf,
  readDate,
  relativeLabel,
} from "@/views/list/component/feed/feedData"

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined
  if (typeof value === "number") return String(value)
  return undefined
}

/**
 * A journal: the records as events, newest first, gathered by day under a
 * heading, along a vertical thread. Nested lists — the days, then the events of
 * a day — so a screen reader announces how many there are; the title of an
 * event is the link opening the record, which stretches over the whole event,
 * so it is reached with Tab and a click anywhere on the event follows it.
 */
export function ListFeed({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<FeedLayoutOptions>().options
  const currentResource = useCurrentViewResourceContext()
  const resource = currentResource?.resource
  const titleField = options.titleField ?? currentResource?.view?.titleField
  const dateField = options.dateField ?? "createdAt"
  const locale = getDateLocale()
  const now = new Date()

  const days = useMemo(
    () =>
      groupByDay(
        rows,
        (row) => readDate((row.data as Record<string, unknown>)?.[dateField]),
        options.order ?? "desc"
      ),
    [rows, dateField, options.order]
  )

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        <Trans>No data yet</Trans>
      </p>
    )
  }

  return (
    <div className="w-full">
      <ol aria-label={translate("Activity")} className="flex flex-col gap-8">
        {days.map((group) => {
          const kind = group.day ? dayKind(group.day, now) : undefined
          const heading = !group.day
            ? translate("No date")
            : kind === "today"
              ? translate("Today")
              : kind === "yesterday"
                ? translate("Yesterday")
                : fullDayLabel(group.day, locale)
          const headingId = `feed-day-${group.key}`

          return (
            <li key={group.key} aria-labelledby={headingId}>
              <h3
                id={headingId}
                className="mb-3 text-sm font-semibold text-muted-foreground"
              >
                {heading}
              </h3>
              <ol className="relative flex flex-col">
                {group.entries.map((entry, index) => (
                  <FeedEvent
                    key={
                      getIdFromObject(entry.row.data, false, resource) ??
                      `row-${index}`
                    }
                    row={entry.row}
                    date={entry.date}
                    options={options}
                    titleField={titleField}
                    last={index === group.entries.length - 1}
                  />
                ))}
              </ol>
            </li>
          )
        })}
      </ol>
      <div className="mt-6">
        <ListPagination />
      </div>
    </div>
  )
}

interface FeedEventProps {
  row: RowInterface
  date?: Date
  options: FeedLayoutOptions
  titleField?: string
  last: boolean
}

function FeedEvent({ row, date, options, titleField, last }: FeedEventProps) {
  const { resource } = useCurrentViewResourceContext()
  const data = (row.data ?? {}) as Record<string, unknown>
  const locale = getDateLocale()
  const id = getIdFromObject(row.data, false, resource)
  const canRead = usePermission(ActionList.read, row.data)
  const canUpdate = usePermission(ActionList.update, row.data)
  const action = canRead ? ActionList.read : ActionList.update
  const link = useViewLink({ resource, action, id })
  const canOpen =
    (canRead || canUpdate) && id !== undefined && row.pending !== "create"

  const title = getRecordTitle(data, titleField) ?? id ?? ""
  const secondary = options.descriptionField
    ? text(data[options.descriptionField])
    : undefined
  const actor = options.actorField ? actorName(data[options.actorField]) : undefined
  const avatar = options.avatarField
    ? coverImageOf(data[options.avatarField])
    : undefined
  const type = options.typeField ? text(data[options.typeField]) : undefined
  const style = type ? options.types?.[type] : undefined
  const Icon = style?.icon

  return (
    <li
      aria-busy={row.pending ? true : undefined}
      className={cn("relative flex gap-3 pb-6", last && "pb-0")}
    >
      {/* The thread, running from one marker to the next. */}
      {!last && (
        <span
          aria-hidden
          className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border"
        />
      )}
      <span
        aria-hidden
        data-feed-marker
        style={style?.color ? { color: style.color } : undefined}
        className={cn(
          "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground",
          style?.color && "border-current"
        )}
      >
        {Icon ? (
          <Icon className="size-4" />
        ) : (
          <span className="size-2 rounded-full bg-current" />
        )}
      </span>

      <div
        className={cn(
          "group/event relative -mt-1 min-w-0 flex-1 rounded-xl px-3 py-1 transition-colors",
          canOpen && "hover:bg-muted/40 has-[a:focus-visible]:ring-3 ring-ring/50",
          row.pending && "opacity-60"
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="min-w-0 text-sm font-medium break-words">
            {canOpen ? (
              <Link
                to={link.to}
                onClick={link.onOpen}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </p>
          {date && (
            <time
              dateTime={date.toISOString()}
              title={fullDateLabel(date, locale)}
              className="shrink-0 text-xs text-muted-foreground"
            >
              <span aria-hidden>{relativeLabel(date, locale)}</span>
              <span className="sr-only">{fullDateLabel(date, locale)}</span>
            </time>
          )}
        </div>
        {secondary && (
          <p className="mt-0.5 text-sm break-words text-muted-foreground">
            {secondary}
          </p>
        )}
        {actor && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-5 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium"
              >
                {initialsOf(actor)}
              </span>
            )}
            <span>{actor}</span>
          </p>
        )}
        <div className="relative z-[2] empty:hidden">
          <InlineChildView row={row} />
        </div>
      </div>
    </li>
  )
}

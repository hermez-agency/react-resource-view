import { useMemo } from "react"
import { format } from "date-fns"
import { Trans, translate } from "react-mini-i18n"
import ListPagination from "@/views/list/component/ListPagination"
import { cn } from "@/ui/cn"
import type { ChartLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { getCollectionTotal } from "@/api/collection"
import { getDateLocale, getWeekStartsOn } from "@/ports"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { ListComponentPropsInterface } from "@/ViewResource"
import {
  type ChartBucket,
  type ChartInterval,
  chartData,
} from "@/views/list/component/chart/chartData"

const PERIOD_FORMATS: Record<ChartInterval, string> = {
  day: "d MMM",
  week: "d MMM",
  month: "MMM yyyy",
}

/** The most period labels drawn under the columns before they collide. */
const MAX_PERIOD_LABELS = 8
/** The most columns that each carry their figure above them. */
const MAX_DIRECT_LABELS = 12

const defaultNumberFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

export function ListChart({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<ChartLayoutOptions>().options
  const listView = useListViewContext()
  const { resource } = useCurrentViewResourceContext() ?? {}
  const formatValue =
    options.format ?? ((n: number) => defaultNumberFormat.format(n))
  const aggregate = options.aggregate ?? (options.valueField ? "sum" : "count")
  const valueLabel = options.valueLabel ?? options.valueField ?? ""

  const summary = useMemo(
    () =>
      chartData(
        rows.map((row) => row.data as RecordOfAny),
        {
          groupBy: options.groupBy,
          groups: options.groups,
          dateField: options.dateField,
          interval: options.interval,
          valueField: options.valueField,
          aggregate,
          resource,
          emptyLabel: translate("None"),
          weekStartsOn: getWeekStartsOn(),
          formatPeriod: (date, interval) =>
            format(date, PERIOD_FORMATS[interval], { locale: getDateLocale() }),
        }
      ),
    [rows, options, aggregate, resource]
  )

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        <Trans>No data yet</Trans>
      </p>
    )
  }

  // The figures are those of the page on screen. Saying so when the API holds
  // more is the difference between a statistic and a wrong one.
  const collectionTotal = listView?.originalData
    ? getCollectionTotal(listView.originalData, resource)
    : undefined
  const partial = collectionTotal !== undefined && collectionTotal > rows.length

  const measureTitle =
    options.title ??
    (aggregate === "count"
      ? translate("Records")
      : aggregate === "sum"
        ? translate("Total {{field}}", { field: valueLabel })
        : translate("Average {{field}}", { field: valueLabel }))

  return (
    <div className="flex w-full flex-col gap-4" data-slot="chart">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label={translate("Records")} value={String(summary.count)} />
        {summary.total !== undefined && (
          <StatTile
            label={translate("Total {{field}}", { field: valueLabel })}
            value={formatValue(summary.total)}
          />
        )}
        {summary.average !== undefined && (
          <StatTile
            label={translate("Average {{field}}", { field: valueLabel })}
            value={formatValue(summary.average)}
          />
        )}
      </div>

      {summary.buckets.length > 0 && (
        <figure className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <figcaption className="mb-4 text-sm font-medium">
            {measureTitle}
          </figcaption>
          {options.dateField ? (
            <Columns buckets={summary.buckets} formatValue={formatValue} />
          ) : (
            <Bars buckets={summary.buckets} formatValue={formatValue} />
          )}
        </figure>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {partial ? (
          <p className="text-xs text-muted-foreground">
            <Trans
              params={{
                count: String(rows.length),
                total: String(collectionTotal),
              }}
            >
              {"Figures over the {{count}} records of this page, out of {{total}}"}
            </Trans>
          </p>
        ) : (
          <span />
        )}
        <ListPagination />
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

interface MarksProps {
  buckets: ChartBucket[]
  formatValue: (value: number) => string
}

function describe(bucket: ChartBucket, formatValue: (value: number) => string) {
  return `${bucket.label}: ${formatValue(bucket.value)}`
}

/**
 * One horizontal bar per category, labelled at both ends: the category on the
 * left, its figure on the right — readable without a legend or an axis.
 */
function Bars({ buckets, formatValue }: MarksProps) {
  const max = Math.max(0, ...buckets.map((b) => b.value))

  return (
    <ul className="flex flex-col gap-2">
      {buckets.map((bucket) => {
        const share = max > 0 ? Math.max(0, bucket.value) / max : 0
        return (
          <li
            key={bucket.key}
            className="group grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            title={describe(bucket, formatValue)}
          >
            <span className="truncate text-muted-foreground">{bucket.label}</span>
            <span className="relative h-5 overflow-hidden" aria-hidden>
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-primary transition-opacity group-hover:opacity-80 motion-reduce:transition-none"
                style={{
                  width: `${share * 100}%`,
                  minWidth: bucket.value > 0 ? 2 : 0,
                }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">
              {formatValue(bucket.value)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * One column per period, in time order, over a baseline. A few columns carry
 * their figure above them, many show it on hover; every one of them is in the
 * table read out to a screen reader.
 */
function Columns({ buckets, formatValue }: MarksProps) {
  const max = Math.max(0, ...buckets.map((b) => b.value))
  const labelEvery = Math.ceil(buckets.length / MAX_PERIOD_LABELS)
  // A figure over every column while there is room for it; past that, on hover.
  const labelled = buckets.length <= MAX_DIRECT_LABELS

  return (
    <div>
      <div
        className="flex h-48 items-end justify-center gap-0.5 border-b border-border pt-5"
        aria-hidden
      >
        {buckets.map((bucket) => (
          <div
            key={bucket.key}
            className="group relative flex h-full max-w-16 min-w-0 flex-1 items-end"
            title={describe(bucket, formatValue)}
          >
            <span
              className="relative w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80 motion-reduce:transition-none"
              style={{
                height: `${max > 0 ? (Math.max(0, bucket.value) / max) * 100 : 0}%`,
                minHeight: bucket.value > 0 ? 2 : 0,
              }}
            >
              <span
                className={cn(
                  "pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs whitespace-nowrap tabular-nums",
                  labelled
                    ? "font-medium"
                    : "hidden rounded-md bg-popover px-2 py-1 text-popover-foreground shadow ring-1 ring-foreground/5 group-hover:block"
                )}
              >
                {labelled
                  ? formatValue(bucket.value)
                  : describe(bucket, formatValue)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-center gap-0.5" aria-hidden>
        {buckets.map((bucket, index) => (
          <span
            key={bucket.key}
            className={cn(
              "max-w-16 min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground",
              index % labelEvery !== 0 && "invisible"
            )}
          >
            {bucket.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.key}>
              <th scope="row">{bucket.label}</th>
              <td>{formatValue(bucket.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

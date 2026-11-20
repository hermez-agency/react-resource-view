import { Trans } from "react-mini-i18n"
import { RowComponentPropsInterface } from "@/ViewResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useLayout } from "@/layout/useLayout"
import { useFieldVisibility } from "@/views/list/fields/Field"

import { DefaultItemComponent } from "@/views/list/component/DefaultItemComponent"

/**
 * Past a handful of lines a summary is the dump it was written to replace, and
 * the window holding it stops being small. The record in full is one click
 * away, through the actions drawn under it.
 */
const MAX_FIELDS = 5

/** What a record carries for the API's sake, and no reader ever asks for. */
const TECHNICAL_KEYS = ["@id", "@type", "@context", "id", "documentId"]

/**
 * The fields a calendar event or a timeline bar already writes on itself. The
 * option names differ between the two layouts; both are read here so neither
 * repeats its title and its dates inside the window opening on it.
 */
interface EventFieldsInterface {
  titleField?: string
  dateField?: string
  endDateField?: string
  startField?: string
  endField?: string
  colorField?: string
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * A record as a few labelled lines.
 *
 * The layouts drawing a record inside a popover — calendar, timeline — used to
 * print every key it carries, `@context` and identifiers included, which is a
 * data dump rather than a preview. This shows what the resource declares in its
 * form, in the order it declares it, labelled the way the form labels it, and
 * stops before the window grows a scrollbar of its own.
 */
export function PreviewRowComponent({ row }: RowComponentPropsInterface) {
  const view = useCurrentViewResourceContext().view
  const options = useLayout<EventFieldsInterface>().options
  const visibility = useFieldVisibility()

  const data = row?.data
  if (!data) return <Trans>No data yet</Trans>

  const hiddenKeys = [
    ...TECHNICAL_KEYS,
    options.titleField,
    options.dateField,
    options.endDateField,
    options.startField,
    options.endField,
    options.colorField,
  ]

  const inputs = view.form?.inputs ?? {}
  // The order a resource declares its form in is the order it reads best in; a
  // resource without a form falls back to the order the API answered with.
  const declaredKeys = Object.keys(inputs)
  const keys = declaredKeys.length > 0 ? declaredKeys : Object.keys(data)

  const shownKeys = keys
    .filter(
      (key) =>
        !hiddenKeys.includes(key) &&
        (visibility?.isVisible(key) ?? true) &&
        hasValue(data[key])
    )
    .slice(0, MAX_FIELDS)

  if (shownKeys.length === 0) return null

  return (
    <dl className="flex w-full flex-col gap-2">
      {shownKeys.map((key) => (
        <div key={"preview-" + key} className="flex items-baseline gap-3">
          <dt className="w-1/3 shrink-0 text-xs text-muted-foreground">
            <Trans>{inputs[key]?.label ?? key}</Trans>
          </dt>
          <dd className="min-w-0 flex-1 truncate">
            <DefaultItemComponent formInput={{ name: key, value: data[key] }} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

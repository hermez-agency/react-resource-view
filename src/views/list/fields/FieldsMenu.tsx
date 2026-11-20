import { Eye, RotateCcw } from "lucide-react"
import { Trans, translate } from "react-mini-i18n"
import { createForm, getFormInputsFromForm } from "react-data-form"
import type { FormInputInterface } from "react-data-form"
import { Button } from "@/ui/button"
import { Checkbox } from "@/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { cn } from "@/ui/cn"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { useFieldVisibility } from "@/views/list/fields/Field"

/** A box of the menu: a field, and how deep it sits. */
export interface DeclaredField {
  field: string
  label: string
  depth: number
}

/** What a record carries for the API's sake: no reader hides it, nobody shows it. */
const isTechnicalKey = (key: string) => key.startsWith("@")

/** The field an input shows: its `name`, or its `id`. */
const fieldOf = (input: { name?: unknown; id?: unknown }) =>
  String(input.name ?? input.id)

const labelOf = (input: FormInputInterface, field: string) =>
  typeof input.label === "string" && input.label ? input.label : field

/** An input and the inputs of the form nested in it: `user`, `user.name`, `user.email`. */
function fieldsOfInputs(
  inputs: FormInputInterface[],
  parent: string | null,
  depth: number
): DeclaredField[] {
  return inputs
    .filter((input) => !input.generatedValue)
    .flatMap((input) => {
      const own = fieldOf(input)
      const field = parent ? parent + "." + own : own
      const nested = input.form?.inputs
        ? fieldsOfInputs(
            Object.entries(input.form.inputs).map(([key, child]) => ({
              name: key,
              ...child,
            })),
            field,
            depth + 1
          )
        : []

      return [{ field, label: labelOf(input, own), depth }, ...nested]
    })
}

/**
 * The fields of the list: the inputs its form declares, nested ones included;
 * without a form, the keys of the records on screen.
 */
export function useDeclaredFields(): DeclaredField[] {
  const { view } = useCurrentViewResourceContext()
  const { rows } = useListViewContext()

  if (view.form) {
    return fieldsOfInputs(getFormInputsFromForm(createForm(view.form)), null, 0)
  }

  const keys = new Set<string>()
  for (const row of rows ?? []) {
    Object.keys(row.data ?? {}).forEach((key) => {
      if (!isTechnicalKey(key)) keys.add(key)
    })
  }

  return [...keys].map((field) => ({ field, label: field, depth: 0 }))
}

/**
 * The "Shown fields" menu next to a list's filters: a box per declared field,
 * whatever the layout on screen. A field unchecked is hidden in every layout
 * of the list — the table's column, the card's line, the calendar's preview.
 * Unchecking `user` hides `user.name` with it. `views.list.fields.toggle:
 * false` takes it away.
 */
export function FieldsMenu() {
  const { view } = useCurrentViewResourceContext()
  const visibility = useFieldVisibility()
  const fields = useDeclaredFields()

  if (!visibility || !view.fields?.toggle || fields.length === 0) return null

  const { isVisible, setVisible, customised, reset } = visibility
  const topLevel = fields.filter((field) => field.depth === 0)
  const shownTopLevel = topLevel.filter((field) => isVisible(field.field)).length
  const hiddenCount = topLevel.length - shownTopLevel

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="sm"
            data-slot="fields-menu-trigger"
            className="ms-auto shrink-0"
          />
        }
      >
        <Eye />
        <Trans>Shown fields</Trans>
        {hiddenCount > 0 && (
          <span
            data-slot="fields-menu-count"
            className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground"
          >
            {shownTopLevel}/{topLevel.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-96 gap-2 overflow-y-auto p-2">
        <ul aria-label={translate("Shown fields")} className="flex flex-col">
          {fields.map(({ field, label, depth }) => {
            const visible = isVisible(field)

            return (
              <li
                key={field}
                data-slot="fields-menu-item"
                data-field={field}
                className="rounded-lg px-1 py-1.5"
                style={depth ? { paddingInlineStart: depth * 20 + 4 } : undefined}
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2",
                    !visible && "text-muted-foreground"
                  )}
                >
                  <Checkbox
                    checked={visible}
                    // A list keeps one field at least.
                    disabled={depth === 0 && visible && shownTopLevel === 1}
                    onCheckedChange={(checked) => setVisible(field, checked)}
                  />
                  <span className="truncate">{translate(label)}</span>
                </label>
              </li>
            )
          })}
        </ul>
        {customised && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw />
            <Trans>Reset to default</Trans>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

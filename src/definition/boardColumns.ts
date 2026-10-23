import type { ValueOptionInterface } from "react-data-form"
import type { FormDefinition } from "@/ResourceDefinition"

/**
 * The columns of a board that gives none: the options of the select input it
 * groups by, in the order the form declares them. `undefined` when that input
 * has no options to read.
 */
export function columnsFromForm(
  form: FormDefinition | undefined,
  groupBy: unknown
): ValueOptionInterface[] | undefined {
  if (typeof groupBy !== "string") return undefined
  const input = (form?.inputs as Record<string, any> | undefined)?.[groupBy]
  if (!input || !Array.isArray(input.options) || !input.options.length)
    return undefined

  return input.options
}

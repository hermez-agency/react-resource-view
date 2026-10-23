import type { ValueOptionInterface } from "react-data-form"
import type { RowInterface } from "@/ViewResource"
import { sameColumnValue } from "@/views/list/component/columns/useBoard"

/** The records of a page that share a value of the field they are grouped by. */
export interface RowGroup {
  /** `""` for the records with no value. */
  key: string
  label: string
  rows: RowInterface[]
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}

/** What a value is filed under: a related record by its name, a scalar as written. */
function describe(value: unknown): { key: string; label: string } {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const key = String(record["@id"] ?? record.id ?? record.name ?? "")
    const label = String(record.name ?? record.label ?? record.title ?? key)
    return { key, label }
  }
  return { key: String(value), label: String(value) }
}

/**
 * The records of the page in one group per value of `groupBy`: in the order of
 * `options` — those of the field's select — when it has some, then the values
 * they do not know in order of appearance, and the records with no value last.
 * A declared option without a record is a group of its own, empty, so the
 * sections do not move when a page happens to lack a status.
 */
export function groupRows(
  rows: RowInterface[],
  groupBy: string,
  options: ValueOptionInterface[] | undefined,
  emptyLabel: string
): RowGroup[] {
  const declared: RowGroup[] = (options ?? []).map((option) => ({
    key: String(option.value),
    label: String(option.label ?? option.value),
    rows: [],
  }))
  const others = new Map<string, RowGroup>()
  const unassigned: RowGroup = { key: "", label: emptyLabel, rows: [] }

  for (const row of rows) {
    const value = (row.data as Record<string, unknown> | undefined)?.[groupBy]
    if (isEmpty(value)) {
      unassigned.rows.push(row)
      continue
    }

    const known = (options ?? []).findIndex((option) =>
      sameColumnValue(value, option.value)
    )
    if (known >= 0) {
      declared[known].rows.push(row)
      continue
    }

    const { key, label } = describe(value)
    const group = others.get(key) ?? { key, label, rows: [] }
    group.rows.push(row)
    others.set(key, group)
  }

  return [
    ...declared,
    ...others.values(),
    ...(unassigned.rows.length ? [unassigned] : []),
  ]
}

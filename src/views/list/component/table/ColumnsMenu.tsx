import { useState } from "react"
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react"
import { Trans, translate } from "react-mini-i18n"
import { Button } from "@/ui/button"
import { Checkbox } from "@/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { cn } from "@/ui/cn"
import type { useColumnPreferences } from "@/views/list/component/table/columnPreferences"
import type { useGroupBy } from "@/views/list/grouping/groupPreference"

interface ColumnsMenuProps {
  preferences: ReturnType<typeof useColumnPreferences>
  /** The header of each field, as the table writes it. */
  labels: Record<string, string>
  /** What the rows are grouped by, and what changes it. */
  grouping?: ReturnType<typeof useGroupBy>
}

/**
 * The "Properties" menu of a table, as in Notion: a box per column to show or
 * hide it, a handle to drag it elsewhere — or Alt + ↑ / ↓ from the keyboard —
 * and a button back to the declaration. Its "Group by" picks the select the
 * rows are sectioned by.
 */
export function ColumnsMenu({ preferences, labels, grouping }: ColumnsMenuProps) {
  const { columns, customised, toggle, move, reset } = preferences
  const [dragged, setDragged] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const visibleCount = columns.filter((column) => column.visible).length

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="secondary" size="sm" data-slot="columns-menu-trigger" />
        }
      >
        <SlidersHorizontal />
        <Trans>Properties</Trans>
      </PopoverTrigger>
      <PopoverContent align="end" className="gap-2 p-2">
        <ul aria-label={translate("Properties")} className="flex flex-col">
          {columns.map((column, index) => {
            const label = translate(labels[column.field] ?? column.field)

            return (
              <li
                key={column.field}
                data-slot="columns-menu-item"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", column.field)
                  setDragged(index)
                }}
                onDragOver={(event) => {
                  if (dragged === null) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  setOver(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragged !== null) move(dragged, index)
                  setDragged(null)
                  setOver(null)
                }}
                onDragEnd={() => {
                  setDragged(null)
                  setOver(null)
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-1 py-1.5",
                  dragged === index && "opacity-50",
                  over === index && dragged !== index && "bg-muted"
                )}
              >
                <button
                  type="button"
                  aria-label={translate("Move") + " " + label}
                  className="cursor-grab rounded text-muted-foreground focus-visible:outline-2"
                  onKeyDown={(event) => {
                    if (!event.altKey) return
                    if (event.key === "ArrowUp") move(index, index - 1)
                    else if (event.key === "ArrowDown") move(index, index + 1)
                    else return
                    event.preventDefault()
                  }}
                >
                  <GripVertical aria-hidden className="size-4" />
                </button>
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={column.visible}
                    // The table keeps one column at least.
                    disabled={column.visible && visibleCount === 1}
                    onCheckedChange={(checked) => toggle(column.field, checked)}
                  />
                  <span className="truncate">{label}</span>
                </label>
              </li>
            )
          })}
        </ul>
        {grouping && grouping.groupable.length > 0 && (
          <label className="flex items-center justify-between gap-2 px-1 text-sm">
            <Trans>Group by</Trans>
            <select
              data-slot="group-by-select"
              className="rounded-md border bg-background px-2 py-1"
              value={grouping.field ?? ""}
              onChange={(event) => grouping.select(event.target.value || undefined)}
            >
              <option value="">{translate("No grouping")}</option>
              {grouping.groupable.map((candidate) => (
                <option key={candidate.field} value={candidate.field}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {(customised || grouping?.customised) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset()
              grouping?.reset()
            }}
          >
            <RotateCcw />
            <Trans>Reset to default</Trans>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

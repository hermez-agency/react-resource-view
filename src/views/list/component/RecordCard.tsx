import { ReactNode } from "react"
import { cn } from "@/ui/cn"
import { RowInterface } from "@/ViewResource"
import ListResourceViewButton, {
  useRowActions,
} from "@/action/ListResourceViewButton"
import { useAllowedActions } from "@/utils/permissionResource"
import { DefaultRowComponent } from "@/views/list/component/DefaultRowComponent"

export interface RecordCardProps {
  row: RowInterface
  /** Drawn under the record. Off where the frame itself is the control. */
  withActions?: boolean
  /** A picture running edge to edge across the top of the card. */
  cover?: ReactNode
  /**
   * `false` keeps the record without its edge — border, padding, background —
   * for a row component that draws its own card.
   */
  frame?: boolean
  className?: string
  children?: ReactNode
}

/**
 * The frame a record is drawn in, outside a table.
 *
 * Card, item, column and split all hand the drawing of a record to the view's
 * `rowComponent` — which belongs to the consumer and knows nothing about the
 * layout around it. Giving it an edge is therefore the layout's job: without
 * one, a grid of records is a wall of text, and that is what these layouts
 * looked like. One frame for the four of them means a record reads the same
 * wherever it is shown, and gains the actions a table row has always had.
 */
export function RecordCard({
  row,
  withActions = false,
  cover,
  frame = true,
  className,
  children,
}: RecordCardProps) {
  // A resource permitting none of the row's actions would otherwise be given a
  // separator with nothing under it, and the padding below it.
  const rowActions = useRowActions()
  const hasActions = useAllowedActions(rowActions, row.data).length > 0
  // Drawn before the API created it: no identifier yet, so nothing to act on.
  const isDraft = row.pending === "create"

  return (
    <div
      aria-busy={row.pending ? true : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-3",
        frame && "rounded-2xl border border-border bg-card p-4",
        frame && "transition-[colors,opacity] hover:border-foreground/20",
        !frame && "transition-opacity",
        row.pending && "opacity-60",
        isDraft && "pointer-events-none",
        isDraft && frame && "border-dashed",
        // The padding stays for the text; the picture takes it back.
        cover && "overflow-hidden",
        className
      )}
    >
      {cover && <div className="-mx-4 -mt-4">{cover}</div>}

      {/* `break-words`: `min-w-0` lets the card be narrower than its content,
          but nothing let a long unbreakable word wrap — it ran out of the card.
          Without a frame, the row's own card is stretched like the frame would
          be, so a row of cards keeps one height. */}
      <div
        className={cn(
          "min-w-0 break-words",
          !frame && "flex flex-1 flex-col [&>*]:flex-1"
        )}
      >
        {children ?? <DefaultRowComponent row={row} />}
      </div>

      {withActions && hasActions && !isDraft && (
        // `mt-auto` pins the actions to the bottom edge: the grid stretches
        // every card of a row to the tallest one, and without it a card whose
        // record is one line shorter puts its buttons a line higher than its
        // neighbours.
        <div
          className={cn(
            "mt-auto flex flex-wrap gap-2",
            frame && "border-t border-border pt-3"
          )}
        >
          <ListResourceViewButton data={row.data} />
        </div>
      )}
    </div>
  )
}

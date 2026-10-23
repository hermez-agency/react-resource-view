import React, { useState } from "react"
import { ValueOptionInterface } from "react-data-form"
import { Trans } from "react-mini-i18n"
import { RowInterface } from "@/ViewResource"
import { cn } from "@/ui/cn"
import { BoardCard } from "@/views/list/component/columns/BoardCard"
import {
  sameColumnValue,
  useBoard,
  useBoardContext,
} from "@/views/list/component/columns/useBoard"

export interface RowWrapperColumnComponentPropsInterface {
  valueIdentifier: ValueOptionInterface
  isDragging: boolean
  handleDragging: (dragging: boolean) => void
  identifierKey: string
  rows: RowInterface[]
  /**
   * The column of the records matching none of the board's columns. Nothing
   * can be dropped in it: it has no value to write.
   */
  unassigned?: boolean
}

export default function RowWrapperColumnComponent({
  identifierKey,
  valueIdentifier,
  handleDragging,
  isDragging,
  rows,
  unassigned = false,
}: RowWrapperColumnComponentPropsInterface) {
  // The board is shared by its columns — a selection spans them, a drag goes
  // from one to the other. A column drawn on its own, outside `ListColumn`,
  // keeps a board of its own, without selection.
  const sharedBoard = useBoardContext()
  const ownBoard = useBoard({
    rows,
    identifierKey,
    columns: [valueIdentifier],
    selectable: false,
  })
  const board = sharedBoard ?? ownBoard

  // Highlighting every column while one card is in the air said nothing about
  // where it would land. Only the column under the pointer lights up.
  const [isOver, setIsOver] = useState(false)

  const columnRows = rows.filter((row) =>
    unassigned
      ? !board.columns.some((column) =>
          sameColumnValue(board.columnOf(row), column.value)
        )
      : sameColumnValue(board.columnOf(row), valueIdentifier.value)
  )
  const columnIds = columnRows.map(board.idOf)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (unassigned) return
    e.preventDefault()
    setIsOver(false)
    handleDragging(false)
    // The cards carried are the board's to say — the whole selection when the
    // card picked up was part of it. A drag that did not start on the board
    // only has the id it carries.
    const carried = board.draggedNow()
    const ids = carried.length ? carried : [e.dataTransfer.getData("text")]
    board.endDrag()

    void board.moveTo(ids.filter(Boolean), valueIdentifier.value)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (unassigned) return
    e.preventDefault()
    setIsOver(true)
  }

  return (
    <div
      className={cn(
        // `min-w-0`: a flex item is never narrower than its widest content, so
        // a card holding one long unbreakable word (a path, a URL, an id)
        // widened the whole column as soon as a parent sized it, and pushed it
        // under its neighbours.
        "flex w-72 min-w-0 shrink-0 flex-col rounded-2xl border border-border bg-muted/30 transition-colors",
        // While a card is being carried, every column reads as a target; the
        // one under the pointer reads as *the* target.
        (isDragging || board.dragging.length > 0) && "border-dashed",
        isOver && "border-primary bg-primary/5"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        // Leaving for one of its own cards is still being over the column.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsOver(false)
        }
      }}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="truncate text-sm font-medium">{valueIdentifier.label}</p>
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
          {columnRows.length}
        </span>
      </header>

      {/* Each column scrolls on its own, so a long one does not push the
          board's horizontal scrollbar, nor its neighbours' cards, off the
          screen. */}
      <div
        data-slot="board-column-cards"
        className="flex max-h-[calc(100dvh-14rem)] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2"
      >
        {columnRows.map((row, index) => (
          <BoardCard
            // A card drawn before the API created it has no id yet.
            key={row.pending === "create" ? `draft-${index}` : board.idOf(row)}
            row={row}
            board={board}
            columnIds={columnIds}
          />
        ))}

        {columnRows.length === 0 && (
          // An empty column is still somewhere to drop a card: the slot says
          // so, and says it louder while a card is in the air.
          <p
            className={cn(
              "flex min-h-20 items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-xs text-muted-foreground transition-colors",
              board.dragging.length > 0 && "border-primary/50 text-foreground",
              isOver && "border-primary bg-primary/10"
            )}
          >
            {board.dragging.length > 0 ? (
              <Trans>Drop here</Trans>
            ) : (
              <Trans>Nothing here</Trans>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

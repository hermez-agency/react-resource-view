import React, { useRef } from "react"
import { ActionList } from "react-data-form"
import { translate } from "react-mini-i18n"
import { RowInterface } from "@/ViewResource"
import { cn } from "@/ui/cn"
import { Checkbox } from "@/ui/checkbox"
import { useNavigate } from "@/ports"
import { usePermission } from "@/utils/permissionResource"
import { useLayout } from "@/layout/useLayout"
import type { BoardLayoutOptions } from "@/layout/layout"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { rememberChildViewOpener } from "@/components/childViewOpener"
import { useViewLink } from "@/open/childViewRoute"
import { RecordCard } from "@/views/list/component/RecordCard"
import { BoardInterface } from "@/views/list/component/columns/useBoard"
import {
  hasTextSelectionIn,
  isCardControlTarget,
} from "@/views/list/component/columns/cardClick"

/** How long a finger rests on a card before it selects it. */
const LONG_PRESS_MS = 450

export interface BoardCardProps {
  row: RowInterface
  board: BoardInterface
  /** The ids of the cards of this column, in order: what a range spans. */
  columnIds: string[]
}

/**
 * One card of a board: the record's frame, plus what the board does with it —
 * open it, select it, carry it to another column.
 *
 * Every one of those goes through the card itself, and none through what is
 * drawn in it: a click landing on a control of the row component — a link, a
 * button, a menu, the checkbox — is that control's alone (see `cardClick`).
 */
export function BoardCard({ row, board, columnIds }: BoardCardProps) {
  const currentResource = useCurrentViewResourceContext()
  const { resource } = currentResource
  const navigate = useNavigate()
  const id = board.idOf(row)

  const { titleField } = useLayout<BoardLayoutOptions>().options
  const canRead = usePermission(ActionList.read, row.data)
  const canMove = usePermission("move", row.data)
  const canOpen = canRead
  // The record's `read` view, where that view opens: the same URL as any
  // other way of opening it.
  const readLink = useViewLink({ resource, action: ActionList.read, id })
  const isSelected = board.isSelected(id)
  const isDragged = board.dragging.includes(id)
  const hasSelection = board.selected.length > 0
  const title =
    getRecordTitle(row.data, titleField ?? currentResource.view?.titleField) ?? id

  // A touch, a pen or a mouse: a tap on a phone does not mean what a click
  // means once a selection has started.
  const pointerType = useRef<string>("mouse")
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const swallowNextClick = useRef(false)

  const cancelLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current)
    longPress.current = null
    pressStart.current = null
  }

  const open = (card: HTMLElement) => {
    if (!canOpen) return

    // Over the board, the board stays as it is underneath, with its filter
    // and its layout, and the focus comes back to the card once closed.
    if (readLink.frame.placement !== "page") {
      rememberChildViewOpener(card, resource["@id"], id)
    }
    navigate({ to: readLink.to })
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    if (isCardControlTarget(e.target, card)) return
    if (swallowNextClick.current) {
      swallowNextClick.current = false
      return
    }
    // Selecting a sentence of the card ends in a click too.
    if (hasTextSelectionIn(card)) return

    if (board.selectable) {
      if (e.metaKey || e.ctrlKey) return board.toggle(id)
      if (e.shiftKey) return board.extendTo(id, columnIds)
      // On a phone a selection is made one tap at a time, the way a photo
      // gallery does it: there is no Ctrl to hold.
      if (hasSelection && pointerType.current === "touch") return board.toggle(id)
    }

    open(card)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys pressed in a control of the card are that control's.
    if (e.target !== e.currentTarget) return
    if (e.key === "Enter") {
      e.preventDefault()
      open(e.currentTarget)
    } else if (e.key === " " && board.selectable) {
      e.preventDefault()
      if (e.shiftKey) board.extendTo(id, columnIds)
      else board.toggle(id)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerType.current = e.pointerType
    if (e.pointerType !== "touch" || !board.selectable) return
    if (isCardControlTarget(e.target, e.currentTarget)) return
    cancelLongPress()
    pressStart.current = { x: e.clientX, y: e.clientY }
    longPress.current = setTimeout(() => {
      longPress.current = null
      swallowNextClick.current = true
      board.toggle(id)
      navigator.vibrate?.(10)
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pressStart.current
    if (!start) return
    // A finger that moves is scrolling the column, not holding the card.
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) cancelLongPress()
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    cancelLongPress()
    const ids = board.startDrag(id)
    // Kept for what reads the drag from outside the board; the board itself
    // reads the cards it carries from its own state.
    e.dataTransfer.setData("text", id)
    e.dataTransfer.effectAllowed = "move"
    if (ids.length > 1) setGroupDragImage(e.dataTransfer, ids.length)
  }

  return (
    <div
      data-record-card={id}
      // Dropped in another column, a card updates its record.
      draggable={canMove && row.pending !== "create"}
      tabIndex={0}
      role="group"
      aria-label={title}
      aria-keyshortcuts={canOpen ? "Enter" : undefined}
      className={cn(
        "group/card relative rounded-2xl outline-none select-text",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        canOpen ? "cursor-pointer" : "cursor-grab",
        "active:cursor-grabbing",
        isDragged && "opacity-50",
        row.pending === "create" && "pointer-events-none"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // Shift+click selects a range of cards, not a range of text.
      onMouseDown={(e) => {
        if (e.shiftKey && !isCardControlTarget(e.target, e.currentTarget)) {
          e.preventDefault()
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        // The long press is the board's; the phone's own menu would open on
        // top of it.
        if (pointerType.current === "touch" && board.selectable) e.preventDefault()
      }}
      onDragStart={handleDragStart}
      onDragEnd={board.endDrag}
    >
      {/* `row`, not `{ data: row }`: wrapping it a second time handed
          the row component an object whose every field was undefined,
          which is why these columns drew blank cards. */}
      <RecordCard
        row={row}
        className={cn(
          "bg-card",
          board.selectable && "pr-10",
          canOpen &&
            "group-hover/card:border-foreground/30 group-hover/card:shadow-sm",
          isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
        )}
      />

      {board.selectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => board.toggle(id)}
          aria-label={translate("Select {{title}}", { title })}
          className={cn(
            "absolute top-4 right-4 bg-background transition-opacity",
            // Out of the way until it is wanted: under the pointer, on the
            // card holding the focus, or as soon as anything is selected.
            hasSelection
              ? "opacity-100"
              : "opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100"
          )}
        />
      )}
    </div>
  )
}

/**
 * What follows the pointer when several cards are carried: one card reading
 * "3 cards", rather than the picture of the one picked up. Styled inline — it
 * is drawn outside the board, for the one frame the browser takes a picture of.
 */
function setGroupDragImage(dataTransfer: DataTransfer, count: number) {
  if (typeof dataTransfer.setDragImage !== "function") return
  const preview = document.createElement("div")
  preview.textContent = translate("{{count}} cards", { count: String(count) })
  Object.assign(preview.style, {
    position: "fixed",
    top: "-1000px",
    left: "-1000px",
    padding: "8px 14px",
    borderRadius: "12px",
    background: "var(--color-primary, #111)",
    color: "var(--color-primary-foreground, #fff)",
    font: "500 13px system-ui, sans-serif",
    boxShadow: "0 6px 20px rgb(0 0 0 / 0.2)",
  })
  document.body.appendChild(preview)
  dataTransfer.setDragImage(preview, 16, 16)
  setTimeout(() => preview.remove(), 0)
}

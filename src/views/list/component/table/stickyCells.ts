// A pinned cell must hide what scrolls under it, so its background is opaque —
// and it has to be the table's own: the card (`bg-card`), not the page. The row's
// hover and selection are translucent tints on that card, so the cell mixes the
// same tint into the card colour to follow them without letting the content show.
const HOVER = "group-hover/row:bg-[color-mix(in_oklab,var(--card),var(--muted)_50%)]"
const SELECTED =
  "group-data-[selected]/row:bg-[color-mix(in_oklab,var(--card),var(--primary)_10%)]"
const FOLLOW_ROW = `bg-card transition-colors ${HOVER} ${SELECTED}`

// The separating shadow is drawn only while there is something to separate:
// `ScrollHint` flags which side of the table has more to scroll.
const SHADOW_RIGHT =
  "group-data-[scroll-right=true]/hint:shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.25)]"
const SHADOW_LEFT =
  "group-data-[scroll-left=true]/hint:shadow-[8px_0_8px_-8px_rgba(0,0,0,0.25)]"

/** Classes of a cell pinned to the right edge: opaque, the card's colour, a shadow on its left while the table scrolls. */
export const STICKY_ACTIONS_CELL = `sticky right-0 z-10 ${FOLLOW_ROW} ${SHADOW_RIGHT}`

/** Classes of a cell pinned to the left edge. */
export const STICKY_FIRST_CELL = `sticky left-0 z-10 ${FOLLOW_ROW} ${SHADOW_LEFT}`

/** The same, set on a row for the first data cell (after the checkbox, if any). */
export const stickyFirstCellOfRow = (selectable: boolean) => {
  const td = selectable ? "[&>td:nth-child(2)]" : "[&>td:nth-child(1)]"
  return `sticky left-0 z-10 ${FOLLOW_ROW} ${SHADOW_LEFT}`
    .split(" ")
    .map((c) => `${td}:${c}`)
    .join(" ")
}

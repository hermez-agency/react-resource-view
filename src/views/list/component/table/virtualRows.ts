import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react"
import {
  elementScroll,
  measureElement,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  useVirtualizer,
  windowScroll,
  type Virtualizer,
} from "@tanstack/react-virtual"
import type { TableLayoutOptions } from "@/layout/layout"

/** The rows a page must exceed before the table draws only those on screen. */
export const VIRTUALIZE_THRESHOLD = 200
/** The rows drawn beyond each edge of the screen. */
export const VIRTUALIZE_OVERSCAN = 8

/** Whether a table of `count` rows draws only those on screen, and how many more. */
export function resolveVirtualize(
  option: TableLayoutOptions["virtualize"],
  count: number
): { enabled: boolean; overscan: number } {
  if (option === false) return { enabled: false, overscan: VIRTUALIZE_OVERSCAN }
  if (option === true) return { enabled: true, overscan: VIRTUALIZE_OVERSCAN }
  const threshold = option?.threshold ?? VIRTUALIZE_THRESHOLD
  return {
    enabled: count > threshold,
    overscan: option?.overscan ?? VIRTUALIZE_OVERSCAN,
  }
}

type Scroller = Element | Window

const isWindow = (scroller: Scroller | null): scroller is Window =>
  !!scroller && "scrollY" in scroller

/**
 * What the rows scroll in: the nearest ancestor that scrolls vertically and
 * has something to scroll, or the page. An `overflow-x: auto` container — the
 * table's own — computes `overflow-y: auto` too without ever scrolling down, so
 * a box counts only once its content overflows it: the spacers make it do so.
 */
export function findScroller(element: Element): Scroller {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break
    const { overflowY } = getComputedStyle(node)
    if (!/(auto|scroll|overlay)/.test(overflowY)) continue
    if (node.scrollHeight > node.clientHeight + 1) return node
  }
  return window
}

/** Where `body` starts in the content of `scroller`: the virtualizer's `scrollMargin`. */
function offsetIn(body: Element, scroller: Scroller): number {
  const top = body.getBoundingClientRect().top
  if (isWindow(scroller)) return top + scroller.scrollY
  return (
    top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    scroller.clientTop
  )
}

/**
 * What a row drawn by the virtualizer is told: its place among the rows, for
 * the virtualizer to measure it and for a screen reader to count it.
 */
export interface VirtualRowProps {
  "data-index": number
  "aria-rowindex": number
  ref: (node: HTMLTableRowElement | null) => void
}

/** Set around each row the table draws: undefined when every row is drawn. */
export const VirtualRowContext = createContext<VirtualRowProps | undefined>(
  undefined
)

/** The attributes the row component spreads on its `<tr>`. */
export function useVirtualRowProps(): Partial<VirtualRowProps> {
  return use(VirtualRowContext) ?? {}
}

/**
 * The rows of a `<tbody>` to draw, as a window over `count` rows that follows
 * the page's — or the nearest scrolling box's — scroll position. The rows are
 * measured once drawn, so rows of any height (a group header, a view opened
 * inline) scroll right; before that, `estimateSize` stands for them.
 */
export function useTableVirtualizer({
  bodyRef,
  count,
  enabled,
  overscan,
  estimateSize,
  getItemKey,
}: {
  bodyRef: RefObject<HTMLTableSectionElement | null>
  count: number
  enabled: boolean
  overscan: number
  estimateSize: (index: number) => number
  getItemKey: (index: number) => string
}): Virtualizer<Element, HTMLTableRowElement> {
  const [scroller, setScroller] = useState<Scroller | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const marginRef = useRef(0)

  const virtualizer = useVirtualizer<Element, HTMLTableRowElement>({
    count,
    enabled: enabled && !!scroller,
    overscan,
    estimateSize,
    getItemKey,
    scrollMargin,
    // The window is handled as a scrolling box: which one it is is only known
    // once the table is in the page.
    getScrollElement: () => scroller as Element | null,
    observeElementRect: (instance, cb) =>
      isWindow(instance.scrollElement)
        ? observeWindowRect(instance as never, cb)
        : observeElementRect(instance, cb),
    observeElementOffset: (instance, cb) =>
      isWindow(instance.scrollElement)
        ? observeWindowOffset(instance as never, cb)
        : observeElementOffset(instance, cb),
    scrollToFn: (offset, options, instance) =>
      isWindow(instance.scrollElement)
        ? windowScroll(offset, options, instance as never)
        : elementScroll(offset, options, instance),
    // A row not laid out — or jsdom — measures 0: the estimate is closer.
    measureElement: (element, entry, instance) =>
      measureElement(element, entry, instance) ||
      estimateSize(instance.indexFromElement(element)),
  })

  // Found once the spacers give the scrolling box something to scroll.
  useLayoutEffect(() => {
    if (!enabled) return setScroller(null)
    if (bodyRef.current) setScroller(findScroller(bodyRef.current))
  }, [enabled, bodyRef])

  // What is above the table — the toolbar, a filter panel opening — moves its
  // rows down the scrolling box: their offsets follow.
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!enabled || !scroller || !body) return
    const update = () => {
      const margin = Math.round(offsetIn(body, scroller))
      if (margin === marginRef.current) return
      marginRef.current = margin
      setScrollMargin(margin)
    }
    update()
    const content = isWindow(scroller)
      ? document.body
      : (scroller.firstElementChild ?? scroller)
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update)
    observer?.observe(content)
    window.addEventListener("resize", update)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [enabled, scroller, bodyRef])

  return virtualizer
}

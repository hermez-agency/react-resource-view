import { FC, ReactNode } from "react"
import { lazyComponent } from "@/internal/lazyComponent"
import type { BuiltInFrameProps } from "@/open/frames"

/**
 * Where a view is drawn when it is opened from another — `views.<action>.open`:
 *
 * ```ts
 * import { open } from "react-resource-view"
 *
 * const accordion = open.custom({
 *   type: "accordion",
 *   placement: "inline",
 *   component: ({ title, children, close }) => (
 *     <Collapsible open onOpenChange={close}>
 *       <h3>{title}</h3>
 *       {children}
 *     </Collapsible>
 *   ),
 * })
 *
 * views: { read: { open: accordion } } // or "page", "dialog", "drawer"
 * ```
 *
 * Whatever the frame, the view is written into the URL — under the view it
 * was opened from, `…/tasks/list/tasks/read/12` — so a link, the browser's
 * Back and a reload all find it where it was. The frame only draws: the URL,
 * closing after a save and the focus stay the library's.
 */

/**
 * Where a frame sits:
 * - `page` — the view replaces the page; there is no frame;
 * - `overlay` — over the page it was opened from;
 * - `inline` — in the list it was opened from, under the record's row. A
 *   layout that cannot draw anything under a row falls back to a dialog.
 */
export type OpenPlacement = "page" | "overlay" | "inline"

/** What a frame's component receives. */
export interface OpenFrameProps {
  /** The view's title — the frame's name for assistive technology. */
  title: ReactNode
  /** The view itself, built by the library. */
  children: ReactNode
  /** Closes the frame: back to the URL of the view it was opened from. */
  close: () => void
  /**
   * The same view on its own page, when the view is `expandable` and shows a
   * record.
   */
  expandHref?: string
}

/** A frame, as `open.custom()` builds it. */
export interface OpenFrame {
  readonly type: string
  readonly placement: OpenPlacement
  /** Draws the frame. A frame with `placement: "page"` has none. */
  readonly component?: FC<OpenFrameProps>
}

/** The names of the library's own frames. */
export type BuiltInOpen = "page" | "dialog" | "drawer"

/**
 * The frames registered by name with `configureResourceView({ open })`, for
 * the type checker — so `open: "acordion"` stays a typo it reports:
 *
 * ```ts
 * declare module "react-resource-view" {
 *   interface OpenFrames {
 *     accordion: true
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OpenFrames {}

/**
 * Where a view is drawn when its button — a row's, a card's, a link built by
 * the library — opens it: one of the library's frames, the name of a frame
 * given to `configureResourceView({ open })`, or a frame of one's own.
 */
export type OpenMode = BuiltInOpen | Extract<keyof OpenFrames, string> | OpenFrame

// Loaded when a view is first opened in one, not when a resource is declared.
const DialogFrame = /* @__PURE__ */ lazyComponent<BuiltInFrameProps>(() =>
  import("@/open/frames").then((m) => m.DialogFrame)
)
const DrawerFrame = /* @__PURE__ */ lazyComponent<BuiltInFrameProps>(() =>
  import("@/open/frames").then((m) => m.DrawerFrame)
)

export const BUILT_IN_OPEN: Record<BuiltInOpen, OpenFrame> = {
  page: { type: "page", placement: "page" },
  dialog: { type: "dialog", placement: "overlay", component: DialogFrame },
  drawer: { type: "drawer", placement: "overlay", component: DrawerFrame },
}

/** What `open.custom` takes. */
export interface CustomOpenOptions {
  /** The frame's name: what it is registered under and reported as. */
  type: string
  /** Where it sits. Defaults to `"overlay"`. */
  placement?: Exclude<OpenPlacement, "page">
  component: FC<OpenFrameProps>
}

/**
 * A frame of one's own — an accordion under the row, a popover, a full screen.
 * Use it as `views.<action>.open`, or register it once with
 * `configureResourceView({ open: { accordion } })` to write `open: "accordion"`.
 */
function custom({ type, placement, component }: CustomOpenOptions): OpenFrame {
  return { type, placement: placement ?? "overlay", component }
}

export const open = { custom }

/**
 * The frame a view is opened in, out of what was declared. A name nobody
 * registered is kept as an overlay without a component — drawn as a dialog,
 * with a warning in development, see `frameComponent`.
 */
export function resolveOpen(
  value: OpenMode | undefined,
  registered: Record<string, OpenFrame> | undefined,
  fallback: BuiltInOpen
): OpenFrame {
  if (value === undefined) return BUILT_IN_OPEN[fallback]
  if (typeof value === "object") return value
  if (value in BUILT_IN_OPEN) return BUILT_IN_OPEN[value as BuiltInOpen]

  return registered?.[value] ?? { type: value, placement: "overlay" }
}

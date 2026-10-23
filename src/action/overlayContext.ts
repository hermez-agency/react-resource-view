import { createContext, use } from "react"

/**
 * The dialog or the drawer a view is drawn in, for a view that has reason to
 * close it itself — the deletion, which has nothing left to show once the row
 * is gone and does not wait for the API to say so.
 */
export interface OverlayInterface {
  close: () => void
}

export const OverlayContext = /* @__PURE__ */ createContext<OverlayInterface | null>(
  null
)

/** The dialog or the drawer around the view, if it is drawn in one. */
export function useOverlay(): OverlayInterface | null {
  return use(OverlayContext)
}

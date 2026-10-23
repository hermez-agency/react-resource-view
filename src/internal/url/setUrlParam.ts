import { isBrowser } from "@/internal/browser/isBrowser"

/** Writes a query parameter into the URL, or removes it given `null`. */
export function setUrlParam(paramKey: string, paramValue: string | null): void {
  if (!isBrowser()) return

  const url = new URL(window.location.href)
  const prevScroll = { x: window.scrollX, y: window.scrollY }

  if (paramValue === null) url.searchParams.delete(paramKey)
  else url.searchParams.set(paramKey, paramValue)
  window.history.replaceState({}, "", url.toString())

  // Restore the scroll position on the browser's next paint, which helps when
  // asynchronous work follows the URL change.
  window.requestAnimationFrame(() => {
    window.scrollTo(prevScroll.x, prevScroll.y)
  })
}

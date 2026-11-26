import type { ComponentType } from "react"
import { layout } from "react-resource-view"

/**
 * The options the site passes to `layout.feed()`, spelled here rather than
 * imported: the site installs the library from npm, and the version it runs on
 * may predate the layout and its types.
 */
export interface FeedLayoutOptions {
  dateField?: string
  titleField?: string
  descriptionField?: string
  actorField?: string
  avatarField?: string
  typeField?: string
  types?: Record<string, { icon?: ComponentType<any>; color?: string }>
  order?: "asc" | "desc"
}

type AnyLayout = ReturnType<typeof layout.table>

const feed = (
  layout as unknown as { feed?: (options: FeedLayoutOptions) => AnyLayout }
).feed

/**
 * Whether the installed `react-resource-view` ships `layout.feed()` — true
 * from 2.3.0, and always when the site runs on the working tree
 * (`RRV_SOURCE=src|dist`).
 */
export const hasFeedLayout = typeof feed === "function"

/**
 * `layout.feed(options)` as a list of zero or one layout, to spread into
 * `layouts`. On a published version without it, the resource keeps its other
 * layouts instead of failing to declare — the site follows the version npm
 * serves, and the feed appears with the release that brings it.
 */
export function feedLayout(options: FeedLayoutOptions): AnyLayout[] {
  return feed ? [feed(options)] : []
}

import type { FC } from "react"
import type { JsonLdIri } from "jsonld-item"
import type { ResourceDefinition } from "@/ResourceDefinition"
import type { ViewResource } from "@/ViewResource"
import { createViewResource } from "@/utils/createViewResource"

/** What a page is made of: a name, an icon and the component it draws. */
export interface PageDefinition extends Pick<
  ResourceDefinition,
  "name" | "icon" | "alias" | "fullWidth"
> {
  /** The screen the page draws, in place of the list. */
  component: FC
  /** Shown under the title of the page. */
  description?: ResourceDefinition["description"]
}

/**
 * Declares a page without data — a home, a help, a dashboard, a settings
 * screen: a menu entry and a route to a component, nothing to list, create,
 * edit or delete, and no request to the API.
 *
 * ```ts
 * export const help = createPage("help", {
 *   name: "Help",
 *   icon: CircleHelp,
 *   component: HelpScreen,
 * })
 * ```
 *
 * The page is reached like the list of a resource (`createItemMenuWithResource`,
 * `generateLink` with the `list` action, or a scope's `menu: "auto"`). Its
 * `create`, `read`, `update` and `delete` routes are refused.
 */
export function createPage(
  id: JsonLdIri,
  { component, ...definition }: PageDefinition
): ViewResource {
  return createViewResource(id, {
    ...definition,
    components: { view: component },
    permissions: {
      list: true,
      read: false,
      create: false,
      update: false,
      delete: false,
      export: false,
    },
  })
}

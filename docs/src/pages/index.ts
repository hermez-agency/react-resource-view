import { ActionList } from "react-data-form"
import { createItemMenuWithResource } from "react-resource-view"
import overviewResource from "./overview"
import routingResource from "./routing"
import realtimeResource from "./realtime"
import i18nResource from "./i18n"
import navigationResource from "./navigation"
import layoutsResource from "./layouts"
import savedViewsResource from "./savedViews"
import treeMapChartResource, {
  ordersResource,
  shopsResource,
  teamsResource,
} from "./treeMapChart"
import actionsResource, { accordionArticlesResource } from "./actions"
import settingsResource, { profileSettingsResource } from "./settings"
import adminLayoutResource from "./adminLayout"
import adminLayoutDemoResource from "./adminLayoutDemo"
import demoResource, { articlesResource } from "./demo"

/** Every documentation page, in reading order. */
export const pages = [
  overviewResource,
  routingResource,
  navigationResource,
  layoutsResource,
  savedViewsResource,
  treeMapChartResource,
  actionsResource,
  realtimeResource,
  i18nResource,
  settingsResource,
  adminLayoutResource,
  adminLayoutDemoResource,
  demoResource,
]

/** The resources the site can render, pages plus those the demos show. */
export const resources = [
  ...pages,
  articlesResource,
  accordionArticlesResource,
  profileSettingsResource,
  teamsResource,
  shopsResource,
  ordersResource,
]

/**
 * The sidebar entries, built on demand.
 *
 * `createItemMenuWithResource` calls `generateLink`, which reads the routing
 * mode from the ports — so building the menu at import time, before
 * `configurePorts` runs, would freeze every link in path mode.
 */
export const getMenu = () =>
  pages.map((resource) =>
    createItemMenuWithResource({ resource, resourceAction: ActionList.read })
  )

export { overviewResource, articlesResource }

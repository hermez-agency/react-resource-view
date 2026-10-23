import { AdminLayout, type ScopeInterface } from "react-resource-view"
import { tasks } from "@/resources/tasks"
import { events } from "@/resources/events"

/**
 * The back office: its resources, its menu, and the admin layout around every
 * view. A new resource is declared under src/resources/ and added to
 * `resources` — the menu lists them.
 */
export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Starter",
  decoratorComponent: AdminLayout,
  resources: [tasks, events],
  menu: "auto",
  defaultViewResourceContextParams: {
    resourceId: tasks["@id"],
    resourceAction: "list",
  },
}

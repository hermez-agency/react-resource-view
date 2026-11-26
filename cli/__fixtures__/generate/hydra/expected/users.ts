import { Database } from "lucide-react"
import { createViewResource, layout } from "react-resource-view"

/**
 * Users — written by `react-resource-view generate --hydra` from
 * /admin/users in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface AdminUser {
  "@id": string
  firstName?: string
  lastName?: string
  name?: string
}

export const users = createViewResource<AdminUser>("users", {
  name: "Users",
  icon: Database,
  path: "/admin/users",
  permissions: "readonly",
  titleField: "name",
  form: {
    inputs: {
      firstName: { label: "First name" },
      lastName: { label: "Last name" },
      name: { label: "Name" },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

import { Database } from "lucide-react"
import { EmailInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"

/**
 * Owners — written by `react-resource-view generate resources` from
 * /owners in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Owner {
  id: number
  name: string
  email?: string
}

export const owners = createViewResource<Owner>("owners", {
  name: "Owners",
  icon: Database,
  path: "/owners",
  permissions: { update: false, delete: false },
  titleField: "name",
  form: {
    inputs: {
      name: { label: "Name", required: true },
      email: { label: "Email", controller: EmailInputController },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

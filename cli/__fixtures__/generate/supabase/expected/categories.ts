import { Database } from "lucide-react"
import { createViewResource, layout } from "react-resource-view"

/**
 * Categories — written by `react-resource-view generate resources` from
 * /categories in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Category {
  id: number
  name: string
}

export const categories = createViewResource<Category>("categories", {
  name: "Categories",
  icon: Database,
  path: "/categories",
  titleField: "name",
  form: {
    inputs: {
      name: { label: "Name", required: true },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

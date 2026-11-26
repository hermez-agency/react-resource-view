import { Database } from "lucide-react"
import { createViewResource, layout } from "react-resource-view"

/**
 * Admin books — written by `react-resource-view generate --hydra` from
 * /admin/books in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface AdminBook {
  "@id": string
  book: string
  title?: string
  author?: string
  condition: string
  rating?: number
}

export const adminBooks = createViewResource<AdminBook>("admin-books", {
  name: "Admin books",
  icon: Database,
  path: "/admin/books",
  permissions: { create: false },
  titleField: "title",
  form: {
    inputs: {
      book: { label: "Book", required: true },
      condition: { label: "Condition", required: true },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

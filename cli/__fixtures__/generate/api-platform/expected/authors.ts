import { Database } from "lucide-react"
import { EmailInputController, TextAreaInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"

/**
 * Authors — written by `react-resource-view generate resources` from
 * /api/authors in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Author {
  "@id": string
  id?: number
  name: string
  email?: string
  bio?: string | null
}

export const authors = createViewResource<Author>("authors", {
  name: "Authors",
  icon: Database,
  path: "/api/authors",
  titleField: "name",
  form: {
    inputs: {
      name: { label: "Name", required: true },
      email: { label: "Email", controller: EmailInputController },
      bio: { label: "Bio", controller: TextAreaInputController },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          name: { label: "Name" },
        },
      },
      layouts: [layout.table()],
    },
  },
})

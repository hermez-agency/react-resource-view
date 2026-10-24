import { Database } from "lucide-react"
import {
  NumberInputController,
  SelectSearchInputController,
  TextAreaInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Reviews — written by `react-resource-view generate resources` from
 * /api/reviews in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Review {
  "@id": string
  id?: number
  rating?: number
  body?: string
  book?: string
}

export const reviews = createViewResource<Review>("reviews", {
  name: "Reviews",
  icon: Database,
  path: "/api/reviews",
  permissions: "readonly",
  form: {
    inputs: {
      rating: { label: "Rating", controller: NumberInputController },
      body: { label: "Body", controller: TextAreaInputController },
      book: {
        label: "Book",
        controller: SelectSearchInputController,
        onSearch: relationSearch("/api/books", {
          valueField: "@id",
          labelField: "title",
        }),
      },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

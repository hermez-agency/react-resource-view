import { Database } from "lucide-react"
import {
  NumberInputController,
  SelectSearchInputController,
  TextAreaInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Reviews — written by `react-resource-view generate --hydra` from
 * /admin/reviews in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface AdminReview {
  "@id": string
  user?: string
  book: string
  publishedAt?: string
  body: string
  rating: number
  letter?: string
}

export const reviews = createViewResource<AdminReview>("reviews", {
  name: "Reviews",
  icon: Database,
  path: "/admin/reviews",
  permissions: { create: false },
  form: {
    inputs: {
      book: {
        label: "Book",
        required: true,
        controller: SelectSearchInputController,
        onSearch: relationSearch("/admin/books", {
          valueField: "@id",
          labelField: "title",
        }),
      },
      body: { label: "Body", required: true, controller: TextAreaInputController },
      rating: { label: "Rating", required: true, controller: NumberInputController },
      letter: { label: "Letter" },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

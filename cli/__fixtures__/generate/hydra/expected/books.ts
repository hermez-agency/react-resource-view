import { Database } from "lucide-react"
import {
  MultiSelectSearchInputController,
  NumberInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Books — written by `react-resource-view generate --hydra` from
 * /books in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Book {
  "@id": string
  book: string
  title?: string
  author?: string
  condition: string
  reviews?: string[]
  rating?: number
}

export const books = createViewResource<Book>("books", {
  name: "Books",
  icon: Database,
  path: "/books",
  permissions: "readonly",
  titleField: "title",
  form: {
    inputs: {
      book: { label: "Book", required: true },
      title: { label: "Title" },
      author: { label: "Author" },
      condition: { label: "Condition", required: true },
      reviews: {
        label: "Reviews",
        controller: MultiSelectSearchInputController,
        onSearch: relationSearch("/admin/reviews", {
          valueField: "@id",
          labelField: "id",
        }),
      },
      rating: { label: "Rating", controller: NumberInputController },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

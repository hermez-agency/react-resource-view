import { Database } from "lucide-react"
import {
  DatePickerInputController,
  SelectSearchInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Bookmarks — written by `react-resource-view generate --hydra` from
 * /bookmarks in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Bookmark {
  "@id": string
  book: string
  bookmarkedAt?: string
}

export const bookmarks = createViewResource<Bookmark>("bookmarks", {
  name: "Bookmarks",
  icon: Database,
  path: "/bookmarks",
  permissions: ["list", "delete"],
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
      bookmarkedAt: { label: "Bookmarked at", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

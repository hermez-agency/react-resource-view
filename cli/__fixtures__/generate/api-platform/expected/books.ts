import { Database } from "lucide-react"
import {
  DatePickerInputController,
  MultiSelectInputController,
  NumberInputController,
  SelectInputController,
  SelectSearchInputController,
  SwitchInputController,
  TextAreaInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Books — written by `react-resource-view generate resources` from
 * /api/books in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Book {
  "@id": string
  id?: number
  title: string
  isbn?: string | null
  description?: string | null
  price?: number
  pages?: number
  inStock?: boolean
  publishedAt?: string | null
  status?: "draft" | "in_review" | "published"
  genres?: ("novel" | "essay" | "poetry")[]
  author: string
  createdAt?: string
}

const BOOK_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
]

const BOOK_GENRES = [
  { value: "novel", label: "Novel" },
  { value: "essay", label: "Essay" },
  { value: "poetry", label: "Poetry" },
]

export const books = createViewResource<Book>("books", {
  name: "Books",
  icon: Database,
  path: "/api/books",
  titleField: "title",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      isbn: { label: "Isbn" },
      description: { label: "Description", controller: TextAreaInputController },
      price: { label: "Price", controller: NumberInputController },
      pages: { label: "Pages", controller: NumberInputController },
      inStock: { label: "In stock", controller: SwitchInputController },
      publishedAt: { label: "Published at", controller: DatePickerInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: BOOK_STATUS,
      },
      genres: {
        label: "Genres",
        controller: MultiSelectInputController,
        valueOptions: BOOK_GENRES,
      },
      author: {
        label: "Author",
        required: true,
        controller: SelectSearchInputController,
        onSearch: relationSearch("/api/authors", {
          valueField: "@id",
          labelField: "name",
        }),
      },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          title: { label: "Title" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: BOOK_STATUS,
          },
        },
      },
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
    },
  },
})

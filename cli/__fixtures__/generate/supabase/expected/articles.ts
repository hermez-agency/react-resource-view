import { Database } from "lucide-react"
import {
  DatePickerInputController,
  SelectInputController,
  SelectSearchInputController,
  SwitchInputController,
  TextAreaInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { relationSearch } from "./relationSearch"

/**
 * Articles — written by `react-resource-view generate resources` from
 * /articles in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Article {
  id: number
  title: string
  body?: string
  status?: "draft" | "published" | "archived"
  category_id?: number
  published_at?: string
  featured?: boolean
}

const ARTICLE_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

export const articles = createViewResource<Article>("articles", {
  name: "Articles",
  icon: Database,
  path: "/articles",
  titleField: "title",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      body: { label: "Body", controller: TextAreaInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: ARTICLE_STATUS,
      },
      category_id: {
        label: "Category",
        controller: SelectSearchInputController,
        onSearch: relationSearch("/categories", {
          valueField: "id",
          labelField: "name",
        }),
      },
      published_at: { label: "Published at", controller: DatePickerInputController },
      featured: { label: "Featured", controller: SwitchInputController },
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
            valueOptions: ARTICLE_STATUS,
          },
        },
      },
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
    },
  },
})

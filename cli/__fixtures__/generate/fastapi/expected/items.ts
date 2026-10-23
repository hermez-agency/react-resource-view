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
 * Items — written by `react-resource-view generate resources` from
 * /items in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Item {
  id: number
  title: string
  description?: string | null
  status: "todo" | "doing" | "done"
  owner_id?: number | null
  due_date?: string | null
  done?: boolean
}

const ITEM_STATUS = [
  { value: "todo", label: "Todo" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
]

export const items = createViewResource<Item>("items", {
  name: "Items",
  icon: Database,
  path: "/items",
  titleField: "title",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      description: { label: "Description", controller: TextAreaInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: ITEM_STATUS,
      },
      owner_id: {
        label: "Owner",
        controller: SelectSearchInputController,
        onSearch: relationSearch("/owners", {
          valueField: "id",
          labelField: "name",
        }),
      },
      due_date: { label: "Due date", controller: DatePickerInputController },
      done: { label: "Done", controller: SwitchInputController },
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
            valueOptions: ITEM_STATUS,
          },
        },
      },
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
    },
  },
})

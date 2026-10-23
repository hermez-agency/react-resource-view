import { ListTodo } from "lucide-react"
import { DatePickerInputController, SelectInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { TASK_PRIORITIES, TASK_STATUSES, TASKS_ID, type Task } from "@/seed"

/**
 * One resource: the list, the detail, the create and edit forms and the
 * delete confirmation of the tasks, from this declaration alone. There is no
 * `path`: `storage: "local"` keeps the rows in the browser, filled by
 * src/seed.ts. Swap it for `path: "/api/tasks"` to talk to a real API.
 *
 * `form.inputs` are the create and edit form *and* the table's columns.
 */
export const tasks = createViewResource<Task>(TASKS_ID, {
  name: "Tasks",
  icon: ListTodo,
  storage: "local",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      assignee: { label: "Assignee" },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: TASK_STATUSES,
      },
      priority: {
        label: "Priority",
        controller: SelectInputController,
        valueOptions: TASK_PRIORITIES,
      },
      dueOn: { label: "Due on", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          title: { label: "Search" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: TASK_STATUSES,
          },
        },
      },
      // The switcher above the list: the same rows, five ways to read them.
      layouts: [
        layout.table(),
        layout.cards({ columns: 3 }),
        layout.items(),
        layout.board({ groupBy: "status", columns: TASK_STATUSES }),
        layout.split({ readInList: true }),
      ],
    },
  },
})

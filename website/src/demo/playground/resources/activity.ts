import {
  Boxes,
  CircleCheck,
  MessageSquare,
  Newspaper,
  ShoppingBag,
} from "lucide-react"
import { SelectInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import {
  ACTIVITY_ID,
  ACTIVITY_KINDS,
  type Activity,
} from "@/demo/playground/adminData"
import { feedLayout } from "@/demo/feedLayout"

/**
 * The journal of the back office: what happened, by whom, when. An event is
 * written by the application, never by hand, so nothing here creates, edits
 * or deletes one — the feed only reads.
 */
export const activityResource = createViewResource<Activity>(ACTIVITY_ID, {
  name: "Activity",
  icon: CircleCheck,
  storage: "local",
  titleField: "summary",
  permissions: { create: false, update: false, delete: false },
  description:
    "Everything that happened at the roastery this week, the latest first: orders, stock, posts, comments and tasks. Search it, or filter by kind.",
  form: {
    inputs: {
      summary: { label: "Event" },
      detail: { label: "Detail" },
      kind: {
        label: "Kind",
        controller: SelectInputController,
        valueOptions: ACTIVITY_KINDS,
      },
      actor: { label: "By" },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          summary: { label: "Search an event" },
          kind: {
            label: "Kind",
            controller: SelectInputController,
            valueOptions: ACTIVITY_KINDS,
          },
        },
      },
      layouts: [
        ...feedLayout({
          dateField: "createdAt",
          titleField: "summary",
          descriptionField: "detail",
          actorField: "actor",
          typeField: "kind",
          types: {
            order: { icon: ShoppingBag, color: "var(--color-chart-1, #2563eb)" },
            stock: { icon: Boxes, color: "var(--color-chart-4, #d97706)" },
            post: { icon: Newspaper, color: "var(--color-chart-2, #059669)" },
            comment: { icon: MessageSquare, color: "var(--color-chart-5, #7c3aed)" },
            task: { icon: CircleCheck, color: "var(--color-chart-3, #475569)" },
          },
        }),
        layout.table(),
      ],
      rowActions: ["read"],
    },
  },
})

import { CalendarDays } from "lucide-react"
import { createViewResource, layout } from "react-resource-view"
import { EVENTS_ID, type Event } from "@/seed"

/**
 * A second resource, read on a calendar and a timeline: the layouts that place
 * a row by its dates rather than by its fields.
 */
export const events = createViewResource<Event>(EVENTS_ID, {
  name: "Events",
  icon: CalendarDays,
  storage: "local",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      room: { label: "Room" },
      track: { label: "Track" },
      startAt: { label: "Starts at" },
      endAt: { label: "Ends at" },
    },
  },
  views: {
    list: {
      layouts: [
        layout.calendar({
          mode: "week",
          dateField: "startAt",
          endDateField: "endAt",
          titleField: "title",
          colorField: "track",
          hourStart: 8,
          hourEnd: 18,
        }),
        layout.timeline<Event>({
          startField: "startAt",
          endField: "endAt",
          titleField: "title",
          groupBy: "room",
          groupsLabel: "Rooms",
          daysToShow: 5,
          showUnassigned: false,
        }),
        layout.table(),
      ],
    },
  },
})

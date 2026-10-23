import { getInStorage, setInStorage } from "ssr-safe-storage"

/**
 * The rows the two resources start with.
 *
 * A resource with `storage: "local"` reads and writes the browser's
 * localStorage under its id, as a JSON-LD collection. Seeding is writing that
 * collection once: later visits find it and keep the reader's own edits. Clear
 * the site's storage (or call `reset()`) to start from these rows again.
 */

export const TASKS_ID = "tasks"
export const EVENTS_ID = "events"

export interface Task {
  "@id": string
  "@type": string
  id: string
  title: string
  assignee: string
  status: "todo" | "doing" | "done"
  priority: "low" | "medium" | "high"
  dueOn: string
}

export interface Event {
  "@id": string
  "@type": string
  id: string
  title: string
  room: string
  track: string
  startAt: string
  endAt: string
}

export const TASK_STATUSES = [
  { label: "To do", value: "todo" },
  { label: "Doing", value: "doing" },
  { label: "Done", value: "done" },
]

export const TASK_PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
]

/** The Monday of the current week, so the calendar opens on the events. */
function monday(): Date {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

function at(day: number, hour: number): string {
  const date = monday()
  date.setDate(date.getDate() + day)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

/** A calendar day, written the way the date picker writes it. */
function dayOf(offset: number): string {
  const date = monday()
  date.setDate(date.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const TASK_SEEDS: Array<Omit<Task, "@id" | "@type" | "dueOn"> & { due: number }> = [
  {
    id: "1",
    title: "Write the launch post",
    assignee: "Ada",
    status: "doing",
    priority: "high",
    due: 2,
  },
  {
    id: "2",
    title: "Review the pricing page",
    assignee: "Grace",
    status: "todo",
    priority: "medium",
    due: 3,
  },
  {
    id: "3",
    title: "Fix the signup redirect",
    assignee: "Alan",
    status: "todo",
    priority: "high",
    due: 1,
  },
  {
    id: "4",
    title: "Record the product demo",
    assignee: "Barbara",
    status: "todo",
    priority: "low",
    due: 8,
  },
  {
    id: "5",
    title: "Migrate the billing webhooks",
    assignee: "Alan",
    status: "doing",
    priority: "high",
    due: 4,
  },
  {
    id: "6",
    title: "Update the onboarding emails",
    assignee: "Ada",
    status: "done",
    priority: "medium",
    due: 0,
  },
  {
    id: "7",
    title: "Archive last quarter's reports",
    assignee: "Grace",
    status: "done",
    priority: "low",
    due: -3,
  },
  {
    id: "8",
    title: "Plan the next release",
    assignee: "Barbara",
    status: "doing",
    priority: "medium",
    due: 5,
  },
]

const EVENT_SEEDS: Array<
  Omit<Event, "@id" | "@type" | "startAt" | "endAt"> & {
    day: number
    from: number
    to: number
  }
> = [
  {
    id: "1",
    title: "Kick-off",
    room: "Main hall",
    track: "Team",
    day: 0,
    from: 9,
    to: 10,
  },
  {
    id: "2",
    title: "Design review",
    room: "Room B",
    track: "Product",
    day: 0,
    from: 14,
    to: 15,
  },
  {
    id: "3",
    title: "Sprint planning",
    room: "Main hall",
    track: "Team",
    day: 1,
    from: 10,
    to: 12,
  },
  {
    id: "4",
    title: "Customer call",
    room: "Room B",
    track: "Sales",
    day: 2,
    from: 11,
    to: 12,
  },
  {
    id: "5",
    title: "Workshop: the API",
    room: "Workshop",
    track: "Product",
    day: 2,
    from: 14,
    to: 17,
  },
  {
    id: "6",
    title: "Demo day",
    room: "Main hall",
    track: "Team",
    day: 3,
    from: 15,
    to: 16,
  },
  {
    id: "7",
    title: "Retrospective",
    room: "Workshop",
    track: "Team",
    day: 4,
    from: 13,
    to: 14,
  },
]

function collection<T>(id: string, member: T[]) {
  return { "@id": id, "@type": "Collection", member, totalItems: member.length }
}

function tasks(): Task[] {
  return TASK_SEEDS.map(({ due, ...task }) => ({
    ...task,
    "@id": `/${TASKS_ID}/${task.id}`,
    "@type": TASKS_ID,
    dueOn: dayOf(due),
  }))
}

function events(): Event[] {
  return EVENT_SEEDS.map(({ day, from, to, ...event }) => ({
    ...event,
    "@id": `/${EVENTS_ID}/${event.id}`,
    "@type": EVENTS_ID,
    startAt: at(day, from),
    endAt: at(day, to),
  }))
}

/** Writes the rows of each resource that has none yet. */
export function seed(): void {
  if (!getInStorage(TASKS_ID)) {
    setInStorage(TASKS_ID, collection(TASKS_ID, tasks()))
  }
  if (!getInStorage(EVENTS_ID)) {
    setInStorage(EVENTS_ID, collection(EVENTS_ID, events()))
  }
}

/** Puts the seed rows back, discarding what was created, edited or deleted. */
export function reset(): void {
  setInStorage(TASKS_ID, collection(TASKS_ID, tasks()))
  setInStorage(EVENTS_ID, collection(EVENTS_ID, events()))
}

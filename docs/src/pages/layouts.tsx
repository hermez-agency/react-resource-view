import { ActionList } from "react-data-form"
import {
  createViewResource,
  layout,
  ViewResourceContextProvider,
} from "react-resource-view"
import { Columns3, MessageSquare, Rocket } from "lucide-react"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

interface FeedEvent {
  "@id": string
  "@type": string
  id: string
  summary: string
  detail?: string
  actor: string
  kind: "deploy" | "comment"
  createdAt: string
}

/** Events counted back from today, so the feed always opens on "Today". */
const feedEvent = (
  id: number,
  daysAgo: number,
  hour: number,
  kind: FeedEvent["kind"],
  summary: string,
  actor: string,
  detail?: string
): FeedEvent => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return {
    "@id": `/api/feed_events/${id}`,
    "@type": "FeedEvent",
    id: String(id),
    summary,
    detail,
    actor,
    kind,
    createdAt: date.toISOString(),
  }
}

const FEED_EVENTS: FeedEvent[] = [
  feedEvent(1, 0, 10, "deploy", "Released 2.3.0", "Ada", "Adds the feed layout"),
  feedEvent(2, 0, 9, "comment", "Commented on « Group by day »", "Grace"),
  feedEvent(3, 1, 16, "deploy", "Released 2.2.1", "Ada"),
  feedEvent(
    4,
    3,
    11,
    "comment",
    "Commented on « Relative time »",
    "Alan",
    "Looks right"
  ),
]

export const feedResource = createViewResource<FeedEvent>("demo_feed_events", {
  name: "Activity",
  storage: { type: "local", seed: FEED_EVENTS },
  titleField: "summary",
  form: {
    inputs: {
      summary: { label: "Event" },
      detail: { label: "Detail" },
      actor: { label: "By" },
    },
  },
  views: {
    list: {
      layouts: [
        layout.feed({
          descriptionField: "detail",
          actorField: "actor",
          typeField: "kind",
          types: {
            deploy: { icon: Rocket, color: "#2563eb" },
            comment: { icon: MessageSquare },
          },
        }),
        layout.table(),
      ],
      rowActions: ["read"],
    },
  },
})

const layouts: [string, string][] = [
  ["layout.table()", "Data table, editable in place"],
  ["layout.cards({ columns })", "Card grid"],
  ["layout.gallery({ imageField })", "Cards with a cover picture"],
  ["layout.board({ groupBy })", "Kanban board, one column per value"],
  ["layout.split()", "List on the left, details on the right"],
  ["layout.calendar({ dateField })", "Calendar, by day, week or month"],
  ["layout.timeline({ startField, endField })", "Timeline, grouped by row"],
  ["layout.items()", "Plain item list"],
  [
    "layout.tree({ parentField })",
    "Records under their parent, folded and unfolded",
  ],
  ["layout.map({ latitudeField, longitudeField })", "A marker per record on a map"],
  ["layout.chart({ groupBy | dateField })", "Figures and a chart over the records"],
  ["layout.feed({ dateField })", "A journal: dated events by day, newest first"],
  ["layout.custom({ type, components })", "A layout of your own"],
]

const layoutsResource = createViewResource("layouts", {
  name: "Layouts",
  icon: Columns3,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Layouts"
          intro="A list renders through one of several layouts. Declare more than one and the reader picks — their choice is kept in the URL, under the layout's type."
        />

        <Section title="Available layouts">
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Declaration</th>
                  <th className="py-2 font-medium">Layout</th>
                </tr>
              </thead>
              <tbody>
                {layouts.map(([name, description]) => (
                  <tr key={name} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{name}</td>
                    <td className="py-2 text-muted-foreground">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CodeBlock>{variants}</CodeBlock>
          <p>
            A table, cards, items, a tree and a board can have their records
            selected; <code>layout.split()</code>, <code>layout.calendar()</code>,{" "}
            <code>layout.timeline()</code>, <code>layout.map()</code>,{" "}
            <code>layout.chart()</code> and <code>layout.feed()</code> cannot. What a
            selection is then for — <code>bulkActions</code> — is on the{" "}
            <em>Actions</em> page.
          </p>
        </Section>

        <Section
          title="layout.feed()"
          intro="A journal: the records as dated events, gathered by day under Today, Yesterday and the date, along a vertical thread."
        >
          <CodeBlock>{feed}</CodeBlock>
          <LiveExample label="layout.feed(), on an activity log">
            <ViewResourceContextProvider
              resource={feedResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
          <p>
            Each event shows its time relative to now, with the full date as its
            tooltip and for a screen reader. The title is the link opening the
            record, so Tab reaches every event. <code>order: &quot;asc&quot;</code>{" "}
            reads the oldest first; a record without a date closes the feed. It is
            not <code>layout.timeline()</code>, which draws bars over periods.
          </p>
        </Section>

        <Section
          title="The table needs a form"
          intro="It derives its columns from the form's inputs."
        >
          <p>
            A resource declaring no <code>form</code> renders a notice instead of
            rows. The form is what tells the table which fields exist, what to label
            them, and how to edit a cell in place; <code>fields</code> picks the
            columns of one layout without writing a second form.
          </p>
        </Section>

        <Section
          title="A wide table"
          intro="The row actions stay pinned to the right edge, whatever the table's width."
        >
          <p>
            The actions column and its header are sticky, opaque and shadowed while
            columns scroll beneath them; a fade on the edges tells that columns are
            hidden. <code>stickyActions: false</code> turns it off,
            <code>stickyFirstColumn: true</code> pins the first column too.
          </p>
          <CodeBlock>{wideTable}</CodeBlock>
        </Section>

        <Section
          title="Columns chosen by the reader"
          intro="A Properties menu above the table shows, hides and reorders its columns, as in Notion."
        >
          <p>
            Each column has a box to show or hide it and a handle to drag it
            elsewhere — Alt + ↑ / ↓ from the keyboard. The choice is kept in the
            browser's <code>localStorage</code>, per resource and per layout; the
            declaration stays the default, and <em>Reset to default</em> brings it
            back. A field added to the form later shows up where it is declared.
          </p>
        </Section>

        <Section
          title="Grouping"
          intro="layout.table({ groupBy }) and layout.cards({ groupBy }) section the rows by a field, as Notion's Group by."
        >
          <CodeBlock>{grouped}</CodeBlock>
          <p>
            One foldable section per value, headed by its label and a count; each
            header is a button with <code>aria-expanded</code>. The labels and the
            order are those of the <code>options</code> of the form's input of that
            name, and the records with no value come last under <em>No value</em>.
            The Properties menu of a table offers <em>Group by</em> among its select
            fields, kept like the columns. Only the page on screen is grouped, and a
            note says so when the API holds more.
          </p>
        </Section>

        <Section
          title="Thousands of rows"
          intro="Past 200 rows, the table draws only those on screen, so a long page opens and scrolls as fast as a short one."
        >
          <CodeBlock>{virtualized}</CodeBlock>
          <p>
            The table stays a <code>&lt;table&gt;</code>: the rows off screen are two
            spacer rows of their measured height, the header and the pinned cells are
            untouched, and the columns keep the widest width they have had while
            scrolling. Groups, folded or not, and the views opened inline under a row
            scroll as one list. <em>Select all</em> and the bulk actions take every
            record of the page, drawn or not; ↑ / ↓ move from row to row and
            Ctrl+Home / Ctrl+End to the first or last one, scrolling to it. The table
            carries <code>aria-rowcount</code> and each row its{" "}
            <code>aria-rowindex</code>. <code>virtualize: true</code> always draws
            only the rows on screen, <code>virtualize: false</code> never.
          </p>
        </Section>

        <Section
          title="Cards that draw their own card"
          intro="frame: false draws components.row on its own, without the border, the padding or the actions of the grid."
        >
          <CodeBlock>{ownCards}</CodeBlock>
          <p>
            Without a frame, the row's actions are left out too: a row drawing its
            own card has its own buttons. <code>actions</code> says otherwise, in a
            frame or out of one. Selecting the records still works — the checkbox
            sits on the row's corner.
          </p>
        </Section>

        <Section
          title="Filters"
          intro="filters.inputs declares the filter form; filters.initial the filters applied as long as the URL carries none of its own."
        >
          <CodeBlock>{filters}</CodeBlock>
          <p>
            The distinction matters. A <code>defaultValue</code> on a filter input
            would not do the same job: the first request goes out before the form
            exists, so the list would show something other than what the filters
            display.
          </p>
        </Section>
      </>
    ),
  },
})

const variants = `import { layout } from "react-resource-view"

views: {
  list: {
    layouts: [
      layout.table({ fields: ["title", "author", "published"] }),
      layout.cards({ columns: 3 }),
    ],
  },
}`

const feed = `layout.feed<Event>({
  dateField: "createdAt",      // the default
  titleField: "summary",
  descriptionField: "detail",  // the line under the title
  actorField: "actor",         // a name, or an object holding one
  avatarField: "avatar",       // initials without one
  typeField: "kind",
  types: { deploy: { icon: Rocket, color: "#2563eb" } },
  order: "desc",               // the most recent first
})`

const ownCards = `layout.cards({
  frame: false, // no border, no padding, no actions
  actions: true, // the actions after all, under the row
  components: { row: TaskCard },
})`

const wideTable = `views: {
  list: {
    layouts: [
      layout.table({ stickyFirstColumn: true }), // stickyActions: true by default
    ],
    rowActions: ["read", "update", "delete"],
  },
}`

const virtualized = `layout.table() // past 200 rows, only those on screen are drawn
layout.table({ virtualize: false }) // every row, always
layout.table({ virtualize: { threshold: 500, overscan: 4 } })`

const grouped = `form: { inputs: { status: { type: "select", options: STATUSES } } },
views: {
  list: {
    layouts: [
      layout.table({ groupBy: "status" }),
      layout.cards({ groupBy: "status" }),
    ],
  },
}`

const filters = `views: {
  list: {
    filters: {
      inputs: { published: { label: "Published" } },
      initial: { published: true },
    },
  },
}`

export default layoutsResource

import { createViewResource } from "react-resource-view"
import { Columns3 } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"

const layouts: [string, string][] = [
  ["layout.table()", "Data table, editable in place"],
  ["layout.cards({ columns })", "Card grid"],
  ["layout.board({ groupBy, columns })", "Kanban board, one column per value"],
  ["layout.split()", "List on the left, details on the right"],
  ["layout.calendar({ dateField })", "Calendar, by day, week or month"],
  ["layout.timeline({ startField, endField })", "Timeline, grouped by row"],
  ["layout.items()", "Plain item list"],
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
            A table, cards, items and a board can have their records selected;{" "}
            <code>layout.split()</code>, <code>layout.calendar()</code> and{" "}
            <code>layout.timeline()</code> cannot. What a selection is then for —{" "}
            <code>bulkActions</code> — is on the <em>Actions</em> page.
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

const wideTable = `views: {
  list: {
    layouts: [
      layout.table({ stickyFirstColumn: true }), // stickyActions: true by default
    ],
    rowActions: ["read", "update", "delete"],
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

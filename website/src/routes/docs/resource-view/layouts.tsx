import { createFileRoute } from "@tanstack/react-router"
import {
  CalendarDays,
  CalendarRange,
  Columns2,
  Columns3,
  List,
  Rows2,
  Table,
} from "lucide-react"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { ResourceDemo } from "@/components/ResourceDemo"
import { A, C, H2, Li, P, Term, Ul } from "@/components/prose"
import { articlesResource } from "@/demo/resources"

export const Route = createFileRoute("/docs/resource-view/layouts")({
  head: () => ({
    meta: [
      { title: "Choosing a layout — react-resource-view" },
      {
        name: "description",
        content:
          "Seven layouts over one collection, from one `layout` namespace. Declare several, and the reader picks — the choice travels in the URL.",
      },
    ],
  }),
  component: Layouts,
})

const VARIANTS = `import { layout } from "react-resource-view"

form: articleForm,
views: {
  list: {
    layouts: [
      layout.table(), // the default: the first one listed
      layout.cards({ columns: 3 }),
      layout.split({ readInList: true }),
    ],
  },
}`

const IDENTITY = `// A layout is identified by its type — in the URL, ?variant=table.
layout.table() // id: "table"
layout.cards() // id: "cards"

// The label changes what the switcher shows, not the id: still "board".
layout.board({ label: "Kanban", groupBy: "status", columns: STATUSES })

// The same type twice needs an id of its own.
layout.table({ id: "compact", label: "Compact", fields: ["title"] })`

const CUSTOM = `import { layout } from "react-resource-view"

// A built-in layout is a preset. Nothing stops you writing your own.
export const heatmapLayout = (options = {}) =>
  layout.custom({
    type: "heatmap",
    icon: Flame,
    components: {
      list: MyHeatmap, // receives { rows }
      row: MyHeatCell, // receives { row }
      item: MyHeatValue, // receives { formInput }
    },
    ...options,
  })`

const SCAFFOLD = `npx react-resource-view create-view-variant Heatmap --dir src/views`

const HEADER = `createViewResource("articles", {
  name: "Articles",         // the heading: "Articles"
  icon: Newspaper,          // the badge, and the same mark the menu uses
  description: "Everything published, and everything on its way there.",
  views: {
    list: { layouts: [layout.table(), layout.cards()] },
  },
})`

const LAYOUTS = [
  {
    icon: Table,
    factory: "layout.table()",
    title: "Table",
    body: "One column per field of the resource's form, editable in place. The default for anything with more than three fields worth comparing.",
  },
  {
    icon: Rows2,
    factory: "layout.cards()",
    title: "Cards",
    body: (
      <>
        A grid of cards, <C>columns</C> per row. Right when a record has a title and
        a couple of attributes.
      </>
    ),
  },
  {
    icon: List,
    factory: "layout.items()",
    title: "Item list",
    body: "A plain vertical list. The lightest of the seven, and the one that survives a narrow column.",
  },
  {
    icon: Columns3,
    factory: "layout.board()",
    title: "Board",
    body: (
      <>
        A board grouped by a field — a kanban. Needs <C>groupBy</C> and{" "}
        <C>columns</C>.
      </>
    ),
  },
  {
    icon: Columns2,
    factory: "layout.split()",
    title: "Split",
    body: "The list on the left, the selected item on the right. Replaces the separate detail page.",
  },
  {
    icon: CalendarDays,
    factory: "layout.calendar()",
    title: "Calendar",
    body: (
      <>
        By day, week or month, from a date field. <C>dateField</C> says which.
      </>
    ),
  },
  {
    icon: CalendarRange,
    factory: "layout.timeline()",
    title: "Timeline",
    body: "A Gantt-like band per row, grouped by a field — rooms, staff, vehicles.",
  },
]

function Layouts() {
  return (
    <DocArticle
      toc={[
        { id: "seven", title: "The seven layouts" },
        { id: "declaring", title: "Declaring several" },
        { id: "header", title: "The header of a list" },
        { id: "identity", title: "How a layout is identified" },
        { id: "shared", title: "What every layout shares" },
        { id: "custom", title: "Writing your own" },
      ]}
    >
      <P>
        A collection is not one screen. The same articles are a table when you are
        comparing them, a board when you are moving them along, and a calendar when
        you are scheduling them. All three are the same{" "}
        <Term id="resource">resource</Term> with a different <C>components.list</C>.
      </P>

      <H2 id="seven">The seven layouts</H2>

      <div className="not-prose my-6 grid gap-3 sm:grid-cols-2">
        {LAYOUTS.map(({ icon: Icon, factory, title, body }) => (
          <article
            key={factory}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-view-soft text-view">
                <Icon className="size-4" />
              </span>
              <h3 className="font-medium">{title}</h3>
            </div>
            <code className="mt-3 block font-mono text-[11px] text-view">
              {factory}
            </code>
            <div className="prose-docs mt-2 text-sm leading-relaxed text-muted-foreground">
              {body}
            </div>
          </article>
        ))}
      </div>

      <P>
        Beyond these seven, <C>layout.feed()</C> reads the records as a journal —
        dated events by day, along a thread. It has{" "}
        <A href="/docs/resource-view/feed">a page of its own</A>.
      </P>

      <H2 id="declaring">Declaring several</H2>

      <P>
        <C>views.list.layouts</C> is a list. Declare more than one and the{" "}
        <Term id="view">view</Term> renders a switcher; the reader's choice is
        written into the URL, so it survives a reload and travels in a shared link.
      </P>

      <CodeBlock>{VARIANTS}</CodeBlock>

      <Demo label="Five layouts over the same articles" code={VARIANTS} wide>
        <ResourceDemo resource={articlesResource} variant="table" />
      </Demo>

      <Callout kind="note" title="The first one wins">
        <P>
          With no <Term id="view-variant">layout</Term> in the URL, the first of the
          list is used. Ordering them is how you choose the default, and a layout id
          that no longer exists falls back to it rather than rendering nothing.
        </P>
      </Callout>

      <H2 id="header">The header of a list</H2>

      <P>
        The switcher is not a loose control floating above the rows: every list draws
        one header line, and the switcher sits in it. From left to right — the
        resource's <C>icon</C> in a badge, the view's title — derived from the
        resource&apos;s <C>name</C> — and <C>description</C>, the layout switcher, then the export and create buttons,
        with a rule under the lot.
      </P>

      <CodeBlock>{HEADER}</CodeBlock>

      <P>
        Nothing is declared to turn it on. It is assembled from what the resource
        already says, and each piece disappears when there is nothing to draw: no{" "}
        <C>icon</C>, no badge; no <C>description</C>, one line instead of two; one
        layout, no switcher; <C>permissions.create</C> refused, no button.
      </P>

      <Callout kind="note" title="A nested list keeps quiet">
        <P>
          A list rendered inside another view — a{" "}
          <A href="/docs/resource-view/sub-views">tab</A>, a resource
          embedded in a page of your own — leaves the naming out: whatever contains it
          has already written its title, and saying it twice is only saying it twice.
          Its switcher and its buttons stay.
        </P>
      </Callout>

      <P>
        The icon shown is the resource's, not the layout's. A layout carries an icon
        of its own — it is what the switcher draws — and a header taking that one
        would change the heading of the collection every time the reader changed the
        layout.
      </P>

      <P>
        The filter bar is not part of it: it is a row of its own, below the rule, and
        it has <A href="/docs/resource-view/filters">its own page</A>.
      </P>

      <H2 id="identity">How a layout is identified</H2>

      <P>
        A layout&apos;s id is its type, so renaming its <C>label</C> breaks no
        shared link. Pass an <C>id</C> only when the same layout appears twice.
      </P>

      <CodeBlock>{IDENTITY}</CodeBlock>

      <H2 id="shared">What every layout shares</H2>

      <P>
        Besides its own options — <C>columns</C>, <C>groupBy</C>,{" "}
        <C>dateField</C>… — every layout accepts the same few, and only for that
        layout:
      </P>

      <Ul>
        <Li>
          <C>fields</C> — the columns of the table, the lines of a card, in order:{" "}
          <C>fields: ["title", "status"]</C>. Checked against the item type.
        </Li>
        <Li>
          <C>form</C> — adjusts the resource&apos;s form for this layout only, merged
          over it.
        </Li>
        <Li>
          <C>fullWidth</C> — this layout takes the page&apos;s whole width.
        </Li>
        <Li>
          <C>label</C>, <C>icon</C> — what the switcher shows; <C>id</C> — what the
          URL says.
        </Li>
        <Li>
          <C>components.list</C>, <C>components.row</C>, <C>components.item</C>.
        </Li>
      </Ul>

      <P>
        Those three rendering slots are what a layout actually sets:{" "}
        <C>components.list</C> draws the collection, <C>components.row</C> one
        record, and <C>components.item</C> one field of a record. What belongs to
        the list rather than to one layout — <C>pageSize</C>, <C>filters</C>,{" "}
        <C>sort</C>, <C>bulkActions</C>, <C>components.top</C>,{" "}
        <C>components.empty</C> — is declared on <C>views.list</C>, and holds
        whichever layout the reader picks.
      </P>

      <H2 id="custom">Writing your own</H2>

      <P>
        A built-in layout is a preset over the same shape as{" "}
        <C>layout.custom()</C>, nothing more. A layout of your own is three
        components and one call:
      </P>

      <CodeBlock>{CUSTOM}</CodeBlock>

      <P>
        Inside those components, <C>useList</C> gives the rows and the mutations, and{" "}
        <C>useCurrentViewResourceContext</C> gives the whole context — loading state,
        filters, selection — and <C>useLayout().options</C> the layout&apos;s own
        options.
      </P>

      <P>
        You need not type any of it: the package ships a command that writes that
        file where you want it, components and <C>layout.custom()</C> call included.
      </P>

      <CodeBlock lang="bash">{SCAFFOLD}</CodeBlock>

      <P>
        <A href="/docs/resource-view/custom-variant">
          Create your own layout
        </A>{" "}
        takes the generated file apart, line by line.
      </P>

      <P>
        The next three pages take the built-in layouts one family at a time:{" "}
        <A href="/docs/resource-view/table">table and cards</A>,{" "}
        <A href="/docs/resource-view/split">split and board</A>, and{" "}
        <A href="/docs/resource-view/calendar">calendar and timeline</A> — then{" "}
        <A href="/docs/resource-view/custom-variant">one you write yourself</A>.
      </P>
    </DocArticle>
  )
}

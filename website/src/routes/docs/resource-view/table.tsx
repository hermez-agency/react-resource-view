import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { ResourceDemo } from "@/components/ResourceDemo"
import { A, C, H2, Li, P, Term, Ul } from "@/components/prose"
import { articlesResource } from "@/demo/resources"

export const Route = createFileRoute("/docs/resource-view/table")({
  head: () => ({
    meta: [
      { title: "Table and cards — react-resource-view" },
      {
        name: "description",
        content:
          "The two everyday layouts: where the columns come from, how a cell is rendered, and when a card grid reads better.",
      },
    ],
  }),
  component: TableAndCards,
})

const COLUMNS = `form: {
  inputs: {
    title:       { label: "Title" },      // column 1
    author:      { label: "Author" },     // column 2
    status:      { label: "Status" },     // column 3
    workspace:   { generatedValue: true },// not a column
  },
},
views: {
  list: { layouts: [layout.table()] },
}`

const PER_VARIANT = `layouts: [
  // The table shows everything…
  layout.table(),
  // …the cards, only what fits.
  layout.cards({ columns: 3, fields: ["title", "status"] }),
]`

const CELL = `import { ItemTable, layout } from "react-resource-view"

layout.table({
  components: {
    // One cell. \`formInput\` carries the field *and* its value for this row.
    item: ({ formInput }) => {
      if (formInput?.name !== "status") return <ItemTable formInput={formInput} />
      return <StatusBadge value={formInput.value} />
    },
  },
})`

const ROW_ACTIONS = `views: {
  list: {
    // Read is not in the default — ["update", "delete"] is. Put it back where
    // the detail view carries more than the row does.
    rowActions: ["read", "update", "delete"],
  },
}`

const EXPORT = `views: {
  list: { pageSize: 50 },
},
// The CSV export is offered by default; restrict it like any other action.
permissions: { export: () => isManager() },`

function TableAndCards() {
  return (
    <DocArticle
      toc={[
        { id: "columns", title: "Where the columns come from" },
        { id: "editing", title: "Editing in place" },
        { id: "row-actions", title: "What a row offers" },
        { id: "cells", title: "Rendering a cell yourself" },
        { id: "cards", title: "Cards" },
        { id: "pagination", title: "Pagination and export" },
      ]}
    >
      <P>
        These two carry most lists. They read the same description and differ only in
        shape — which is why moving from one to the other is a one-line change, and
        why declaring both costs nothing.
      </P>

      <H2 id="columns">Where the columns come from</H2>

      <P>
        There is no <C>columns</C> array. The table renders one column per field of
        the resource&apos;s <Term id="form">form</Term> — the root <C>form</C>,
        shared by every <Term id="view">view</Term> — in declaration order, skipping
        fields marked <C>generatedValue</C>. The header is the field's <C>label</C>,
        passed through the translation dictionary.
      </P>

      <CodeBlock>{COLUMNS}</CodeBlock>

      <Callout kind="tip" title="One description, two readings">
        <P>
          The consequence is worth stating plainly: adding a column adds an editable
          field, and marking a field required makes the create form require it.
          Nothing can drift, because there is only one description.
        </P>
      </Callout>

      <P>
        When the table wants more than the cards, give each{" "}
        <Term id="view-variant">layout</Term> its own <C>fields</C> — the columns, or
        the lines of a card, in order. A layout&apos;s <C>form</C> adjusts the fields
        themselves, merged over the resource&apos;s:
      </P>

      <CodeBlock>{PER_VARIANT}</CodeBlock>

      <H2 id="editing">Editing in place</H2>

      <P>
        A table cell is rendered by the same <Term id="controller">controller</Term>{" "}
        the form would use, so a row is editable where it stands — no modal, no
        separate edit mode. A change is drawn at once and written through the{" "}
        <Term id="repository">repository</Term>; a refusal puts the cell back.
      </P>

      <Demo label="Change a status in the table" wide>
        <ResourceDemo resource={articlesResource} variant="table" />
      </Demo>

      <P>
        Mark a field <C>readonly</C> to show it without letting it be edited from the
        list.
      </P>

      <H2 id="row-actions">What a row offers</H2>

      <P>
        At the end of every row sits a group of buttons. Which ones is a decision the
        list takes, because it depends on what the row already does — a table editing
        its cells in place has little use for a button whose only job is to show the
        same fields again, and three buttons are three buttons' worth of width taken
        from the columns.
      </P>

      <CodeBlock>{ROW_ACTIONS}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "views.list.rowActions",
            type: '("read" | "update" | "delete")[]',
            default: '["update", "delete"]',
            description: (
              <>
                Declared on the list view, or once for the application through{" "}
                <C>
                  configureResourceView({"{"} defaults {"}"})
                </C>
                . Order is the order the buttons are drawn in.
              </>
            ),
          },
        ]}
      />

      <Callout kind="note" title="Read is not in the default">
        <P>
          It is one entry away — put it back where the detail view carries more than
          the list does, which is exactly the case{" "}
          <A href="/docs/resource-view/forms">a read form of its own</A> describes.
          Permissions apply on top either way: an action listed here without the
          action refused by <C>permissions</C> renders nothing.
        </P>
      </Callout>

      <H2 id="cells">Rendering a cell yourself</H2>

      <P>
        <C>components.item</C> renders one field of one row. It receives the{" "}
        <C>formInput</C> — the field description carrying this row's value — so it
        can decide by field name and fall back to the default for the rest.
      </P>

      <CodeBlock>{CELL}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "components.list",
            type: "FC<{ rows, children }>",
            description: "Draws the whole collection. The table or the grid itself.",
          },
          {
            name: "components.row",
            type: "FC<{ row, children }>",
            description: "Draws one record — a table row, a card.",
          },
          {
            name: "components.item",
            type: "FC<{ formInput, children }>",
            description: "Draws one field of one record — a cell.",
          },
          {
            name: "views.list.components.top / bottom",
            type: "FC",
            description:
              "Rendered above and below the list — a summary bar, a legend.",
          },
          {
            name: "views.list.components.empty",
            type: "FC",
            description: "Replaces the empty state.",
          },
          {
            name: "views.list.components.pagination",
            type: "FC",
            description: "Replaces the pager.",
          },
        ]}
      />

      <P>
        <C>ItemRender</C> is exported for the fallback: it turns a value into
        something readable — dates, booleans, IRIs — which is what the default cell
        uses.
      </P>

      <H2 id="cards">Cards</H2>

      <P>
        <C>layout.cards()</C> takes one extra option, <C>columns</C>, the number of
        cards per row, from one to six. Four by default.
      </P>

      <Demo label="The same articles as cards" wide>
        <ResourceDemo resource={articlesResource} variant="cards" />
      </Demo>

      <P>Cards read better than a table when:</P>

      <Ul>
        <Li>a record has a dominant field — a title, a name, an image;</Li>
        <Li>there are fewer than four attributes worth showing;</Li>
        <Li>
          the list is browsed rather than compared — comparison is what columns are
          for.
        </Li>
      </Ul>

      <H2 id="selecting">Selecting rows</H2>

      <P>
        A checkbox on every row, and “Select all” in the header, as soon as the list
        has something to do with a selection. It is declared on <C>views.list</C>{" "}
        rather than on the layout, so the same two keys give the cards and the items
        their checkbox and the board its multi-selection.
      </P>

      <CodeBlock>{SELECTING}</CodeBlock>

      <P>
        <C>selectable</C> defaults to <C>true</C> wherever <C>bulkActions</C>{" "}
        declares anything — and on a board, whose cards move together — so one action
        is usually all there is to write. Checking a row brings up a bar with the
        count, a button per action and “Deselect all”; Escape empties the selection.{" "}
        <C>onAction</C> receives the records and the resource&apos;s mutation, so
        what it writes is drawn before the API answers, and the list reloads once it
        settles.
      </P>

      <PropsTable
        rows={[
          {
            name: "views.list.selectable",
            type: "boolean",
            default: "true with bulk actions, or on a board",
            description: "Whether the records of the list can be checked.",
          },
          {
            name: "views.list.bulkActions",
            type: '(BulkActionInterface | "delete")[]',
            description: (
              <>
                <C>{"{ label, icon?, onAction(records, mutation) }"}</C>, run on the
                checked records. <C>&quot;delete&quot;</C> is the built-in deletion:
                a confirmation, then one deletion per record, as far as{" "}
                <C>permissions.delete</C> allows.
              </>
            ),
          },
        ]}
      />

      <Callout kind="note" title="Not every layout selects">
        <P>
          <C>layout.split()</C>, <C>layout.calendar()</C> and{" "}
          <C>layout.timeline()</C> draw no checkbox, so nothing is selected there.
          The board&apos;s own gestures — Ctrl/Cmd+click, Shift+click, “Move to…” —
          are on <A href="/docs/resource-view/split">its page</A>.
        </P>
      </Callout>

      <H2 id="pagination">Pagination and export</H2>

      <P>
        <C>views.list.pageSize</C> sets the page size — thirty by default — and the
        current page travels in the URL alongside the filters, so a link to page four
        is a link to page four.
      </P>

      <CodeBlock>{EXPORT}</CodeBlock>

      <P>
        The export button is there unless <C>permissions.export</C> refuses it — on a
        resource with a <C>path</C>, whose dialect knows how to ask for one. The
        export is produced by the API in CSV and carries the filters currently
        applied, so what is downloaded is what is on screen.
      </P>

      <Callout kind="note" title="Filters live next door">
        <P>
          The filter bar above the list is an ordinary form with <C>saveOnChange</C>.
          It has <A href="/docs/resource-view/filters">its own page</A>.
        </P>
      </Callout>
    </DocArticle>
  )
}

const SELECTING = `views: {
  list: {
    // selectable: true, // implied by the actions below
    bulkActions: [
      {
        label: "Archive",
        icon: Archive,
        onAction: (records, mutation) =>
          Promise.all(
            records.map((record) => mutation.update({ ...record, archived: true }))
          ),
      },
      "delete",
    ],
  },
}`

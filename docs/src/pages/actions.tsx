import { ActionList } from "react-data-form"
import {
  createViewResource,
  layout,
  open,
  ViewResourceContextProvider,
  type OpenFrameProps,
} from "react-resource-view"
import { localStorageRepository } from "jsonld-repository"
import { ChevronUp, Maximize2, MousePointerClick } from "lucide-react"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

/**
 * An accordion: the record unfolds under its row instead of over the page.
 * The library hands it the title, the view, `close` and the link to the full
 * page; the URL, closing after a save and the focus stay its own.
 */
function Accordion({ title, children, close, expandHref }: OpenFrameProps) {
  return (
    <section
      aria-label="Accordion"
      className="m-2 rounded-xl border border-border bg-muted/30 p-4"
    >
      <header className="mb-3 flex items-center gap-2">
        <h3 className="flex-1 text-sm font-semibold">{title}</h3>
        {expandHref && (
          <a
            href={expandHref}
            aria-label="Open in full page"
            title="Open in full page"
          >
            <Maximize2 className="size-4" />
          </a>
        )}
        <button type="button" onClick={close} aria-label="Collapse" title="Collapse">
          <ChevronUp className="size-4" />
        </button>
      </header>
      {children}
    </section>
  )
}

const accordion = open.custom({
  type: "accordion",
  placement: "inline",
  component: Accordion,
})

const demoArticles = localStorageRepository({ path: "demo_articles" })

/** The demo's articles again, read in an accordion under their row. */
export const accordionArticlesResource = createViewResource("demo_accordion", {
  name: "Articles",
  storage: "local",
  // The live demo's records, kept in the browser's storage.
  repository: {
    getCollection: demoArticles.getCollection as never,
    getItem: demoArticles.getItem as never,
    createItem: demoArticles.createItem as never,
    updateItem: demoArticles.updateItem as never,
    removeItem: demoArticles.removeItem as never,
  },
  form: {
    inputs: {
      title: { label: "Title" },
      author: { label: "Author" },
    },
  },
  views: {
    list: {
      layouts: [layout.table(), layout.items()],
      rowActions: ["read"],
    },
    read: { title: "Article", open: accordion },
  },
})

const actionsResource = createViewResource("actions", {
  name: "Actions",
  icon: MousePointerClick,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Actions"
          intro="Read, create, update and delete: where each one opens, and what the list shows while the API is answering."
        />

        <Section
          title="Where an action opens"
          intro="views.<action>.open: the whole page, a dialog over it, a drawer sliding in, or a frame of your own."
        >
          <CodeBlock>{openCode}</CodeBlock>
          <p>
            Anything but <code>page</code> is written into the URL, under the view it
            was opened from: <code>…/tasks/list/tasks/update/12</code>, with the
            list's filter and layout. A row's button, a board's card and a link typed
            by hand give the same URL — Back closes the frame, a reload opens it
            again over the same list, and a save closes it by going back to the
            list's URL.
          </p>
        </Section>

        <Section
          title="A frame of your own"
          intro="open.custom() builds a frame the way layout.custom() builds a layout: a component that draws it, and where it sits."
        >
          <CodeBlock>{customOpen}</CodeBlock>
          <p>
            <code>placement: "inline"</code> draws the view under the row that opened
            it, in a table, a plain list or a card grid —{" "}
            <code>layout.custom({'{ supports: ["inline"] }'})</code> for a layout of
            your own. A board, a calendar or a timeline has no row to draw under:
            there the frame falls back to a dialog, with a warning in development.{" "}
            <code>"overlay"</code> draws it over the page, like the dialog and the
            drawer.
          </p>
          <LiveExample label="read, in an accordion under the row">
            <ViewResourceContextProvider
              resource={accordionArticlesResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
        </Section>

        <Section
          title="Open in full page"
          intro="A dialog or a drawer may be too narrow for its record. expandable puts a link to the same view on its own page beside the close button."
        >
          <CodeBlock>{expandable}</CodeBlock>
          <p>
            It is on by default for <code>read</code> and <code>update</code>, whose
            content may be long, and off for <code>create</code> and{" "}
            <code>delete</code> — a confirmation has no page worth opening. A board's
            card opens the record's <code>read</code> view, so it follows{" "}
            <code>views.read</code>.
          </p>
          <p>
            The button is a real link: Ctrl/Cmd+click opens the page in a new tab and
            leaves the window where it is.
          </p>
        </Section>

        <Section
          title="Optimistic writes"
          intro="Every write — a form saved, a row deleted, a cell edited in place, a card moved — is drawn before the API answers."
        >
          <ul>
            <li>
              the list shows the expected result at once; a record being created
              appears, dimmed, before it has an id;
            </li>
            <li>
              the API's answer replaces it as soon as it comes — its generated id,
              its computed fields;
            </li>
            <li>
              a refusal puts the row back and says why in a toast; a form keeps the
              API's violations on its fields;
            </li>
            <li>
              several writes to one record show the last one, and a list read again
              while a write is in flight — a realtime push — keeps the row as
              written.
            </li>
          </ul>
          <CodeBlock>{optimistic}</CodeBlock>
          <p>
            An in-place edit and a card moved are updates: they follow{" "}
            <code>views.update.optimistic</code>.
          </p>
        </Section>

        <Section
          title="Your own actions"
          intro="useResourceMutation gives an application's business actions the same optimism and the same rollback."
        >
          <CodeBlock>{mutation}</CodeBlock>
          <p>
            Every call resolves with the API's answer, or rejects once the record is
            back to what it was — after a toast, unless <code>notify: false</code>. A
            list's <code>bulkActions</code> receive the same object as their second
            argument.
          </p>
        </Section>

        <Section
          title="Acting on a selection"
          intro="views.list.bulkActions declares what runs on the records a reader checks; selectable says whether they can be checked at all."
        >
          <CodeBlock>{bulk}</CodeBlock>
          <p>
            The selection belongs to the list, not to a layout: a checkbox on the
            table's rows — with <em>Select all</em> in its header —, on the cards and
            on the items, plus Ctrl/Cmd+click, Shift+click and a long press on a
            board. <code>selectable</code> defaults to <code>true</code> on a board,
            whose cards move together, and everywhere else to whether{" "}
            <code>bulkActions</code> declares anything — so declaring one action is
            enough.
          </p>
          <p>
            A bar comes up as soon as a record is checked: the count, one button per
            action, and <em>Deselect all</em>; Escape empties the selection, unless a
            dialog or a menu is using the key. <code>onAction</code> receives the
            selected records and the resource's mutation, so what it writes is drawn
            before the API answers; the list reloads once it settles, and the
            selection is cleared if it resolves.
          </p>
          <p>
            A selection belongs to the page and the filter it was made on: turning
            the page, or changing a filter or the sort, empties it. Checking a record
            on page 1 and coming back to it from page 2 finds it unchecked, so a bulk
            action never runs on records the reader no longer sees.
          </p>
          <p>
            <code>"delete"</code> is the deletion built in: a confirmation, then one
            deletion per record, as far as <code>permissions.delete</code> allows —
            the records it refuses are left alone and counted in the message.{" "}
            <code>layout.split()</code>, <code>layout.calendar()</code> and{" "}
            <code>layout.timeline()</code> draw no checkbox, so nothing is selected
            there.
          </p>
        </Section>
      </>
    ),
  },
})

const openCode = `views: {
  read: { open: "drawer" }, // also where a board's card opens
  update: { open: "dialog", afterSave: "close" },
  delete: { open: "dialog" }, // the default for a deletion
}`

const customOpen = `import { open, configureResourceView } from "react-resource-view"

const accordion = open.custom({
  type: "accordion",
  placement: "inline", // "overlay" | "inline"
  component: ({ title, children, close, expandHref }) => (
    <Collapsible open onOpenChange={close}>
      <h3>{title}</h3>
      {children}
    </Collapsible>
  ),
})

views: { read: { open: accordion } }

// Or once for the whole application, then \`open: "accordion"\`:
configureResourceView({ open: { accordion } })

declare module "react-resource-view" {
  interface OpenFrames {
    accordion: true // so a typo in the name stays a type error
  }
}`

const expandable = `views: {
  read: { open: "drawer", expandable: true },    // the default
  update: { open: "dialog", expandable: false }, // no link to the page
}`

const optimistic = `createViewResource<Task>("tasks", {
  path: "/api/tasks",
  optimistic: true, // the default
  views: {
    // A deletion the server must confirm before the row goes.
    delete: { optimistic: false },
  },
})`

const mutation = `import { useResourceMutation } from "react-resource-view"

function AssignToMe({ task }: { task: Task }) {
  const tasks = useResourceMutation(tasksResource)

  return (
    <button
      onClick={() =>
        tasks.mutate({
          item: task,
          change: { assignee: me["@id"] },
          request: () => api.post(\`/api/tasks/\${task.id}/assign\`),
        })
      }
    >
      Assign to me
    </button>
  )
}

// Also: tasks.create(data), tasks.update(data), tasks.remove(task),
// tasks.isPending(task)`

export default actionsResource

const bulk = `views: {
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
      "delete", // a confirmation, then one deletion per record
    ],
  },
}`

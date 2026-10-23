import { createViewResource } from "react-resource-view"
import { BookmarkCheck } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"

const savedViewsResource = createViewResource("saved-views", {
  name: "Saved views",
  icon: BookmarkCheck,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Saved views"
          intro="A name over the filters, the sort, the layout and the columns of a list — “My late tasks”, “The team's board” — one click away in a tab above it."
        />

        <Section
          title="Views declared in code"
          intro="presets are always shown, to every reader, whatever savedViews says."
        >
          <CodeBlock>{presets}</CodeBlock>
          <p>
            <code>filter</code> is what the filter bar and the URL spell,{" "}
            <code>sort</code> is checked against the direction (<code>"asc"</code> or{" "}
            <code>"desc"</code>) and <code>layout</code> is the <code>id</code> of
            one of the list's layouts. What a preset leaves out falls back to the
            list's own: its <code>initial</code> filters and the sort it opens on. In
            development a preset without a name, with a layout the list does not
            declare, or with the same id as another is refused.
          </p>
        </Section>

        <Section
          title="Views saved by the reader"
          intro="savedViews: true adds a button that saves the state on screen under a name."
        >
          <CodeBlock>{savedViews}</CodeBlock>
          <p>
            Each tab has a menu to rename the view, duplicate it — a preset can be
            duplicated, which is how a reader makes it their own —, update it with
            the state on screen, or delete it.
          </p>
        </Section>

        <Section
          title="A URL per view"
          intro="Choosing a view writes ?savedView=<id> next to the filter and the layout it sets."
        >
          <p>
            A link with only <code>?savedView=late-tasks</code> applies the view; a
            reloaded page, which carries the filter and the layout too, keeps what
            the reader changed since. A preset's id is its name written as a slug (
            <code>Late tasks</code> → <code>late-tasks</code>) unless it declares an{" "}
            <code>id</code> — give one when the name may change. A view saved in the
            browser only exists in that browser; to share a link, keep the views in
            an API.
          </p>
        </Section>

        <Section
          title="Where they are kept: the savedViews port"
          intro="localStorage by default, one entry per resource. Four functions, each possibly asynchronous, move them to an API."
        >
          <CodeBlock>{port}</CodeBlock>
          <p>
            The API owns the <code>id</code>: <code>create</code> returns the view
            with the one it chose. Who sees which view is the API's to decide — the{" "}
            <code>resource</code> it receives, and its own session, are all it needs
            to share them with a team or keep them private. A store that throws
            leaves the tabs as they were and says so in a toast.
          </p>
          <CodeBlock>{api}</CodeBlock>
        </Section>
      </>
    ),
  },
})

const presets = `createViewResource<Task>("tasks", {
  path: "/api/tasks",
  views: {
    list: {
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
      presets: [
        { name: "Ada's board", filter: { assignee: "Ada" }, layout: "board" },
        {
          name: "Late",
          filter: { "dueDate[before]": "2026-01-01" },
          sort: { dueDate: "asc" },
          layout: "table",
          columns: { hidden: ["description"] },
        },
      ],
    },
  },
})`

const savedViews = `views: {
  list: { savedViews: true },
}`

const port = `import { configurePorts } from "react-resource-view"

configurePorts({
  savedViews: {
    list: (resource) => Promise<SavedView[]>,
    create: (resource, view) => Promise<SavedView>, // returns the view with its id
    update: (resource, id, changes) => Promise<SavedView>,
    remove: (resource, id) => Promise<void>,
  },
})`

const api = `// An API that shares the views between users
configurePorts({
  savedViews: {
    list: (resource) =>
      fetch(\`/api/saved-views?resource=\${resource}\`).then((r) => r.json()),
    create: (resource, view) =>
      fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...view, resource }),
      }).then((r) => r.json()),
    update: (resource, id, changes) =>
      fetch(\`/api/saved-views/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      }).then((r) => r.json()),
    remove: (resource, id) =>
      fetch(\`/api/saved-views/\${id}\`, { method: "DELETE" }).then(() => undefined),
  },
})`

export default savedViewsResource

import { useState } from "react"
import { ActionList } from "react-data-form"
import {
  createViewResource,
  ViewResourceContextProvider,
  layout,
} from "react-resource-view"
import { localStorageRepository } from "jsonld-repository"
import { PlayCircle } from "lucide-react"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

export interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
  author: string
  published: boolean
}

const ARTICLES: Article[] = [
  {
    "@id": "/api/articles/1",
    "@type": "Article",
    id: "1",
    title: "Describing a form as data",
    author: "Ada",
    published: true,
  },
  {
    "@id": "/api/articles/2",
    "@type": "Article",
    id: "2",
    title: "Reading an IRI without thinking about it",
    author: "Grace",
    published: true,
  },
  {
    "@id": "/api/articles/3",
    "@type": "Article",
    id: "3",
    title: "Why a deep path 404s on static hosting",
    author: "Ada",
    published: false,
  },
  {
    "@id": "/api/articles/4",
    "@type": "Article",
    id: "4",
    title: "One registry, or none at all",
    author: "Alan",
    published: false,
  },
]

/**
 * How the demo's "API" answers: at once, after a while — long enough to see a
 * row change before the answer — or with a refusal, to see it come back.
 */
type ApiMode = "instant" | "slow" | "failing"
let apiMode: ApiMode = "instant"

const storage = localStorageRepository({ path: "demo_articles" })

/** A write of the browser's storage, answered the way `apiMode` says. */
function simulated<Args extends unknown[], Result>(
  write: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    if (apiMode !== "instant") await new Promise((done) => setTimeout(done, 1500))
    if (apiMode === "failing") throw new Error("The simulated API refused the write")
    return write(...args)
  }
}

/** The resource the demo renders — an ordinary declaration, nothing special. */
export const articlesResource = createViewResource<Article>("demo_articles", {
  name: "Articles",
  // No `path`: the records live in the browser, starting from these.
  storage: { type: "local", seed: ARTICLES },
  repository: {
    createItem: simulated(storage.createItem as never),
    updateItem: simulated(storage.updateItem as never),
    // The repository receives `{ id }`; the storage finds a record by its IRI.
    removeItem: simulated(({ id }: { id: string }) =>
      storage.removeItem({ "@id": `/api/articles/${id}` } as never)
    ),
  },
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
      published: { label: "Published" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [layout.table(), layout.cards({ columns: 2 })],
      rowActions: ["read", "update", "delete"],
    },
    read: { open: "drawer" },
    update: { open: "dialog" },
  },
})

const API_MODES: [ApiMode, string][] = [
  ["instant", "Instant API"],
  ["slow", "Slow API (1.5 s)"],
  ["failing", "Failing API"],
]

/** Picks how the demo's API answers the writes. */
function ApiModeSwitch() {
  const [mode, setMode] = useState(apiMode)

  return (
    <div
      role="radiogroup"
      aria-label="Simulated API"
      className="mb-4 flex flex-wrap gap-2"
    >
      {API_MODES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => {
            apiMode = value
            setMode(value)
          }}
          className={
            "rounded-full border px-3 py-1 text-sm " +
            (mode === value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground")
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const demoResource = createViewResource("demo", {
  name: "Live demo",
  icon: PlayCircle,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Live demo"
          intro="The resource declared below, rendered right here. Four articles read from your browser's storage — no server is involved, which is the point."
        />

        <Section
          title="Running"
          intro="Filter the list, switch between the table and the card layout, open an item. Everything you do lands in the URL."
        >
          <ApiModeSwitch />
          <LiveExample label="A resource, embedded in this page">
            <ViewResourceContextProvider
              resource={articlesResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
          <p>
            The views are nested inside this page through{" "}
            <code>ViewResourceContextProvider</code>, the same component an
            application uses to render a sub-resource inside another view.
          </p>
          <p>
            Slow the API down, then edit a cell, save the dialog or delete a row: the
            list shows the result before the answer, and a failing API puts it back
            with a message. A record opened in the drawer or the dialog has an "Open
            in full page" button beside the close button.
          </p>
        </Section>

        <Section
          title="What is declared"
          intro="No path, so the views read fixtures rather than an API."
        >
          <CodeBlock>{setup}</CodeBlock>
          <p>
            Swapping <code>localStorage</code> for a real API is one line: give the
            resource a <code>path</code> instead of <code>storage: "local"</code>,
            and <code>httpRepository</code> takes over.
          </p>
        </Section>
      </>
    ),
  },
})

const setup = `export const articlesResource = createViewResource("demo_articles", {
  name: "Articles",
  // No \`path\`: the views read from localStorage instead of an API,
  // starting from \`seed\` while it is empty.
  storage: { type: "local", seed: ARTICLES },
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
      published: { label: "Published" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [layout.table(), layout.cards({ columns: 2 })],
      rowActions: ["read", "update", "delete"],
    },
    // "Open in full page" in their header — \`expandable\` is true for both.
    read: { open: "drawer" },
    update: { open: "dialog" },
  },
})`

export default demoResource

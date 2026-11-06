import type { ReactNode } from "react"
import { ArrowDown } from "lucide-react"
import type { ConceptId } from "@/lib/concepts"
import { cn } from "@/lib/cn"

/**
 * The Concepts page's drawing: a resource declaration on its way to the API,
 * and the ports the application plugs in beside it.
 *
 * It is drawn in HTML rather than SVG so it reflows on a phone and its words
 * stay text — each box is a link to the glossary entry below it, which is
 * where the drawing's vocabulary is defined.
 */
export function ArchitectureDiagram() {
  return (
    <figure className="not-prose my-8">
      <div className="grid gap-6 rounded-2xl border border-border bg-muted/30 bg-dotted p-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex flex-col items-stretch">
          <Box concept="resource" title="Resource declaration" accent>
            <code className="whitespace-normal">createViewResource("articles", {"{ … }"})</code>
          </Box>

          <Arrow />

          <div className="grid gap-3 sm:grid-cols-2">
            <Box concept="form" title="form">
              Fields described as data, rendered by react-data-form — one{" "}
              <a href="#controller" className="underline underline-offset-2">
                controller
              </a>{" "}
              per field.
            </Box>
            <Box concept="view-variant" title="layouts">
              Table, cards, board, split, calendar, timeline — the reader picks.
            </Box>
          </div>

          <Arrow label="reads and writes through" />

          <Box concept="repository" title="Repository">
            HTTP when the resource has a <code>path</code>, localStorage with{" "}
            <code>storage: "local"</code>.
          </Box>

          <Arrow label="spelled by" />

          <Box concept="dialect" title="Dialect">
            JSON-LD, Strapi, Supabase, FastAPI, Django, Spring Boot — or your own.
          </Box>

          <Arrow />

          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm font-medium">
            Your API
          </div>
        </div>

        <a
          href="#port"
          className="flex flex-col rounded-xl border border-dashed border-view/50 bg-background/70 p-4 text-foreground no-underline transition-colors hover:border-view"
        >
          <p className="text-xs font-medium text-view">
            Ports
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Injected once, at startup — the library chooses none of them.
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <Port name="router" via="configurePorts">
              navigation and routing mode, used by every view
            </Port>
            <Port name="brand" via="configurePorts">
              appName and description, written into the page head
            </Port>
            <Port name="api" via="configureApi">
              baseUrl, token and dialect, used by the repository
            </Port>
          </dl>
        </a>
      </div>

      <figcaption className="mt-3 text-center text-sm text-muted-foreground">
        One declaration feeds a form and its layouts; the data goes through a
        repository and a dialect to your API. Each box links to its definition.
      </figcaption>
    </figure>
  )
}

function Box({
  concept,
  title,
  accent = false,
  children,
}: {
  concept: ConceptId
  title: string
  accent?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-background px-4 py-3 text-sm",
        accent ? "border-view/50 bg-view-soft/40" : "border-border"
      )}
    >
      <a
        href={`#${concept}`}
        className={cn(
          "font-mono text-xs font-semibold no-underline hover:underline",
          accent ? "text-view" : "text-foreground"
        )}
      >
        {title}
      </a>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </div>
  )
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
      <ArrowDown className="size-4" aria-hidden />
      {label}
    </div>
  )
}

function Port({
  name,
  via,
  children,
}: {
  name: string
  via: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{name}</span>
        <code className="text-xs text-muted-foreground">{via}</code>
      </dt>
      <dd className="mt-0.5 text-muted-foreground">{children}</dd>
    </div>
  )
}

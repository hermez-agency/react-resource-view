import type { ReactNode } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react"
import {
  findNeighbours,
  findPage,
  findSection,
  type DocPage,
} from "@/lib/navigation"
import { cn } from "@/lib/cn"

export interface TocEntry {
  id: string
  title: string
}

/**
 * Everything around a page's prose.
 *
 * The title, the summary, the section badge and the pager are all read from the
 * navigation model rather than repeated in the page, so a page file only ever
 * contains its own content — and renaming a page in one place renames it
 * everywhere.
 */
export function DocArticle({
  toc = [],
  children,
}: {
  toc?: TocEntry[]
  children: ReactNode
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const page = findPage(pathname)
  const section = findSection(pathname)
  const { previous, next } = findNeighbours(pathname)

  const accentText = section?.accent === "form" ? "text-form" : "text-view"
  const accentBg = section?.accent === "form" ? "bg-form" : "bg-view"

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-12 px-4 py-10 lg:px-8 lg:py-14">
      <article className="min-w-0 flex-1">
        {section && (
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", accentBg)} />
            <span className={accentText}>{section.pkg}</span>
          </p>
        )}

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {page?.title}
        </h1>
        {page && (
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {page.summary}
          </p>
        )}

        <div className="prose-docs mt-10">{children}</div>

        <Pager previous={previous} next={next} />
      </article>

      {toc.length > 0 && (
        <aside className="hidden w-56 shrink-0 xl:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              On this page
            </p>
            <ul className="space-y-2 border-l border-border text-sm">
              {toc.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="-ml-px block border-l border-transparent pl-3 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    {entry.title}
                  </a>
                </li>
              ))}
            </ul>

            {section && (
              <a
                href={section.repository}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-3" />
                {section.pkg} on GitHub
              </a>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

function Pager({ previous, next }: { previous?: DocPage; next?: DocPage }) {
  if (!previous && !next) return null

  return (
    <nav className="mt-16 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      {previous ? (
        <Link
          to={previous.href}
          className="group rounded-xl border border-border p-4 no-underline transition-colors hover:border-foreground/25 hover:bg-muted/40"
        >
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" />
            Previous
          </span>
          <span className="mt-1 block font-medium">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next && (
        <Link
          to={next.href}
          className="group rounded-xl border border-border p-4 text-right no-underline transition-colors hover:border-foreground/25 hover:bg-muted/40 sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Next
            <ArrowRight className="size-3.5" />
          </span>
          <span className="mt-1 block font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  )
}

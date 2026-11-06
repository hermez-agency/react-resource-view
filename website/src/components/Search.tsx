import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { CornerDownLeft, Search as SearchIcon } from "lucide-react"
import { ALL_PAGES, SECTIONS, type DocPage } from "@/lib/navigation"
import { cn } from "@/lib/cn"

interface Hit extends DocPage {
  section: string
  accent: "form" | "view"
}

const HITS: Hit[] = SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) =>
    group.pages.map((page) => ({
      ...page,
      section: `${section.label} · ${group.label}`,
      accent: section.accent,
    }))
  )
)

/**
 * Page search.
 *
 * The index is the navigation itself — thirty-odd pages, titles and summaries —
 * built at module scope and filtered in memory. A full-text index would mean
 * shipping the prose twice; at this size the titles are what people search for
 * anyway.
 */
export function Search() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-input/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-56"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:block">Search…</span>
        <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] sm:block">
          ⌘K
        </kbd>
      </button>

      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return HITS.slice(0, 8)

    return HITS.filter((hit) =>
      `${hit.title} ${hit.summary} ${hit.section}`.toLowerCase().includes(needle)
    ).slice(0, 12)
  }, [query])

  // A filtered list can be shorter than the highlighted position.
  const selected = Math.min(index, Math.max(results.length - 1, 0))

  function go(hit: Hit | undefined) {
    if (!hit) return
    onClose()
    void navigate({ to: hit.href })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Search the documentation"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setIndex((value) => Math.min(value + 1, results.length - 1))
              }
              if (event.key === "ArrowUp") {
                event.preventDefault()
                setIndex((value) => Math.max(value - 1, 0))
              }
              if (event.key === "Enter") {
                event.preventDefault()
                go(results[selected])
              }
            }}
            placeholder="A controller, a layout, a concept…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing matches “{query}”.
            </li>
          )}

          {results.map((hit, position) => {
            const Icon = hit.icon
            const active = position === selected

            return (
              <li key={hit.href}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(position)}
                  onClick={() => go(hit)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      hit.accent === "form" ? "text-form" : "text-view"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {hit.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hit.summary}
                    </span>
                  </span>
                  {active && (
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {ALL_PAGES.length} pages · ↑↓ to move · ⏎ to open
        </p>
      </div>
    </div>
  )
}

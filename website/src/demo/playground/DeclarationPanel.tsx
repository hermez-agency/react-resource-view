import { useEffect, useRef } from "react"
import { ExternalLink, X } from "lucide-react"
import { CodeBlock } from "@/components/CodeBlock"
import {
  countLines,
  githubUrl,
  type Declaration,
} from "@/demo/playground/declarations"
import type { LineRange } from "@/lib/highlight"

/**
 * The file behind the screen, opened beside it.
 *
 * Loaded lazily with the highlighter it carries: a reader who never asks to
 * see a declaration should not download either. The lines of the active layout
 * are marked, and the panel scrolls to them.
 */
export default function DeclarationPanel({
  declaration,
  layout,
  layoutName,
  onClose,
}: {
  declaration: Declaration
  layout?: LineRange
  layoutName?: string
  onClose: () => void
}) {
  const body = useRef<HTMLDivElement>(null)

  // Brings the marked block into view once the file is drawn.
  useEffect(() => {
    body.current?.querySelector(".line-marked")?.scrollIntoView({ block: "center" })
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <aside
      aria-label="Resource declaration"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 text-xs">
          <p className="truncate font-mono">{declaration.path}</p>
          <p className="mt-1 text-muted-foreground">
            {countLines(declaration.source)} lines
            {layout && layoutName && (
              <>
                {" "}
                — the <span className="text-view">{layoutName}</span> layout is
                highlighted
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={githubUrl(declaration, layout)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
            <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the declaration"
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" ref={body}>
        <CodeBlock lang="ts" marked={layout} className="my-0 rounded-none border-0">
          {declaration.source}
        </CodeBlock>
      </div>
    </aside>
  )
}

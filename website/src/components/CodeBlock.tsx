import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { highlight, type CodeLanguage, type LineRange } from "@/lib/highlight"
import { cn } from "@/lib/cn"

export interface CodeBlockProps {
  children: string
  lang?: CodeLanguage
  /** Shown in the header strip — usually the file the snippet belongs in. */
  filename?: string
  /** Lines to bring out, 1-based and inclusive. */
  marked?: LineRange
  className?: string
}

/**
 * A highlighted snippet.
 *
 * Highlighting happens during render, on the server as well as in the browser,
 * so the markup the crawler reads is the markup the reader sees — no flash of
 * unstyled code, and no effect that only runs after hydration.
 */
export function CodeBlock({
  children,
  lang = "tsx",
  filename,
  marked,
  className,
}: CodeBlockProps) {
  const html = highlight(children, lang, marked)

  return (
    <div
      className={cn(
        "not-prose group relative my-5 overflow-hidden rounded-xl border border-border bg-code-bg",
        className
      )}
    >
      {filename && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{filename}</span>
        </div>
      )}

      <CopyButton value={children.trim()} />

      <div
        className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [&_pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      aria-label="Copy the snippet"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      className="absolute right-2 top-2 z-10 rounded-md border border-border bg-background p-1.5 text-muted-foreground opacity-0 transition-[color,opacity] hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

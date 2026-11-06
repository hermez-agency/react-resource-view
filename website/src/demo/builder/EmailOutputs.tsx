import { useState } from "react"
import { Check, Code, Copy, Download, FileText } from "lucide-react"
import type { BuilderBlock } from "@/demo/builder/blocks"
import type { CanvasSource } from "@/demo/builder/BuilderCanvas"
import {
  downloadEmail,
  envelopeOf,
  useRenderedEmail,
} from "@/demo/email/emailDocument"
import { formatSize, GMAIL_CLIP_LIMIT } from "@/demo/email/renderEmail"
import { cn } from "@/lib/cn"

/**
 * Everything an email builder adds around the canvas: the HTML and plain-text
 * tabs, the weight against Gmail's limit, and the two ways out — copy, or a
 * file. Shared by `/playground/builder` and the Newsletters editor of the back
 * office.
 *
 * Nothing here sends anything. The site is static and public; a form that
 * mailed whatever it was given would be an open relay. Sending a test is a
 * script run on a developer's machine — see `scripts/send-test-email.ts`.
 */
export function useEmailOutputs(
  blocks: BuilderBlock[],
  fields?: Record<string, unknown>
) {
  const email = useRenderedEmail(blocks, fields)
  const subject = envelopeOf(fields).subject

  const sources: CanvasSource[] = [
    { id: "html", label: "HTML", icon: Code, content: email.html },
    { id: "text", label: "Plain text", icon: FileText, content: email.text },
  ]

  return {
    sources,
    toolbarEnd: <EmailWeight size={email.size} />,
    actions: <EmailActions html={email.html} subject={subject} />,
  }
}

/** "11 KB / 102 KB" — amber past three quarters of the limit, red past it. */
export function EmailWeight({ size }: { size: number }) {
  const ratio = size / GMAIL_CLIP_LIMIT

  return (
    <span
      title="Gmail clips a message whose HTML weighs more than 102 KB"
      className={cn(
        "text-xs tabular-nums",
        ratio >= 1
          ? "font-medium text-red-600"
          : ratio >= 0.75
            ? "text-amber-600"
            : "text-muted-foreground"
      )}
    >
      {formatSize(size)} / {formatSize(GMAIL_CLIP_LIMIT)}
    </span>
  )
}

export function EmailActions({ html, subject }: { html: string; subject?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const button =
    "flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

  return (
    <>
      <button type="button" onClick={copy} className={button}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy HTML"}
      </button>
      <button
        type="button"
        onClick={() => downloadEmail(html, subject)}
        className={button}
      >
        <Download className="size-3.5" />
        Download .html
      </button>
    </>
  )
}

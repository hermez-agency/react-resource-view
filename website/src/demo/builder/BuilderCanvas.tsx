import { useState, type FC, type ReactNode } from "react"
import {
  Braces,
  Check,
  Copy,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react"
import type { BuilderBlock } from "@/demo/builder/blocks"
import { cn } from "@/lib/cn"

/**
 * What the blocks add up to, framed as the thing they will become.
 *
 * The preview used to be a card in the middle of the back office: same
 * background, same typography, same rounded border as the form beside it, so
 * the page being written never looked like a page. Here it is a sheet lying on
 * a desk — its own theme, its own width, a shadow under it — which is the whole
 * difference between previewing and editing.
 */

export type CanvasMedium = "page" | "sheet" | "email"

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "max-w-none" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "max-w-3xl" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "max-w-[24rem]" },
] as const

/**
 * An email is read in its 600px column or on a phone, and nothing in between
 * is worth a button: the desktop frame leaves the column its gutters, the
 * mobile one is a phone's 375px (plus the frame's border).
 */
const EMAIL_DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "max-w-[44rem]" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "max-w-[377px]" },
] as const

/**
 * A text the document compiles to, shown in a tab of its own beside the result
 * — an email's HTML and its plain-text part.
 */
export interface CanvasSource {
  id: string
  label: string
  icon: LucideIcon
  content: string
}

export function BuilderCanvas({
  blocks,
  fields,
  preview: Preview,
  medium = "page",
  sources = [],
  payload = blocks,
  toolbarEnd,
}: {
  blocks: BuilderBlock[]
  /** The record's fields beside the blocks, for a preview that needs them. */
  fields?: Record<string, unknown>
  preview: FC<{ blocks: BuilderBlock[]; fields?: Record<string, unknown> }>
  /**
   * A web page lies flat and stretches; a CV is a sheet of A4 and does not; an
   * email draws its own mail-client frame, at a desktop or a phone width.
   */
  medium?: CanvasMedium
  /** Tabs between "Result" and "Payload", each showing a text, copyable. */
  sources?: CanvasSource[]
  /** What the "Payload" tab prints — the blocks, unless told otherwise. */
  payload?: unknown
  /** Whatever the screen wants beside the toolbar — a save state, a count. */
  toolbarEnd?: ReactNode
}) {
  const [tab, setTab] = useState<string>("preview")
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop")
  const devices = medium === "email" ? EMAIL_DEVICES : DEVICES
  const width = devices.find((item) => item.id === device)?.width
  const source = sources.find((item) => item.id === tab)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
          <Toggle active={tab === "preview"} onClick={() => setTab("preview")}>
            <Eye className="size-3.5" />
            Result
          </Toggle>
          {sources.map((item) => (
            <Toggle
              key={item.id}
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Toggle>
          ))}
          <Toggle active={tab === "payload"} onClick={() => setTab("payload")}>
            <Braces className="size-3.5" />
            Payload
          </Toggle>
        </div>

        {/* A CV is the same width on every screen there is, so the switch would
            be three buttons doing nothing. */}
        {medium !== "sheet" && tab === "preview" && (
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {devices.map((item) => (
              <Toggle
                key={item.id}
                active={device === item.id}
                onClick={() => setDevice(item.id)}
                label={item.label}
              >
                <item.icon className="size-3.5" />
              </Toggle>
            ))}
          </div>
        )}

        {toolbarEnd && <div className="ml-auto">{toolbarEnd}</div>}
      </div>

      {source ? (
        <SourceView source={source} />
      ) : tab === "payload" ? (
        <pre className="max-h-[calc(100dvh-14rem)] overflow-auto rounded-2xl border border-border bg-code-bg p-4 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <div
          className={cn(
            "overflow-y-auto rounded-2xl bg-muted/40 p-3 sm:p-6",
            "max-h-[calc(100dvh-14rem)]",
            // The chequer of a design tool, faint enough to stay a texture.
            "bg-[radial-gradient(var(--grid-line)_1px,transparent_1px)] [background-size:16px_16px]"
          )}
        >
          {medium === "email" ? (
            // No sheet of paper: the preview draws the mailbox the message is
            // read in, and the message inside it is the real HTML, in a frame.
            <div className={cn("mx-auto", width)}>
              <Preview blocks={blocks} fields={fields} />
            </div>
          ) : (
            <div
              className={cn(
                "builder-paper mx-auto overflow-hidden bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_12px_32px_-12px_rgba(15,23,42,0.25)]",
                medium === "sheet"
                  ? "min-h-[58rem] max-w-[44rem] rounded-sm"
                  : cn("rounded-xl", width)
              )}
            >
              <Preview blocks={blocks} fields={fields} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** A compiled text, as it is: monospaced, scrollable, one click to copy. */
function SourceView({ source }: { source: CanvasSource }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(source.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="max-h-[calc(100dvh-14rem)] overflow-auto rounded-2xl border border-border bg-code-bg p-4 pt-12 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
        {source.content}
      </pre>
    </div>
  )
}

function Toggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  /** Set when the button is an icon on its own. */
  label?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

import { type ReactNode, useState } from "react"
import { ClientOnly } from "@tanstack/react-router"
import { Code2, Eye } from "lucide-react"
import { CodeBlock } from "@/components/CodeBlock"
import { cn } from "@/lib/cn"

export interface DemoProps {
  /** What the example is showing — shown in the frame's header. */
  label: string
  /** The source of the example, shown under the Code tab. */
  code?: string
  /** Renders full-bleed, for a layout that needs the width. */
  wide?: boolean
  children: ReactNode
}

/**
 * The frame every live example runs inside.
 *
 * Examples are mounted in the browser only. Both libraries are client
 * components — they hold state, read the URL and, in these demos, a
 * localStorage-backed repository — so rendering them on the server would
 * produce markup the browser immediately disagrees with. The prose around them
 * is still server-rendered, which is the part a crawler and a slow connection
 * care about.
 */
export function Demo({ label, code, wide, children }: DemoProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview")

  return (
    <div
      className={cn(
        "not-prose my-7 overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        wide && "lg:-mx-12"
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {label}
        </p>

        {code && (
          <div className="flex items-center gap-0.5 rounded-lg bg-background p-0.5">
            <TabButton
              active={tab === "preview"}
              onClick={() => setTab("preview")}
              icon={Eye}
            >
              Preview
            </TabButton>
            <TabButton
              active={tab === "code"}
              onClick={() => setTab("code")}
              icon={Code2}
            >
              Code
            </TabButton>
          </div>
        )}
      </div>

      {tab === "preview" ? (
        <div className="p-5">
          <ClientOnly fallback={<DemoSkeleton />}>{children}</ClientOnly>
        </div>
      ) : (
        <CodeBlock className="my-0 rounded-none border-0">{code!}</CodeBlock>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Eye
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  )
}

/** Holds the example's place while the browser catches up. */
function DemoSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted" />
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted" />
      <div className="h-9 w-28 rounded-lg bg-muted" />
    </div>
  )
}

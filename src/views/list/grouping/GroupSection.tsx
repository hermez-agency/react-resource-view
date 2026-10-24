import { useId, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/ui/cn"

/** The header of a section: a button folding it, and the number of records. */
export function GroupToggle({
  label,
  count,
  expanded,
  controls,
  onToggle,
}: {
  label: string
  count: number
  expanded: boolean
  controls?: string
  onToggle: () => void
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <button
      type="button"
      data-slot="group-toggle"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium focus-visible:outline-2"
    >
      <Chevron aria-hidden className="size-4 text-muted-foreground" />
      <span className="truncate">{label}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}

/** Which sections the reader folded; every one starts open. */
export function useFolded() {
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const prefix = useId()

  return {
    isExpanded: (key: string) => !folded.has(key),
    toggle: (key: string) =>
      setFolded((current) => {
        const next = new Set(current)
        if (!next.delete(key)) next.add(key)
        return next
      }),
    /** The id of the region a section's button controls. */
    regionId: (key: string) => prefix + "-" + key,
  }
}

/** A section of the cards layout: its header, then its content while open. */
export function GroupSection({
  label,
  count,
  expanded,
  regionId,
  onToggle,
  className,
  children,
}: {
  label: string
  count: number
  expanded: boolean
  regionId: string
  onToggle: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <section data-slot="group-section" className="flex flex-col gap-3">
      <GroupToggle
        label={label}
        count={count}
        expanded={expanded}
        controls={regionId}
        onToggle={onToggle}
      />
      <div id={regionId} className={cn(expanded && className)}>
        {expanded && children}
      </div>
    </section>
  )
}

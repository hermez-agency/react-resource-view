import type { ReactNode } from "react"

/**
 * The shape every builder screen takes: what the document is made of on the
 * left, what it looks like on the right.
 *
 * One component for the three of them — the demo at `/playground/builder`, a
 * post of the blog and the CV of an account — because the answer to "where am
 * I editing this" should not depend on which record one opened.
 */
export function BuilderShell({
  eyebrow,
  title,
  description,
  actions,
  outline,
  canvas,
}: {
  /** The kind of record, above its name. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Buttons belonging to the document as a whole — reset, export. */
  actions?: ReactNode
  /** The left column: the fields and the blocks. */
  outline: ReactNode
  /** The right column: the preview. */
  canvas: ReactNode
}) {
  // A container query rather than a breakpoint: the builder runs at full width
  // in the back office and inside the column of a documentation page, and what
  // decides whether the result fits beside the outline is the room this
  // component was given, not the size of the window.
  return (
    <div className="@container">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium text-muted-foreground ">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        {/* Stacked — a phone, a documentation column — the result comes first:
            it is what the reader should meet before the machinery. */}
        <div className="order-2 min-w-0 @4xl:order-1">{outline}</div>
        <div className="order-1 min-w-0 @4xl:sticky @4xl:top-20 @4xl:order-2">
          {canvas}
        </div>
      </div>
    </div>
  )
}

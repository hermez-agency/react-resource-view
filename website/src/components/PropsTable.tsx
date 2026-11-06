import type { ReactNode } from "react"

export interface PropRow {
  name: string
  type: string
  /** Rendered as-is; use `—` when there is none. */
  default?: string
  description: ReactNode
  required?: boolean
}

/**
 * The reference table under an API section.
 *
 * It scrolls horizontally on its own rather than widening the page, which is
 * what keeps a long TypeScript signature from breaking the layout on a phone.
 */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Default</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-b border-border/60 align-top last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-3">
                <code className="font-mono text-[13px] font-medium">{row.name}</code>
                {row.required && (
                  <span className="ml-1.5 align-middle text-[10px] font-semibold text-destructive">
                    required
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <code className="font-mono text-[12px] text-primary">
                  {row.type}
                </code>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] text-muted-foreground">
                {row.default ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

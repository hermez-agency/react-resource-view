import { Fragment, useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/cn"

/**
 * A shell command, run as it is, and the button that copies it.
 *
 * On a phone the line always wraps; `wrap` keeps it wrapping on a wide screen
 * too, where a column is too narrow for the longest command it shows — and
 * then only between words, so `my-admin` never splits at its hyphen.
 */
export function CopyCommand({ command, wrap }: { command: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <code
        className={cn(
          "min-w-0 font-mono text-xs text-foreground",
          !wrap && "sm:overflow-x-auto sm:whitespace-nowrap"
        )}
      >
        <span className="text-view">$</span>{" "}
        {wrap
          ? command.split(" ").map((word, index) => (
              <Fragment key={index}>
                {index > 0 && " "}
                <span className="inline-block max-w-full [overflow-wrap:anywhere]">
                  {word}
                </span>
              </Fragment>
            ))
          : command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the command"
        className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-view" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  )
}

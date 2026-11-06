import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { BackendLogo } from "@/components/BackendLogo"
import { CopyCommand } from "@/components/CopyCommand"
import { BACKENDS, starterCommand, starterSection } from "@/lib/backends"
import { cn } from "@/lib/cn"

/** The backends a reader writing Python lands on, and the page for them. */
const PYTHON_BACKENDS = ["fastapi", "django"]

/**
 * Pick your backend, copy the command that starts a back office on it.
 *
 * The logos are the landing page's only "works with": each one swaps the
 * command beneath it. The starter page has the same command for every
 * backend, each under its own heading; here the reader only sees theirs, and
 * what to type after it.
 */
export function StarterPicker() {
  const [picked, setPicked] = useState(BACKENDS[0])

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Your backend"
        className="grid grid-cols-4 gap-1.5 sm:grid-cols-7"
      >
        {BACKENDS.map((backend) => {
          const checked = backend.id === picked.id

          return (
            <button
              key={backend.id}
              type="button"
              role="radio"
              aria-checked={checked}
              title={backend.name}
              onClick={() => setPicked(backend)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border px-1 py-2 text-[11px] leading-tight font-medium transition-colors",
                checked
                  ? "border-view bg-view-soft text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-view/50 hover:text-foreground"
              )}
            >
              <BackendLogo backend={backend} className="h-5 max-w-full" />
              <span className="text-center">{backend.name}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <CopyCommand command={starterCommand(picked)} wrap />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Then{" "}
        <code className="font-mono text-foreground">
          cd my-admin && npm install && npm run dev
        </code>{" "}
        — the example resource, listed from your API.
      </p>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link
          to="/docs/resource-view/starter/"
          hash={starterSection(picked)}
          className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-view"
        >
          {picked.generic ? "Another REST API" : picked.name}: the setup it writes
          <ArrowRight className="size-3.5" />
        </Link>
        {PYTHON_BACKENDS.includes(picked.id) && (
          <Link
            to="/docs/resource-view/python/"
            className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-view"
          >
            FastAPI and Django side by side
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </p>
    </div>
  )
}

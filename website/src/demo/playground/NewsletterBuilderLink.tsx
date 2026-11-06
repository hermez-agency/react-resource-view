import { Link } from "@tanstack/react-router"
import { ArrowRight, Mail } from "lucide-react"

/**
 * Above the list of newsletters: the way to the email kit of the standalone
 * builder, which saves into this very list.
 *
 * A plain router `Link`, like the "Builder demo" of the top bar: it leaves the
 * scope for a route the scope does not own — with `?kit=email`, so it lands on
 * the email rather than on the page kit the builder opens on.
 */
export function NewsletterBuilderLink() {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <Mail className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        Start one from the email builder: what it saves is filed here, as a draft.
      </p>
      <Link
        to="/playground/builder/"
        search={{ kit: "email" }}
        className="flex shrink-0 items-center gap-1.5 self-start font-medium text-foreground transition-colors hover:text-primary sm:self-auto"
      >
        Open the email builder
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}

import { createFileRoute } from "@tanstack/react-router"
import { BlogIndex, blogIndexHead } from "@/components/BlogIndex"

/**
 * The blog in French. A page of its own rather than `/blog?lang=fr`: the site
 * is prerendered, so a query string would get the English HTML. No article can
 * take this slug (`parsePost` refuses it).
 */
export const Route = createFileRoute("/blog/fr")({
  // Read by the root route for `<html lang>`.
  loader: () => ({ lang: "fr" as const }),
  head: () => blogIndexHead("fr"),
  component: () => <BlogIndex lang="fr" />,
})

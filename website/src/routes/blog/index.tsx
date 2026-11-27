import { createFileRoute } from "@tanstack/react-router"
import { BlogIndex, blogIndexHead } from "@/components/BlogIndex"

/** The blog in English, its default language. The French list is `/blog/fr/`. */
export const Route = createFileRoute("/blog/")({
  // Read by the root route for `<html lang>`.
  loader: () => ({ lang: "en" as const }),
  head: () => blogIndexHead("en"),
  component: () => <BlogIndex lang="en" />,
})

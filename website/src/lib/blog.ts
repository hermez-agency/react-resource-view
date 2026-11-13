import { highlight, type CodeLanguage } from "@/lib/highlight"
import { parsePost, renderMarkdown, sortPosts, type BlogPost } from "@/lib/blogPost"

export type { BlogPost } from "@/lib/blogPost"

/**
 * Every article, read from `website/blog/*.md` when the bundle is built —
 * adding a file there is all it takes to publish one. Eager, so the server
 * renders a page and the browser hydrates it from the same string, with no
 * request in between.
 */
const files = import.meta.glob("../../blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

export const POSTS: BlogPost[] = sortPosts(
  Object.entries(files).map(([path, raw]) =>
    parsePost(path.slice(path.lastIndexOf("/") + 1, -".md".length), raw)
  )
)

export function findPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug)
}

/** What a fence's language is called in an article, and what the highlighter calls it. */
const LANGUAGES: Record<string, CodeLanguage> = {
  tsx: "tsx",
  jsx: "tsx",
  ts: "ts",
  typescript: "ts",
  js: "ts",
  javascript: "ts",
  css: "css",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
}

/** The article's body as HTML, code highlighted with the same themes as the documentation. */
export function renderPost(post: BlogPost): string {
  return renderMarkdown(post.body, {
    base: import.meta.env.BASE_URL,
    highlight: (code, lang) => {
      const language = LANGUAGES[lang]
      return language ? highlight(code, language) : undefined
    },
  })
}

/** The cover as an absolute-path URL under the base, or the site's sharing card. */
export function coverPath(post: BlogPost): string {
  const base = import.meta.env.BASE_URL
  const cover = post.cover ?? "/og-react-resource-view.png"
  if (/^https?:\/\//.test(cover)) return cover
  return cover.startsWith(base) ? cover : `${base}${cover.replace(/^\//, "")}`
}

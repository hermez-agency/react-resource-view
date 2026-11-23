import { getCover, type BlogCover } from "@/lib/blogCover"
import { SITE_ORIGIN } from "@/lib/seo"
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

const FALLBACK_COVER = "og-react-resource-view.png"

/**
 * What a page shows for an article: its own illustration (declared in
 * `covers.json`), else the frontmatter's `cover`, else the site's sharing card.
 * Only the first has variants, a description and an inline SVG.
 */
export function coverFor(post: BlogPost): {
  src: string
  alt: string
  sources?: BlogCover["sources"]
  svg?: string
} {
  const base = import.meta.env.BASE_URL
  const own = getCover(post.slug, base)
  if (own) return own
  const cover = post.cover ?? `/${FALLBACK_COVER}`
  if (/^https?:\/\//.test(cover)) return { src: cover, alt: "" }
  return { src: cover.startsWith(base) ? cover : `${base}${cover.replace(/^\//, "")}`, alt: "" }
}

/**
 * The absolute URL of the image shared on social networks: the article's own
 * 1200 × 630 card, else the site's, which stays the home page's image.
 */
export function shareImageUrl(post: BlogPost): string {
  const own = getCover(post.slug, import.meta.env.BASE_URL)
  if (own) return `${SITE_ORIGIN}${own.share}`
  const { src } = coverFor(post)
  return /^https?:\/\//.test(src) ? src : `${SITE_ORIGIN}${src}`
}

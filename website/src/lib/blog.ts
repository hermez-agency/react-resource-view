import { getCover, type BlogCover } from "@/lib/blogCover"
import { SITE_ORIGIN } from "@/lib/seo"
import { highlight, type CodeLanguage } from "@/lib/highlight"
import {
  checkTranslations,
  parsePost,
  renderMarkdown,
  sortPosts,
  translationsOf,
  type BlogLang,
  type BlogPost,
} from "@/lib/blogPost"

export type { BlogLang, BlogPost } from "@/lib/blogPost"

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

export const POSTS: BlogPost[] = checkTranslations(
  sortPosts(
    Object.entries(files).map(([path, raw]) =>
      parsePost(path.slice(path.lastIndexOf("/") + 1, -".md".length), raw)
    )
  )
)

export function findPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug)
}

/** The articles written in `lang`, newest first. */
export function postsIn(lang: BlogLang): BlogPost[] {
  return POSTS.filter((post) => post.lang === lang)
}

/** The other versions of an article, one per language. */
export function translationsFor(post: BlogPost): BlogPost[] {
  return translationsOf(POSTS, post)
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
  share?: string
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
  const { src, share } = coverFor(post)
  if (share) return `${SITE_ORIGIN}${share}`
  return /^https?:\/\//.test(src) ? src : `${SITE_ORIGIN}${src}`
}

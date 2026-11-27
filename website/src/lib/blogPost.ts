import { Marked, type Tokens } from "marked"
import { parse as parseYaml } from "yaml"

/**
 * Reads a blog article: its frontmatter, its reading time, its Markdown as HTML.
 *
 * Kept free of anything Vite-only (no `import.meta`, no `@/` alias) because two
 * readers share it: `blog.ts`, which feeds the routes, and
 * `scripts/generate-seo-files.ts`, a plain Node script that writes the sitemap
 * and the feed. Both must see the same articles, the same way.
 */

/**
 * The languages an article is written in. English is the default: `/blog`
 * lists it, and `x-default` points at it.
 */
export const BLOG_LANGS = ["en", "fr"] as const
export type BlogLang = (typeof BLOG_LANGS)[number]
export const DEFAULT_LANG: BlogLang = "en"

export interface BlogFrontmatter {
  title: string
  description: string
  /** Publication date, `YYYY-MM-DD`. */
  date: string
  /** Last significant edit, `YYYY-MM-DD`. */
  updated?: string
  /** Path of an image under `public/` (`/blog/…`), or an absolute URL. */
  cover?: string
  tags: string[]
  /** The language the article is written in. */
  lang: BlogLang
  /**
   * The key shared by the versions of one article in each language
   * (`rrv-2-2-visible-fields`): it is what links a page to its translation.
   */
  translation: string
}

export interface BlogPost extends BlogFrontmatter {
  /** The file name without `.md`, which is also the URL segment. */
  slug: string
  minutes: number
  /** The Markdown after the frontmatter. */
  body: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function fail(slug: string, message: string): never {
  throw new Error(`blog/${slug}.md: ${message}`)
}

function requireString(slug: string, data: Record<string, unknown>, key: string): string {
  const value = data[key]
  if (typeof value !== "string" || !value.trim()) {
    fail(slug, `the frontmatter needs a non-empty "${key}"`)
  }
  return value.trim()
}

function requireDate(slug: string, data: Record<string, unknown>, key: string): string {
  // YAML turns an unquoted 2026-11-13 into a Date: read it back as the day it names.
  const raw = data[key]
  const value = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    fail(slug, `"${key}" must be a YYYY-MM-DD date`)
  }
  return value
}

/** Reading time at 200 words a minute, never under one. */
export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Parses one `<slug>.md`. A malformed file throws, naming the file and the
 * field: the build has to stop on a missing description rather than publish an
 * article search engines would show without one.
 */
export function parsePost(slug: string, raw: string): BlogPost {
  if (!SLUG.test(slug)) {
    fail(slug, "the file name must be lowercase words joined by hyphens")
  }
  // `/blog/fr/` is the French index: an article cannot take a language's name.
  if ((BLOG_LANGS as readonly string[]).includes(slug)) {
    fail(slug, `"${slug}" is reserved for the ${slug} index of the blog`)
  }

  const match = FRONTMATTER.exec(raw)
  if (!match) fail(slug, "the file must open with a --- frontmatter block")

  const data = parseYaml(match[1]) as Record<string, unknown> | null
  if (!data || typeof data !== "object") fail(slug, "the frontmatter is empty")

  const tags = data.tags
  if (!Array.isArray(tags) || tags.length === 0 || tags.some((tag) => typeof tag !== "string")) {
    fail(slug, `"tags" must be a non-empty list of strings`)
  }

  const cover = data.cover
  if (cover !== undefined && typeof cover !== "string") fail(slug, `"cover" must be a string`)

  const updated = data.updated === undefined ? undefined : requireDate(slug, data, "updated")

  const lang = data.lang
  if (typeof lang !== "string" || !(BLOG_LANGS as readonly string[]).includes(lang)) {
    fail(slug, `"lang" must be one of ${BLOG_LANGS.join(", ")}`)
  }

  const translation = requireString(slug, data, "translation")
  if (!SLUG.test(translation)) {
    fail(slug, `"translation" must be lowercase words joined by hyphens`)
  }

  return {
    slug,
    title: requireString(slug, data, "title"),
    description: requireString(slug, data, "description"),
    date: requireDate(slug, data, "date"),
    updated,
    cover,
    tags: tags as string[],
    lang: lang as BlogLang,
    translation,
    minutes: readingMinutes(match[2]),
    body: match[2],
  }
}

/** Newest first. */
export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
}

/**
 * Refuses two articles of the same language under one translation key: the
 * page could not tell which one is its translation. Returns the posts, so it
 * reads as a step of loading them.
 */
export function checkTranslations(posts: BlogPost[]): BlogPost[] {
  const seen = new Map<string, string>()
  for (const post of posts) {
    const key = `${post.lang}:${post.translation}`
    const other = seen.get(key)
    if (other) {
      throw new Error(
        `blog/${post.slug}.md: "translation: ${post.translation}" is already used by blog/${other}.md, also in "${post.lang}"`
      )
    }
    seen.set(key, post.slug)
  }
  return posts
}

/** The other versions of `post`, one per language, its own excluded. */
export function translationsOf(posts: BlogPost[], post: BlogPost): BlogPost[] {
  return posts.filter((other) => other.translation === post.translation && other.lang !== post.lang)
}

/**
 * The articles that lack a version in one of `BLOG_LANGS`, with the language
 * missing. Not an error for the build — an article can come out in one
 * language first — but the repository's test refuses it.
 */
export function missingTranslations(posts: BlogPost[]): { slug: string; lang: BlogLang }[] {
  return posts.flatMap((post) =>
    BLOG_LANGS.filter(
      (lang) => lang !== post.lang && !posts.some((other) => other.translation === post.translation && other.lang === lang)
    ).map((lang) => ({ slug: post.slug, lang }))
  )
}

/** The path of the blog's index in a language: `/blog` for English, `/blog/fr` otherwise. */
export function blogIndexPath(lang: BlogLang): string {
  return lang === DEFAULT_LANG ? "/blog" : `/blog/${lang}`
}

/**
 * What the blog's pages say around the articles, in each language. Dates,
 * reading time and signature are `@/ui/article`'s own.
 */
export const BLOG_COPY: Record<
  BlogLang,
  {
    /** The language's own name, for the language switcher. */
    name: string
    /** The link to a translation in this language. */
    readIn: string
    /** `og:locale`. */
    locale: string
    title: string
    description: string
    readNext: string
  }
> = {
  en: {
    name: "English",
    readIn: "Read in English",
    locale: "en_US",
    title: "Blog — React Resource View",
    description:
      "Articles about React Resource View: generating the admin panel of a REST API from one declaration, its views, its forms and its backends.",
    readNext: "Read next",
  },
  fr: {
    name: "Français",
    readIn: "Lire en français",
    locale: "fr_FR",
    title: "Blog — React Resource View",
    description:
      "Des articles sur React Resource View : générer le back-office d'une API REST à partir d'une déclaration, ses vues, ses formulaires et ses backends.",
    readNext: "À lire aussi",
  },
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export interface RenderOptions {
  /**
   * The site's base (`/react-resource-view/`): a link or an image written as
   * `/docs/…` or `/blog/…` in an article is prefixed with it, so a page moved
   * behind another base keeps working.
   */
  base: string
  /** Highlights a code block; when absent, or when it returns nothing, the block is plain. */
  highlight?: (code: string, lang: string) => string | undefined
}

/** A heading id from its text: `Pourquoi ça marche ?` → `pourquoi-ca-marche`. */
function headingId(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&#?\w+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Markdown to the HTML `Article` styles as it comes: bare `h2`, `p`, `ul`,
 * `pre`, `table`. The few additions are an `id` on each heading (so a link can
 * target it), highlighted code, and a figure for an image alone on its line.
 */
export function renderMarkdown(markdown: string, options: RenderOptions): string {
  const withBase = (url: string) =>
    url.startsWith("/") && !url.startsWith("//") && !url.startsWith(options.base)
      ? `${options.base}${url.slice(1)}`
      : url

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens)
        return `<h${depth} id="${headingId(inner)}">${inner}</h${depth}>\n`
      },
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? "").split(/\s/)[0]
        const html = options.highlight?.(text, language)
        return html ? `${html}\n` : `<pre><code>${escapeHtml(text)}</code></pre>\n`
      },
      link({ href, title, tokens }: Tokens.Link) {
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ""
        return `<a href="${escapeHtml(withBase(href))}"${titleAttr}>${this.parser.parseInline(tokens)}</a>`
      },
      image({ href, title, text }: Tokens.Image) {
        const caption = title ? `<figcaption class="mt-3 text-sm leading-6 text-muted-foreground">${escapeHtml(title)}</figcaption>` : ""
        return `<figure data-width="wide" class="mt-10"><div class="overflow-hidden rounded-xl border border-border bg-card"><img src="${escapeHtml(withBase(href))}" alt="${escapeHtml(text)}" class="block h-auto w-full" loading="lazy"></div>${caption}</figure>`
      },
      paragraph({ tokens }: Tokens.Paragraph) {
        const inner = this.parser.parseInline(tokens)
        // A figure cannot live inside a <p>.
        return inner.startsWith("<figure") && inner.endsWith("</figure>")
          ? `${inner}\n`
          : `<p>${inner}</p>\n`
      },
    },
  })

  return marked.parse(markdown, { async: false })
}

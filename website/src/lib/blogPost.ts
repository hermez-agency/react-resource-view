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

  return {
    slug,
    title: requireString(slug, data, "title"),
    description: requireString(slug, data, "description"),
    date: requireDate(slug, data, "date"),
    updated,
    cover,
    tags: tags as string[],
    minutes: readingMinutes(match[2]),
    body: match[2],
  }
}

/** Newest first. */
export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
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

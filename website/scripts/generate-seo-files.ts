import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { ALL_PAGES, SECTIONS } from "../src/lib/navigation.ts"
import {
  BLOG_COPY,
  BLOG_LANGS,
  blogIndexPath,
  checkTranslations,
  DEFAULT_LANG,
  escapeHtml,
  missingTranslations,
  parsePost,
  renderMarkdown,
  sortPosts,
  type BlogLang,
  type BlogPost,
} from "../src/lib/blogPost.ts"
import { htmlToMarkdown } from "./html-to-markdown.ts"

/**
 * Runs after `vite build` and `typedoc` (see package.json) to drop sitemap.xml,
 * robots.txt, llms.txt and llms-full.txt into the prerendered output.
 *
 * All four read `SECTIONS` / `ALL_PAGES` — the same list the sidebar, the
 * pager and the root route's canonical URLs already read — so a page added
 * there is a page added here, with nothing to keep in sync by hand. The
 * playground is deliberately left out: its pages already carry
 * `<meta name="robots" content="noindex">` because their state lives in the
 * query string, not in a page worth indexing.
 *
 * This runs as a plain Node script, outside Vite, so it cannot read
 * `import.meta.env.BASE_URL` the way `src/lib/seo.ts` does — the base is
 * read the same way vite.config.ts reads it, straight from `DOCS_BASE`, and
 * the domain is repeated from `SITE_ORIGIN` there rather than imported,
 * since importing it would also pull in that Vite-only global.
 */
const SITE_ORIGIN = "https://hermez.dev"
const BASE = process.env.DOCS_BASE ?? "/"
const OUT_DIR = join(import.meta.dirname, "..", "dist", "client")

function absoluteUrl(path: string): string {
  const suffix = path === "/" ? "" : `${path.slice(1).replace(/\/$/, "")}/`
  return `${SITE_ORIGIN}${BASE}${suffix}`
}

/**
 * The blog: every `blog/*.md`, read the way `src/lib/blog.ts` reads them — the
 * same parser — so the sitemap and the feed list what the routes prerendered.
 */
const BLOG_DIR = join(import.meta.dirname, "..", "blog")
const posts = checkTranslations(
  sortPosts(
    readdirSync(BLOG_DIR)
      .filter((name) => name.endsWith(".md"))
      .map((name) =>
        parsePost(name.slice(0, -".md".length), readFileSync(join(BLOG_DIR, name), "utf8"))
      )
  )
)

// Allowed — an article can come out in one language first — but worth seeing.
for (const { slug, lang } of missingTranslations(posts)) {
  console.warn(`blog/${slug}.md has no "${lang}" version yet`)
}

const postsIn = (lang: BlogLang) => posts.filter((post) => post.lang === lang)
const postUrl = (post: BlogPost) => absoluteUrl(`/blog/${post.slug}/`)

/**
 * The `hreflang` alternates of an article, as the sitemap writes them: every
 * version, itself included, and `x-default` on the English one. None for an
 * article that has no translation yet.
 */
function alternatesOf(post: BlogPost): { hreflang: string; href: string }[] {
  const versions = posts.filter((other) => other.translation === post.translation)
  if (versions.length < 2) return []
  const fallback = versions.find((version) => version.lang === DEFAULT_LANG) ?? post
  return [
    ...versions.map((version) => ({ hreflang: version.lang, href: postUrl(version) })),
    { hreflang: "x-default", href: postUrl(fallback) },
  ]
}

const indexAlternates = [
  ...BLOG_LANGS.map((lang) => ({ hreflang: lang, href: absoluteUrl(`${blogIndexPath(lang)}/`) })),
  { hreflang: "x-default", href: absoluteUrl(`${blogIndexPath(DEFAULT_LANG)}/`) },
]

const lastmodOf = (list: BlogPost[]) => list[0] && (list[0].updated ?? list[0].date)

const entries: {
  url: string
  lastmod?: string
  alternates?: { hreflang: string; href: string }[]
}[] = [
  ...["/", ...ALL_PAGES.map((page) => page.href)].map((href) => ({ url: absoluteUrl(href) })),
  ...BLOG_LANGS.map((lang) => ({
    url: absoluteUrl(`${blogIndexPath(lang)}/`),
    lastmod: lastmodOf(postsIn(lang)),
    alternates: indexAlternates,
  })),
  ...posts.map((post) => ({
    url: postUrl(post),
    lastmod: post.updated ?? post.date,
    alternates: alternatesOf(post),
  })),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    ({ url, lastmod, alternates = [] }) =>
      `  <url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${alternates
        .map(
          ({ hreflang, href }) =>
            `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`
        )
        .join("")}</url>`
  )
  .join("\n")}
</urlset>
`

/**
 * One Atom feed per language, next to the index it mirrors: `blog/feed.xml`
 * for English, `blog/fr/feed.xml` for French.
 */
function atomFeed(lang: BlogLang): { path: string; xml: string } {
  const list = postsIn(lang)
  const index = absoluteUrl(`${blogIndexPath(lang)}/`)
  const path = `${blogIndexPath(lang).slice(1)}/feed.xml`
  const feedUrl = `${SITE_ORIGIN}${BASE}${path}`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${escapeHtml(BLOG_COPY[lang].title)}</title>
  <id>${index}</id>
  <link rel="alternate" type="text/html" href="${index}"/>
  <link rel="self" type="application/atom+xml" href="${feedUrl}"/>
  <updated>${list[0] ? `${list[0].updated ?? list[0].date}T00:00:00Z` : new Date().toISOString()}</updated>
  <author><name>Hermez</name><uri>${SITE_ORIGIN}</uri></author>
${list
  .map((post) => {
    const url = postUrl(post)
    const content = renderMarkdown(post.body, { base: BASE })
    return `  <entry>
    <title>${escapeHtml(post.title)}</title>
    <id>${url}</id>
    <link rel="alternate" type="text/html" href="${url}"/>
    <published>${post.date}T00:00:00Z</published>
    <updated>${post.updated ?? post.date}T00:00:00Z</updated>
    <summary>${escapeHtml(post.description)}</summary>
${post.tags.map((tag) => `    <category term="${escapeHtml(tag)}"/>`).join("\n")}
    <content type="html">${escapeHtml(content)}</content>
  </entry>`
  })
  .join("\n")}
</feed>
`
  return { path, xml }
}

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}${BASE}sitemap.xml
`

const SUMMARY =
  "The back office of your REST API, generated from a declaration: lists, detail pages, forms and filters. Documentation for react-resource-view and for react-data-form, the form engine it is built on."

const llms = `# react-resource-view

> ${SUMMARY}

## Machine-readable

- [llms-full.txt](${SITE_ORIGIN}${BASE}llms-full.txt): every page below in one Markdown file, code samples included
- [API reference](${SITE_ORIGIN}${BASE}api/index.md): every export of react-resource-view with its exact types, generated from the published .d.ts

${SECTIONS.map(
  (section) => `## ${section.pkg}

${section.groups
  .flatMap((group) => group.pages)
  .map((page) => `- [${page.title}](${absoluteUrl(page.href)}): ${page.summary}`)
  .join("\n")}`
).join("\n\n")}
`

/**
 * The text of every page, in navigation order. Read back from the prerendered
 * HTML rather than from the route files, so the code samples are the ones the
 * reader sees. Each page keeps its own headings, shifted under the page's
 * title.
 */
function pageMarkdown(href: string): string {
  const html = readFileSync(join(OUT_DIR, href, "index.html"), "utf8")
  const start = html.indexOf('<div class="prose-docs')
  const end = html.lastIndexOf('<nav class="mt-16')
  if (start === -1 || end < start) {
    throw new Error(`llms-full.txt: no article body found in ${href}`)
  }
  return htmlToMarkdown(html.slice(start, end), { origin: SITE_ORIGIN })
}

const llmsFull = `# react-resource-view

> ${SUMMARY}

${SECTIONS.map((section) =>
  section.groups
    .flatMap((group) => group.pages)
    .map(
      (page) => `---

# ${section.pkg}: ${page.title}

Source: ${absoluteUrl(page.href)}

${page.summary}

${pageMarkdown(page.href)}`
    )
    .join("\n\n")
).join("\n\n")}
`

writeFileSync(join(OUT_DIR, "sitemap.xml"), sitemap)
for (const lang of BLOG_LANGS) {
  const { path, xml } = atomFeed(lang)
  writeFileSync(join(OUT_DIR, path), xml)
}
writeFileSync(join(OUT_DIR, "robots.txt"), robots)
writeFileSync(join(OUT_DIR, "llms.txt"), llms)
writeFileSync(join(OUT_DIR, "llms-full.txt"), llmsFull)

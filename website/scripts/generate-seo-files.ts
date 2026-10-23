import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { ALL_PAGES, SECTIONS } from "../src/lib/navigation.ts"
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

const urls = ["/", ...ALL_PAGES.map((page) => page.href)].map(absoluteUrl)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`

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
writeFileSync(join(OUT_DIR, "robots.txt"), robots)
writeFileSync(join(OUT_DIR, "llms.txt"), llms)
writeFileSync(join(OUT_DIR, "llms-full.txt"), llmsFull)

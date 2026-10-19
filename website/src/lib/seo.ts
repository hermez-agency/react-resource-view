import type { DocPage, DocSection } from "@/lib/navigation"
import { stripTrailingSlash } from "@/lib/navigation"

/** The domain the site is actually reachable at — GitHub Pages only hosts it. */
export const SITE_ORIGIN = "https://hermez.dev"

/** The host GitHub Pages publishes the build on, behind hermez.dev. */
const PAGES_HOST = "hermez-agency.github.io"

/**
 * Sends a reader who lands on the GitHub Pages address to the same page on
 * hermez.dev — path, query string and anchor included.
 *
 * GitHub Pages cannot answer with a 301, and a `<meta http-equiv="refresh">`
 * is not an option either: hermez.dev is a proxy that fetches these very
 * pages from GitHub Pages (`deploy/traefik/github-pages.yml` in the portfolio
 * repository), so an unconditional redirect would follow the reader there and
 * loop. Only the browser knows which host it is on, hence a script, blocking
 * and first in `<head>` so nothing renders before it leaves. Crawlers run it
 * too and read it as a redirect, on top of the canonical every page carries.
 */
export const PAGES_REDIRECT_SCRIPT = `
if (location.hostname === ${JSON.stringify(PAGES_HOST)}) {
  location.replace(${JSON.stringify(SITE_ORIGIN)} + location.pathname + location.search + location.hash);
}
`

const AUTHOR = { "@type": "Organization", name: "Hermez", url: SITE_ORIGIN }

/**
 * An absolute, canonical URL for a path served under the site's base.
 *
 * `import.meta.env.BASE_URL` already carries the `/<repository>/` prefix
 * GitHub Pages serves a project site under (see vite.config.ts), so building
 * the canonical from it is what keeps it correct in both dev and production
 * without a second constant to fall out of sync. It ends with a slash, like
 * the URL GitHub Pages serves the page at.
 */
export function canonicalUrl(pathname: string): string {
  const path = stripTrailingSlash(pathname)
  const suffix = path === "/" ? "" : `${path.slice(1)}/`
  return `${SITE_ORIGIN}${import.meta.env.BASE_URL}${suffix}`
}

/** The image every page falls back to for Open Graph and Twitter Card. */
export function defaultOgImageUrl(): string {
  return `${SITE_ORIGIN}${import.meta.env.BASE_URL}og-react-resource-view.png`
}

/** Structured data for a documentation page — read by crawlers, not readers. */
export function techArticleJsonLd(
  page: DocPage,
  section: DocSection,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.summary,
    url,
    inLanguage: "en",
    about: section.pkg,
    author: AUTHOR,
    publisher: AUTHOR,
    isPartOf: {
      "@type": "SoftwareSourceCode",
      name: section.pkg,
      codeRepository: section.repository,
    },
  }
}

/** Structured data for the packages the landing page introduces. */
export function softwareSourceCodeJsonLd(section: DocSection) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: section.pkg,
    description: section.tagline,
    codeRepository: section.repository,
    programmingLanguage: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
    author: AUTHOR,
  }
}

/** Structured data for the one-minute tour the landing page opens with. */
export function tourVideoJsonLd() {
  const videos = `${SITE_ORIGIN}${import.meta.env.BASE_URL}videos/`

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Two libraries, one idea: react-data-form and react-resource-view",
    description:
      "A one-minute tour: react-data-form builds complex forms from a plain object, react-resource-view builds a whole CRUD application from one resource declaration, and together they make a page builder.",
    thumbnailUrl: `${videos}two-libraries-poster.jpg`,
    contentUrl: `${videos}two-libraries.mp4`,
    uploadDate: "2026-09-29",
    duration: "PT58S",
    inLanguage: "en",
    author: AUTHOR,
  }
}

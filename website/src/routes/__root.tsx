import type { ReactNode } from "react"
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { Footer } from "@/components/Footer"
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle"
import { configureLibraries } from "@/demo/setup"
import { findPage, findSection, SECTIONS, stripTrailingSlash } from "@/lib/navigation"
import {
  canonicalUrl,
  defaultOgImageUrl,
  PAGES_REDIRECT_SCRIPT,
  softwareSourceCodeJsonLd,
  techArticleJsonLd,
  tourVideoJsonLd,
} from "@/lib/seo"
import appCss from "@/styles/app.css?url"

// Both libraries are configured through module-level singletons, so this has to
// run before the first component of either is rendered — on the server as well
// as in the browser.
configureLibraries()

const TITLE = "react-resource-view — The back office of your REST API, generated from a declaration"
const DESCRIPTION =
  "Documentation for react-resource-view, the back office of your REST API generated from a declaration, and for react-data-form, the form engine it is built on."

export const Route = createRootRoute({
  // Every match down to the leaf page is available here, so the canonical URL
  // and the structured data are worked out once, from the page the reader is
  // actually on, instead of being repeated — and possibly forgotten — in each
  // route file.
  head: (ctx) => {
    const pathname = stripTrailingSlash(ctx.matches.at(-1)?.pathname ?? "/")
    const canonical = canonicalUrl(pathname)
    const ogImage = defaultOgImageUrl()
    const page = findPage(pathname)
    const section = findSection(pathname)

    // The page-specific <title>/description are set by each route's own
    // `head()`, which wins over these — but Open Graph and Twitter Card have
    // no such per-route entry today, so they are worked out here from the
    // same navigation data the sidebar and the pager already read.
    const ogTitle = page && section ? `${page.title} — ${section.pkg}` : TITLE
    const ogDescription = page ? page.summary : DESCRIPTION

    const jsonLd =
      pathname === "/"
        ? [...SECTIONS.map(softwareSourceCodeJsonLd), tourVideoJsonLd()]
        : page && section
          ? [techArticleJsonLd(page, section, canonical)]
          : []

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
        { name: "theme-color", content: "#e46212" },
      ],
      links: [
        { rel: "canonical", href: canonical },
        { rel: "stylesheet", href: appCss },
        // BASE_URL already ends in a slash, and carries the /<repository>/ prefix
        // GitHub Pages serves a project site under.
        {
          rel: "icon",
          href: `${import.meta.env.BASE_URL}favicon.ico`,
          sizes: "32x32",
        },
        {
          rel: "icon",
          href: `${import.meta.env.BASE_URL}rrv-symbol.svg`,
          type: "image/svg+xml",
        },
        {
          rel: "apple-touch-icon",
          href: `${import.meta.env.BASE_URL}rrv-symbol-180.png`,
        },
      ],
      scripts: [
        {
          src: "https://umami.cardona.digital/nx.js",
          defer: true,
          "data-website-id": "fd583ba3-6e0f-47f6-9bb9-ae3e0d7f5d3c",
          "data-domains": "hermez.dev",
        },
        ...jsonLd.map((entry) => ({
          type: "application/ld+json",
          children: JSON.stringify(entry),
        })),
      ],
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First, and blocking: a reader on github.io leaves before anything paints. */}
        <script dangerouslySetInnerHTML={{ __html: PAGES_REDIRECT_SCRIPT }} />
        <HeadContent />
        {/* Blocking on purpose: the theme has to be settled before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        {children}
        <Footer />
        <Scripts />
      </body>
    </html>
  )
}

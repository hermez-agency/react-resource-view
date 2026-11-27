import { ArticleCard } from "@/ui/article"
import { coverFor, postsIn, type BlogLang } from "@/lib/blog"
import { BLOG_COPY, BLOG_LANGS, blogIndexPath, DEFAULT_LANG } from "@/lib/blogPost"
import {
  blogJsonLd,
  breadcrumbJsonLd,
  canonicalUrl,
  defaultOgImageUrl,
  SITE_ORIGIN,
} from "@/lib/seo"

/** The URL of the blog's index in `lang`, under the site's base, with its trailing slash. */
function indexHref(lang: BlogLang): string {
  return `${import.meta.env.BASE_URL}${blogIndexPath(lang).slice(1)}/`
}

/** The Atom feed of the articles in `lang`: `blog/feed.xml`, `blog/fr/feed.xml`. */
export function feedUrl(lang: BlogLang): string {
  return `${SITE_ORIGIN}${indexHref(lang)}feed.xml`
}

/**
 * The `<head>` of the blog's index in one language: its own description,
 * `og:locale`, the feed of that language and a `hreflang` link per language,
 * `x-default` on the English one.
 */
export function blogIndexHead(lang: BlogLang) {
  const copy = BLOG_COPY[lang]
  const url = canonicalUrl(blogIndexPath(lang))
  const ogImage = defaultOgImageUrl()

  return {
    meta: [
      { title: copy.title },
      { name: "description", content: copy.description },
      { property: "og:title", content: copy.title },
      { property: "og:description", content: copy.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: copy.locale },
      ...BLOG_LANGS.filter((other) => other !== lang).map((other) => ({
        property: "og:locale:alternate",
        content: BLOG_COPY[other].locale,
      })),
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: copy.title },
      { name: "twitter:description", content: copy.description },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      {
        rel: "alternate",
        type: "application/atom+xml",
        title: copy.title,
        href: feedUrl(lang),
      },
      ...BLOG_LANGS.map((other) => ({
        rel: "alternate",
        hrefLang: other,
        href: canonicalUrl(blogIndexPath(other)),
      })),
      { rel: "alternate", hrefLang: "x-default", href: canonicalUrl(blogIndexPath(DEFAULT_LANG)) },
    ],
    scripts: [
      blogJsonLd(copy.title, copy.description, url, lang),
      breadcrumbJsonLd([
        { name: "React Resource View", url: canonicalUrl("/") },
        { name: "Blog", url },
      ]),
    ].map((entry) => ({ type: "application/ld+json", children: JSON.stringify(entry) })),
  }
}

/** The list of the articles written in `lang`, and the switch to the other languages. */
export function BlogIndex({ lang }: { lang: BlogLang }) {
  const copy = BLOG_COPY[lang]

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
      <header className="pt-12 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl leading-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Blog
          </h1>
          <nav aria-label="Language" data-slot="blog-languages" className="flex gap-1 text-sm">
            {BLOG_LANGS.map((other) => (
              <a
                key={other}
                href={indexHref(other)}
                hrefLang={other}
                lang={other}
                aria-current={other === lang ? "page" : undefined}
                className="rounded-md border border-transparent px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-border aria-[current=page]:bg-card aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                {BLOG_COPY[other].name}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {postsIn(lang).map((post) => {
          const cover = coverFor(post)
          return (
            <li key={post.slug} className="flex">
              <ArticleCard
                className="w-full"
                href={`${import.meta.env.BASE_URL}blog/${post.slug}/`}
                image={cover.src}
                imageSvg={cover.svg}
                imageSources={cover.sources}
                imageAlt={cover.alt}
                product="React Resource View"
                title={post.title}
                date={post.date}
                minutes={post.minutes}
                lang={post.lang}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

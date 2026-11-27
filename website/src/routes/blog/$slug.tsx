import { createFileRoute, notFound } from "@tanstack/react-router"
import {
  Article,
  ArticleCard,
  ArticleFigure,
  ArticleFooter,
  ArticleHeader,
} from "@/ui/article"
import {
  coverFor,
  findPost,
  postsIn,
  renderPost,
  shareImageUrl,
  translationsFor,
  type BlogPost as Post,
} from "@/lib/blog"
import { BLOG_COPY, blogIndexPath, DEFAULT_LANG } from "@/lib/blogPost"
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  canonicalUrl,
} from "@/lib/seo"

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = findPost(params.slug)
    if (!post) throw notFound()
    // Read by the root route: `<html lang>` follows the article, not the path.
    return { lang: post.lang }
  },
  head: ({ params }) => {
    const post = findPost(params.slug)
    if (!post) return {}

    const url = canonicalUrl(`/blog/${post.slug}`)
    const title = `${post.title} — React Resource View`
    const image = shareImageUrl(post)
    const translations = translationsFor(post)
    // Every version of the article names all of them, itself included; the
    // English one is `x-default`, or this one when there is no English yet.
    const versions = [post, ...translations]
    const fallback = versions.find((version) => version.lang === DEFAULT_LANG) ?? post

    return {
      meta: [
        { title },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: BLOG_COPY[post.lang].locale },
        ...translations.map((other) => ({
          property: "og:locale:alternate",
          content: BLOG_COPY[other.lang].locale,
        })),
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "article:published_time", content: post.date },
        { property: "article:modified_time", content: post.updated ?? post.date },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { name: "twitter:image", content: image },
      ],
      links:
        translations.length > 0
          ? [
              ...versions.map((version) => ({
                rel: "alternate",
                hrefLang: version.lang,
                href: postUrl(version),
              })),
              { rel: "alternate", hrefLang: "x-default", href: postUrl(fallback) },
            ]
          : [],
      scripts: [
        blogPostingJsonLd({ ...post, url, image }),
        breadcrumbJsonLd([
          { name: "React Resource View", url: canonicalUrl("/") },
          { name: "Blog", url: canonicalUrl(blogIndexPath(post.lang)) },
          { name: post.title, url },
        ]),
      ].map((entry) => ({ type: "application/ld+json", children: JSON.stringify(entry) })),
    }
  },
  component: BlogPost,
})

function postUrl(post: Post): string {
  return canonicalUrl(`/blog/${post.slug}`)
}

function BlogPost() {
  const { slug } = Route.useParams()
  const post = findPost(slug)
  if (!post) return null

  const base = import.meta.env.BASE_URL
  const cover = coverFor(post)
  const copy = BLOG_COPY[post.lang]
  const others = postsIn(post.lang)
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3)
  const translation = translationsFor(post)[0]

  return (
    <div className="mx-auto max-w-5xl">
      {/*
        Three articles rather than one: the body is an HTML string, and
        `Article` styles its direct children, so it has to be the element the
        string is set on. Each one is the same reading column.
      */}
      <Article className="pb-0">
        <ArticleHeader
          product="React Resource View"
          icon={`${base}rrv-symbol.svg`}
          category={post.tags[0]}
          title={post.title}
          lead={post.description}
          date={post.date}
          minutes={post.minutes}
          lang={post.lang}
          translation={
            translation && {
              href: `${base}blog/${translation.slug}/`,
              label: BLOG_COPY[translation.lang].readIn,
              lang: translation.lang,
            }
          }
        />

        {(cover.sources || post.cover) && (
          <ArticleFigure wide src={cover.src} svg={cover.svg} sources={cover.sources} alt={cover.alt} />
        )}
      </Article>

      <Article className="pb-0" dangerouslySetInnerHTML={{ __html: renderPost(post) }} />

      <Article>
        <ArticleFooter tags={post.tags} lang={post.lang} />

        {others.length > 0 && (
          <section data-width="wide" className="mt-16 px-0">
            <h2 className="text-xl">{copy.readNext}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {others.map((other) => {
                const otherCover = coverFor(other)
                return (
                  <ArticleCard
                    key={other.slug}
                    href={`${base}blog/${other.slug}/`}
                    image={otherCover.src}
                    imageSvg={otherCover.svg}
                    imageSources={otherCover.sources}
                    imageAlt={otherCover.alt}
                    product="React Resource View"
                    title={other.title}
                    date={other.date}
                    minutes={other.minutes}
                    lang={other.lang}
                  />
                )
              })}
            </div>
          </section>
        )}
      </Article>
    </div>
  )
}

import { createFileRoute, notFound } from "@tanstack/react-router"
import {
  Article,
  ArticleCard,
  ArticleFigure,
  ArticleFooter,
  ArticleHeader,
} from "@/ui/article"
import { coverPath, findPost, POSTS, renderPost } from "@/lib/blog"
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  canonicalUrl,
  SITE_ORIGIN,
} from "@/lib/seo"

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    if (!findPost(params.slug)) throw notFound()
  },
  head: ({ params }) => {
    const post = findPost(params.slug)
    if (!post) return {}

    const url = canonicalUrl(`/blog/${post.slug}`)
    const title = `${post.title} — React Resource View`
    const cover = coverPath(post)
    const image = /^https?:\/\//.test(cover) ? cover : `${SITE_ORIGIN}${cover}`

    return {
      meta: [
        { title },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "article:published_time", content: post.date },
        { property: "article:modified_time", content: post.updated ?? post.date },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { name: "twitter:image", content: image },
      ],
      scripts: [
        blogPostingJsonLd({ ...post, url, image }),
        breadcrumbJsonLd([
          { name: "React Resource View", url: canonicalUrl("/") },
          { name: "Blog", url: canonicalUrl("/blog") },
          { name: post.title, url },
        ]),
      ].map((entry) => ({ type: "application/ld+json", children: JSON.stringify(entry) })),
    }
  },
  component: BlogPost,
})

function BlogPost() {
  const { slug } = Route.useParams()
  const post = findPost(slug)
  if (!post) return null

  const base = import.meta.env.BASE_URL
  const others = POSTS.filter((other) => other.slug !== post.slug).slice(0, 3)

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
        />

        {post.cover && <ArticleFigure wide src={coverPath(post)} alt="" />}
      </Article>

      <Article className="pb-0" dangerouslySetInnerHTML={{ __html: renderPost(post) }} />

      <Article>
        <ArticleFooter tags={post.tags} />

        {others.length > 0 && (
          <section data-width="wide" className="mt-16 px-0">
            <h2 className="text-xl">À lire aussi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {others.map((other) => (
                <ArticleCard
                  key={other.slug}
                  href={`${base}blog/${other.slug}/`}
                  image={coverPath(other)}
                  product="React Resource View"
                  title={other.title}
                  date={other.date}
                  minutes={other.minutes}
                />
              ))}
            </div>
          </section>
        )}
      </Article>
    </div>
  )
}

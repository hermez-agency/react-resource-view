import { createFileRoute } from "@tanstack/react-router"
import { ArticleCard } from "@/ui/article"
import { coverPath, POSTS } from "@/lib/blog"
import {
  blogJsonLd,
  breadcrumbJsonLd,
  canonicalUrl,
  defaultOgImageUrl,
  SITE_ORIGIN,
} from "@/lib/seo"

const TITLE = "Blog — React Resource View"
const DESCRIPTION =
  "Des articles sur React Resource View : générer le back-office d'une API REST à partir d'une déclaration, ses vues, ses formulaires et ses backends."

export const Route = createFileRoute("/blog/")({
  head: () => {
    const url = canonicalUrl("/blog")
    const ogImage = defaultOgImageUrl()

    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        {
          rel: "alternate",
          type: "application/atom+xml",
          title: "Blog — React Resource View",
          href: `${SITE_ORIGIN}${import.meta.env.BASE_URL}blog/feed.xml`,
        },
      ],
      scripts: [
        blogJsonLd("Blog — React Resource View", DESCRIPTION, url),
        breadcrumbJsonLd([
          { name: "React Resource View", url: canonicalUrl("/") },
          { name: "Blog", url },
        ]),
      ].map((entry) => ({ type: "application/ld+json", children: JSON.stringify(entry) })),
    }
  },
  component: BlogIndex,
})

function BlogIndex() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
      <header className="pt-12 sm:pt-16">
        <h1 className="text-3xl leading-tight text-balance sm:text-5xl sm:leading-[1.1]">Blog</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          {DESCRIPTION}
        </p>
      </header>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((post) => (
          <li key={post.slug} className="flex">
            <ArticleCard
              className="w-full"
              href={`${import.meta.env.BASE_URL}blog/${post.slug}/`}
              image={coverPath(post)}
              product="React Resource View"
              title={post.title}
              date={post.date}
              minutes={post.minutes}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

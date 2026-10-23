import { configurePorts, createViewResource, layout } from "react-resource-view"

export interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
  author: string
  published: boolean
}

const ARTICLES: Article[] = [
  {
    "@id": "/api/articles/1",
    "@type": "Article",
    id: "1",
    title: "Describing a form as data",
    author: "Ada",
    published: true,
  },
  {
    "@id": "/api/articles/2",
    "@type": "Article",
    id: "2",
    title: "Reading an IRI without thinking about it",
    author: "Grace",
    published: true,
  },
  {
    "@id": "/api/articles/3",
    "@type": "Article",
    id: "3",
    title: "Why a deep path 404s on static hosting",
    author: "Ada",
    published: false,
  },
  {
    "@id": "/api/articles/4",
    "@type": "Article",
    id: "4",
    title: "One registry, or none at all",
    author: "Alan",
    published: false,
  },
]

/**
 * Puts every link the views build into the query string, aimed at this very
 * file. On GitHub Pages there is no server to answer `/demo/articles/read/2`,
 * so the context travels as `demo.html?view=…` instead.
 */
export function configureDemoRouting(basePath: string): void {
  configurePorts({
    routing: { mode: "query", param: "view", basePath },
    appName: "react-resource-view",
    description:
      "CRUD views for REST APIs — API Platform, Strapi, Supabase, FastAPI.",
  })
}

export const articlesResource = createViewResource<Article>("demo_articles", {
  name: "Articles",
  // No `path`: the records live in the browser, starting from `ARTICLES`.
  storage: { type: "local", seed: ARTICLES },
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
      published: { label: "Published", type: "checkbox" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [
        layout.table({ fields: ["title", "author", "published"] }),
        layout.cards({ columns: 3 }),
      ],
    },
  },
})

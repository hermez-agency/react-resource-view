import { afterEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { ListComponentPropsInterface } from "@/ViewResource"

/**
 * A list offering several layouts: clicking a tab must swap the rendered
 * layout, and the choice must survive whatever the list is fetching at that
 * moment.
 */
interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
}

const ARTICLES: Article[] = [
  { "@id": "/api/articles/1", "@type": "Article", id: "1", title: "First article" },
]

const COLLECTION = {
  "@id": "variant_articles",
  "@type": "Collection",
  member: ARTICLES,
  totalItems: ARTICLES.length,
}

function AlphaList({ rows = [] }: ListComponentPropsInterface) {
  return <div data-testid="alpha">alpha: {rows.length}</div>
}

function BetaList({ rows = [] }: ListComponentPropsInterface) {
  return <div data-testid="beta">beta: {rows.length}</div>
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fetch time is what opens the window in which a user picks another layout. */
function createArticleResource(id: string, fetchDelay: number) {
  return createViewResource<Article>(id, {
    name: "Articles",
    storage: "local",
    repository: {
      getCollection: async () => {
        await wait(fetchDelay)
        return { data: COLLECTION }
      },
    },
    views: {
      list: {
        layouts: [
          layout.custom({ type: "alpha", components: { list: AlphaList } }),
          layout.custom({ type: "beta", components: { list: BetaList } }),
        ],
      },
    },
  })
}

const instantResource = createArticleResource("variant_articles", 0)
const slowResource = createArticleResource("slow_variant_articles", 150)

function renderList(resourceId: string) {
  return render(
    <ResourceViewProvider
      viewResourceContextParams={{ scope: "demo", resourceId }}
      configuration={{
        resources: [instantResource, slowResource],
        defaultScope: "demo",
      }}
    />
  )
}

afterEach(() => {
  localStorage.clear()
  window.history.replaceState({}, "", "/")
})

describe("switching the layout of a list", () => {
  it("renders the first variant, then the one the user picks", async () => {
    const user = userEvent.setup()
    renderList("variant_articles")

    await waitFor(() => {
      expect(screen.getByTestId("alpha")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: "Beta" }))

    await waitFor(() => {
      expect(screen.getByTestId("beta")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("alpha")).toBeNull()

    await user.click(screen.getByRole("tab", { name: "Alpha" }))

    await waitFor(() => {
      expect(screen.getByTestId("alpha")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("beta")).toBeNull()
  })

  it("marks the tab of the layout on screen as the selected one", async () => {
    const user = userEvent.setup()
    renderList("variant_articles")

    await waitFor(() => {
      expect(screen.getByTestId("alpha")).toBeInTheDocument()
    })
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "true"
    )

    await user.click(screen.getByRole("tab", { name: "Beta" }))

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    })
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "false"
    )
  })

  // The regression this file was written for: a list that fetches — on mount,
  // through Mercure or on a filter change — used to overwrite the whole view
  // context with the one captured before the request, so a layout picked while
  // a request was in flight was reverted a few milliseconds later.
  it("keeps the layout picked while a request is in flight", async () => {
    const user = userEvent.setup()
    renderList("slow_variant_articles")

    // The tabs render before the rows: the choice happens during the fetch,
    // not after it.
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Beta" })).toBeInTheDocument()
    })
    expect(screen.queryByTestId("alpha")).toBeNull()

    await user.click(screen.getByRole("tab", { name: "Beta" }))

    await waitFor(() => {
      expect(screen.getByTestId("beta")).toBeInTheDocument()
    })

    // The in-flight request lands here, with the rows it went to fetch.
    await waitFor(() => {
      expect(screen.getByTestId("beta")).toHaveTextContent("beta: 1")
    })
    expect(screen.queryByTestId("alpha")).toBeNull()
  })

  it("writes the picked layout into the URL, and a reload lands on it", async () => {
    const user = userEvent.setup()
    const first = renderList("variant_articles")

    await waitFor(() => {
      expect(screen.getByTestId("alpha")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("tab", { name: "Beta" }))

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("variant")).toBe("beta")
    })

    // A reload: a fresh mount reading the URL it is given.
    first.unmount()
    renderList("variant_articles")

    await waitFor(() => {
      expect(screen.getByTestId("beta")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("alpha")).toBeNull()
  })
})

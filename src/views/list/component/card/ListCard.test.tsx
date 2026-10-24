import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import type { ListViewDefinition } from "@/ResourceDefinition"

/**
 * A grid of cards frames every record and puts the row's actions under it. A
 * row component drawing its own card got a second frame around the first:
 * `frame: false` draws it on its own, and `actions` says whether the actions
 * come with it.
 */
interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
}

const ARTICLES: Article[] = ["Roast", "Pack"].map((title, index) => ({
  "@id": `/api/articles/${index + 1}`,
  "@type": "Article",
  id: String(index + 1),
  title,
}))

// A row of one's own, card included.
const Row = ({ row }: { row?: { data: Article } }) => (
  <article data-testid="own-card">{row?.data.title}</article>
)

let counter = 0

function renderCards(list: ListViewDefinition<Article>) {
  const id = `cards_${++counter}`
  const articles = createViewResource<Article>(id, {
    name: "Articles",
    storage: "local",
    repository: {
      getCollection: async () => ({
        data: {
          "@id": "/api/articles",
          "@type": "Collection",
          member: ARTICLES,
          totalItems: ARTICLES.length,
        } as any,
      }),
    },
    form: { inputs: { title: { label: "Title" } } },
    views: { list },
  })

  render(
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: id,
        resourceId: id,
        resourceAction: ActionList.list,
      }}
      configuration={{ resources: [articles], defaultScope: id }}
    />
  )
}

/** The element `RecordCard` draws around the row component. */
const frameOf = (card: HTMLElement) => card.parentElement!.parentElement!

describe("a grid of cards", () => {
  it("frames each record and puts its actions under it, by default", async () => {
    renderCards({ layouts: [layout.cards({ components: { row: Row } })] })

    const [card] = await screen.findAllByTestId("own-card")
    expect(frameOf(card)).toHaveClass("border", "p-4")
    expect(frameOf(card).querySelector(".border-t")).not.toBeNull()
  })

  it("draws the row component on its own with `frame: false`", async () => {
    renderCards({
      layouts: [layout.cards({ frame: false, components: { row: Row } })],
    })

    const [card] = await screen.findAllByTestId("own-card")
    const frame = frameOf(card)
    expect(frame).not.toHaveClass("border")
    expect(frame).not.toHaveClass("p-4")
    expect(frame).not.toHaveClass("bg-card")
    // No actions either: a row drawing its own card has its own buttons.
    expect(frame.children).toHaveLength(1)
  })

  it("keeps the actions without a frame when `actions` asks for them", async () => {
    renderCards({
      layouts: [
        layout.cards({ frame: false, actions: true, components: { row: Row } }),
      ],
    })

    const [card] = await screen.findAllByTestId("own-card")
    const frame = frameOf(card)
    expect(frame.children).toHaveLength(2)
    // The separator belonged to the frame.
    expect(frame.querySelector(".border-t")).toBeNull()
  })

  it("leaves the actions out of a frame with `actions: false`", async () => {
    renderCards({
      layouts: [layout.cards({ actions: false, components: { row: Row } })],
    })

    const [card] = await screen.findAllByTestId("own-card")
    expect(frameOf(card)).toHaveClass("border")
    expect(frameOf(card).children).toHaveLength(1)
  })

  it("still selects records without a frame", async () => {
    renderCards({
      layouts: [layout.cards({ frame: false, components: { row: Row } })],
      selectable: true,
    })

    const [card] = await screen.findAllByTestId("own-card")
    fireEvent.click(screen.getAllByRole("checkbox", { name: /^Select/ })[0])
    expect(screen.getByRole("toolbar")).toHaveTextContent("1 selected")
    expect(frameOf(card)).toHaveClass("ring-2", "ring-primary")
  })
})

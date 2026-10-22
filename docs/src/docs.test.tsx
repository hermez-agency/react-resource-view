import { describe, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { configurePorts, parseLink, ResourceViewProvider } from "react-resource-view"
import { DocLayout } from "./DocLayout"
import { overviewResource, resources } from "./pages"
import { seedDemoData } from "./pages/demo"

/**
 * The site is built with the library it documents, so it is worth checking it
 * actually renders: a page that merely builds proves nothing.
 */
/** The scope-free configuration the site itself uses. */
const WAIT = { timeout: 5000 }

const renderAt = (url: string) => {
  configurePorts({ routing: { mode: "query", param: "view", basePath: "/" } })
  seedDemoData()
  const params = parseLink(url)

  return render(
    <ResourceViewProvider
      viewResourceContextParams={{
        resourceId: overviewResource["@id"] as string,
        resourceAction: ActionList.read,
        ...params,
        scope: "docs",
      }}
      configuration={{ resources, decoratorComponent: DocLayout }}
    />
  )
}

describe("the documentation site", () => {
  it("renders the overview by default", async () => {
    renderAt("/")
    expect(
      await screen.findByRole("heading", { name: "react-resource-view" }, WAIT)
    ).toBeInTheDocument()
  })

  it("renders the routing page from its URL", async () => {
    renderAt("/?view=docs/routing/read")
    expect(
      await screen.findByRole("heading", { name: "Routing" }, WAIT)
    ).toBeInTheDocument()
  })

  it("renders the navigation page and its slow navigation", async () => {
    renderAt("/?view=docs/navigation/read")
    expect(
      await screen.findByRole("heading", { name: "Navigation" }, WAIT)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^Slow/ }))
    expect(await screen.findByRole("progressbar", {}, WAIT)).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Projects" }, WAIT)
    ).toBeInTheDocument()
  })

  it("renders the layouts page from its URL", async () => {
    renderAt("/?view=docs/layouts/read")
    expect(
      await screen.findByRole("heading", { name: "Layouts" }, WAIT)
    ).toBeInTheDocument()
  })

  it("runs a tree, a map and a chart on their own page", async () => {
    renderAt("/?view=docs/tree-map-chart/read")
    expect(
      await screen.findByRole("heading", { name: "Tree, map and chart" }, WAIT)
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("treeitem", { name: "Design system" }, WAIT)
    ).toHaveAttribute("aria-level", "3")
    expect(
      await screen.findByRole("button", { name: "Rivoli" }, WAIT)
    ).toBeInTheDocument()
    expect(await screen.findAllByText("Total revenue", {}, WAIT)).not.toHaveLength(0)
  }, 15000)

  it("renders the actions page from its URL", async () => {
    renderAt("/?view=docs/actions/read")
    expect(
      await screen.findByRole("heading", { name: "Actions" }, WAIT)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Optimistic writes" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Acting on a selection" })
    ).toBeInTheDocument()
  })

  it("opens a record of the actions page in an accordion under its row", async () => {
    renderAt("/?view=docs/actions/read/demo_accordion/read/2")

    await screen.findByRole("region", { name: "Accordion" }, WAIT)
    // The row just above it is the record's.
    const title = "Reading an IRI without thinking about it"
    await waitFor(() => {
      const frame = screen.getByRole("region", { name: "Accordion" })
      const row = frame.closest("tr")!.previousElementSibling as HTMLElement
      expect(row.textContent).toContain(title)
    }, WAIT)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renders the admin layout page", async () => {
    renderAt("/?view=docs/admin-layout/read")
    expect(
      await screen.findByRole("heading", { name: "Admin layout" }, WAIT)
    ).toBeInTheDocument()
  })

  it("runs AdminLayout for real on its own live demo page", async () => {
    renderAt("/?view=docs/admin-layout-demo-page/read")
    expect(
      await screen.findByRole("heading", { name: "Admin layout, running" }, WAIT)
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("link", { name: "Articles" }, WAIT)
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("link", { name: "Users" }, WAIT)
    ).toBeInTheDocument()
  })

  it("renders the demo page", async () => {
    renderAt("/?view=docs/demo/read")
    expect(
      await screen.findByRole("heading", { name: "Live demo" }, WAIT)
    ).toBeInTheDocument()
  })

  it("runs a real resource inside the demo page", async () => {
    renderAt("/?view=docs/demo/read")
    // The demo embeds a resource through ViewResourceContextProvider, which
    // loads its rows from storage — the point being that it actually runs.
    expect(
      await screen.findByText("Describing a form as data", {}, WAIT)
    ).toBeInTheDocument()
  })

  it("builds a menu whose links carry the routing parameter", async () => {
    renderAt("/")
    const links = await screen.findAllByRole("link", { name: /Routing/ }, WAIT)
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("view="))
  })
})

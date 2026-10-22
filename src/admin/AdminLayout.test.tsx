import { afterEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, within } from "@testing-library/react"
import { createItemMenuWithResource, createViewResource, layout } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { AdminLayout, createAdminLayout } from "@/admin/AdminLayout"
import { ScopeInterface } from "@/scope/scopeInterface"
import { ViewResourceContextParams } from "@/ViewResourceContext"
import { ActionList } from "react-data-form"

/**
 * `AdminLayout` used as a scope's `decoratorComponent`: a ready-made admin
 * shell built from nothing but the scope's `menu`.
 */
interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
}

function ArticleList() {
  return <div data-testid="rows" />
}

const articlesResource = createViewResource<Article>("admin_articles", {
  name: "Articles",
  storage: "local",
  permissions: { create: false },
  repository: {
    getItem: async () => ({
      data: {
        "@id": "/api/articles/1",
        "@type": "Article",
        id: "1",
        title: "Describing a form as data",
      },
    }),
    getCollection: async () => ({
      data: {
        "@id": "admin_articles",
        "@type": "Collection",
        member: [],
        totalItems: 0,
      },
    }),
  },
  views: {
    list: { layouts: [layout.table({ components: { list: ArticleList } })] },
  },
})

const usersResource = createViewResource<Article>("admin_users", {
  name: "Users",
  storage: "local",
  repository: {
    getCollection: async () => ({
      data: {
        "@id": "admin_users",
        "@type": "Collection",
        member: [],
        totalItems: 0,
      },
    }),
  },
  views: {
    list: { layouts: [layout.table({ components: { list: ArticleList } })] },
  },
})

// A board: the one view of the scope that takes the page's whole width.
const tasksResource = createViewResource<Article>("admin_tasks", {
  name: "Tasks",
  storage: "local",
  repository: {
    getCollection: async () => ({
      data: {
        "@id": "admin_tasks",
        "@type": "Collection",
        member: [],
        totalItems: 0,
      },
    }),
  },
  fullWidth: true,
  views: {
    list: { layouts: [layout.table({ components: { list: ArticleList } })] },
  },
})

const adminScope: ScopeInterface = {
  name: "admin",
  label: "Back office",
  decoratorComponent: AdminLayout,
  resources: [articlesResource, usersResource, tasksResource],
  menu: [articlesResource, usersResource],
  defaultViewResourceContextParams: {
    resourceId: articlesResource["@id"],
  },
}

// `configuration.scopes` resolves the scope through `use()`, inside the
// `Suspense` boundary `ResourceViewProvider` sets up for that. Rendering
// outside `act` leaves that first suspend-and-resolve cycle unflushed.
async function renderAdmin(
  viewResourceContextParams?: ViewResourceContextParams,
  decoratorComponent?: ScopeInterface["decoratorComponent"]
) {
  let result!: ReturnType<typeof render>

  await act(async () => {
    result = render(
      <ResourceViewProvider
        viewResourceContextParams={viewResourceContextParams}
        configuration={{
          scopes: { admin: async () => adminScope },
          defaultScope: "admin",
          decoratorComponent,
        }}
      />
    )
  })

  return result
}

const helpMenu = [
  { name: "Documentation", href: "https://example.com/docs" },
  { name: "Contact", href: "mailto:support@example.com" },
  createItemMenuWithResource({ resource: usersResource, scope: "admin" }),
]

function mockNarrowScreen() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  )
}

describe("AdminLayout", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the scope's menu as navigation links, and the current view", async () => {
    await renderAdmin()

    expect(screen.getByRole("heading", { name: "Articles" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Articles" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument()
  })

  it("folds the sidebar away when the top bar button is pressed", async () => {
    // The regression this guards: the button only ever opened the mobile
    // drawer, so on the screen where it is shown — the wide one — pressing it
    // did nothing at all.
    await renderAdmin()

    const sidebar = document.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toHaveAttribute("data-state", "expanded")

    await act(async () => {
      screen.getByRole("button", { name: "Toggle sidebar" }).click()
    })

    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("swaps the sidebar for a bottom navigation bar on narrow screens", async () => {
    mockNarrowScreen()

    await renderAdmin()

    expect(screen.getByRole("heading", { name: "Articles" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Articles" })).toBeNull()
    // Found by its slot, and the page on screen said by its entry.
    const bar = document.querySelector(
      '[data-slot="admin-mobile-nav"]'
    ) as HTMLElement
    expect(within(bar).getByRole("button", { name: "Articles" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("names the record being edited, and leads back to its list", async () => {
    // The regression this guards: an edit page titled "Edit — Articles" and
    // nothing else, under a top bar with nothing in it — which record, and
    // how to get back, were left for the reader to work out.
    await renderAdmin({
      scope: "admin",
      resourceId: articlesResource["@id"],
      resourceAction: ActionList.update,
      id: "1",
    })

    expect(
      await screen.findByRole("heading", { name: "Describing a form as data" })
    ).toBeInTheDocument()
    expect(screen.getByText("Edit — Articles · #1")).toBeInTheDocument()

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(breadcrumb).toHaveTextContent("Back office")
    expect(breadcrumb).toHaveTextContent("Describing a form as data")

    const backLinks = screen
      .getAllByRole("link", { name: "Articles" })
      .filter((link) => link.getAttribute("href")?.includes("admin_articles/list"))
    // The one in the breadcrumb, and the one above the title.
    expect(backLinks.length).toBeGreaterThanOrEqual(2)

    expect(screen.getByRole("link", { name: "delete" })).toBeInTheDocument()
  })

  it("lets a view write its own title and actions", async () => {
    const view = articlesResource.views!.update!
    const components = view.components
    view.components = {
      ...components,
      title: () => <h2>Custom title</h2>,
      actions: () => <button>Publish</button>,
    }

    try {
      await renderAdmin({
        scope: "admin",
        resourceId: articlesResource["@id"],
        resourceAction: ActionList.update,
        id: "1",
      })

      expect(
        await screen.findByRole("heading", { name: "Custom title" })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "delete" })).toBeNull()
    } finally {
      view.components = components
    }
  })

  it("keeps views in a column, unless one asks for the whole width", async () => {
    await renderAdmin()

    const content = document.querySelector('[data-slot="admin-content"]')
    expect(content).toHaveClass("max-w-6xl")
    expect(content).not.toHaveAttribute("data-full-width")
  })

  it("gives the whole width to a view declared fullWidth", async () => {
    await renderAdmin({
      scope: "admin",
      resourceId: tasksResource["@id"],
      resourceAction: ActionList.list,
    })

    const content = document.querySelector('[data-slot="admin-content"]')
    expect(content).not.toHaveClass("max-w-6xl")
    expect(content).toHaveAttribute("data-full-width", "true")
    // The side margins stay.
    expect(content).toHaveClass("px-4")
  })

  it("renders no sidebar footer when none is given", async () => {
    await renderAdmin()

    expect(document.querySelector('[data-slot="sidebar-footer"]')).toBeNull()
    expect(screen.queryByRole("button", { name: "More" })).toBeNull()
  })

  it("pins the sidebarFooter at the bottom of the sidebar", async () => {
    await renderAdmin(
      undefined,
      createAdminLayout({
        sidebarFooter: <p>Plan: Pro</p>,
      })
    )

    const footer = document.querySelector('[data-slot="sidebar-footer"]')
    expect(footer).toHaveTextContent("Plan: Pro")
  })

  it("renders the footerMenu under its title, external links in a new tab", async () => {
    await renderAdmin(
      undefined,
      createAdminLayout({
        footerMenu: helpMenu,
        footerMenuTitle: "Need help?",
      })
    )

    const footer = document.querySelector('[data-slot="sidebar-footer"]')!
    expect(footer).toHaveTextContent("Need help?")

    const nav = screen.getByRole("navigation", { name: "Need help?" })
    expect(footer).toContainElement(nav)

    const docs = screen.getByRole("link", { name: "Documentation" })
    expect(docs).toHaveAttribute("href", "https://example.com/docs")
    expect(docs).toHaveAttribute("target", "_blank")
    expect(docs).toHaveAttribute("rel", "noopener noreferrer")

    const contact = screen.getByRole("link", { name: "Contact" })
    expect(contact).toHaveAttribute("href", "mailto:support@example.com")
    expect(contact).not.toHaveAttribute("target")

    // A page of the application stays a router link, in the same tab.
    const users = screen
      .getAllByRole("link", { name: "Users" })
      .find((link) => footer.contains(link))!
    expect(users.getAttribute("href")).toContain("admin_users")
    expect(users).not.toHaveAttribute("target")
  })

  it("lists the footerMenu behind a last entry of the bottom bar on narrow screens", async () => {
    mockNarrowScreen()

    await renderAdmin(
      undefined,
      createAdminLayout({
        footerMenu: helpMenu,
        footerMenuTitle: "Need help?",
      })
    )

    expect(screen.queryByRole("link", { name: "Documentation" })).toBeNull()

    await act(async () => {
      screen.getByRole("button", { name: "Need help?" }).click()
    })

    const docs = await screen.findByRole("link", { name: "Documentation" })
    expect(docs).toHaveAttribute("href", "https://example.com/docs")
    expect(docs).toHaveAttribute("target", "_blank")
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument()
  })
})

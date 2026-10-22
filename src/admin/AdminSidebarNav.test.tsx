import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { act, render, screen, within } from "@testing-library/react"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router"
import { createViewResource, parseLink, layout } from "@/index"
import { configurePorts, getPorts } from "@/ports"
import { tanstackAdapter } from "@/tanstack"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { AdminLayout } from "@/admin/AdminLayout"
import { ScopeInterface } from "@/scope/scopeInterface"
import { ActionList } from "react-data-form"

/**
 * Which sidebar entry is lit, read off the URL alone — the playground's
 * arrangement: TanStack Router, query mode, the context in `?view=`.
 */
interface Row {
  "@id": string
  "@type": string
  id: string
  name: string
}

const collection = (id: string) => async () => ({
  data: { "@id": id, "@type": "Collection", member: [], totalItems: 0 },
})

function crud(id: string, name: string) {
  return createViewResource<Row>(id, {
  name,
  storage: "local",
  permissions: { delete: false },
  repository: {
    getItem: async () => ({
      data: { "@id": `/api/${id}/1`, "@type": name, id: "1", name: "Ada" },
    }),
    getCollection: collection(id),
  },
  views: {
    list: { layouts: [layout.table({ components: { list: () => <div /> } })] },
  },
})
}

const overviewResource = createViewResource<Row>("admin_overview", { name: "Overview", components: { view: () => <p>At a glance</p> } })
const usersResource = crud("admin_users", "Users")
const postsResource = crud("admin_posts", "Posts")
const commentsResource = crud("admin_comments", "Comments")

// Built when the scope loads, as a lazily imported scope would be: the menu's
// links are written in whichever routing mode is configured at that point.
const loadAdminScope = async (): Promise<ScopeInterface> => ({
  name: "admin",
  label: "Back office",
  decoratorComponent: AdminLayout,
  resources: [overviewResource, usersResource, postsResource, commentsResource],
  defaultViewResourceContextParams: {
    resourceId: overviewResource["@id"],
    resourceAction: ActionList.list,
  },
  menu: [
    overviewResource,
    usersResource,
    {
      name: "Blog",
      items: [
        postsResource,
        commentsResource,
      ],
    },
    { name: "Inbox", href: "/inbox", badge: () => <>3</> },
  ],
})

const SCOPES = { admin: loadAdminScope }

function Playground() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr })

  return (
    <ResourceViewProvider
      viewResourceContextParams={parseLink(searchStr)}
      configuration={{ scopes: SCOPES, defaultScope: "admin" }}
    />
  )
}

async function renderAt(url: string) {
  const router = createRouter({
    routeTree: createRootRoute({ component: Playground }),
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  await act(async () => {
    render(<RouterProvider router={router} />)
  })

  return router
}

const sidebar = () =>
  within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

/** The entries marked as the current page, by name. */
const currentEntries = () =>
  sidebar()
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent)

const originalNavigation = getPorts().navigation

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  configurePorts({
    navigation: originalNavigation,
    routing: { mode: "path", param: "view", basePath: "" },
  })
})

describe("AdminSidebarNav, on TanStack Router", () => {
  beforeEach(() => {
    configurePorts({
      navigation: tanstackAdapter,
      routing: { mode: "query", param: "view", basePath: "/playground" },
    })
  })

  it.each([
    ["the list", "/playground?view=admin/admin_users/list"],
    // TanStack rewrites the parameter percent-encoded once it has parsed it.
    ["the list, encoded", "/playground?view=admin%2Fadmin_users%2Flist"],
    ["a record", "/playground?view=admin/admin_users/read/1"],
    ["an edit form", "/playground?view=admin/admin_users/update/1"],
    ["a creation form", "/playground?view=admin/admin_users/create"],
    [
      "another layout, filtered",
      "/playground?view=admin/admin_users/list&variant=cards&filter=%7B%7D",
    ],
  ])("lights the resource's entry on %s", async (_, url) => {
    await renderAt(url)

    expect(currentEntries()).toEqual(["Users"])
    expect(sidebar().getByRole("link", { name: "Users" })).toHaveAttribute(
      "data-active"
    )
    expect(sidebar().getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "data-active"
    )
  })

  it("draws an entry's badge at its end, inside its link", async () => {
    await renderAt("/playground?view=admin/admin_users/list")

    const inbox = sidebar().getByRole("link", { name: /^Inbox/ })
    expect(inbox.querySelector('[data-slot="sidebar-menu-badge"]')).toHaveTextContent(
      "3"
    )
  })

  it("lights the scope's default page when the URL names none", async () => {
    // The regression this guards: the playground opens on the overview, but
    // its URL says nothing of it — the menu then lit no entry at all.
    await renderAt("/playground")

    expect(screen.getByText("At a glance")).toBeInTheDocument()
    expect(currentEntries()).toEqual(["Overview"])
  })

  it("lights a sub-entry, and unfolds and marks its group", async () => {
    // The reader folded the group on an earlier visit.
    localStorage.setItem(
      "react-resource-view:admin-sidebar-open-groups",
      JSON.stringify({ Blog: false })
    )

    await renderAt("/playground?view=admin/admin_posts/update/1")

    expect(currentEntries()).toEqual(["Posts"])
    const group = sidebar().getByRole("button", { name: "Blog" })
    expect(group).toHaveAttribute("aria-expanded", "true")
    expect(group).toHaveAttribute("data-active-child")
    expect(group).not.toHaveAttribute("data-active")
  })

  it("moves the highlight with a click, and back with the history", async () => {
    const router = await renderAt("/playground?view=admin/admin_users/list")

    await act(async () => {
      sidebar().getByRole("link", { name: "Comments" }).click()
    })
    expect(currentEntries()).toEqual(["Comments"])
    expect(sidebar().getByRole("button", { name: "Blog" })).toHaveAttribute(
      "data-active-child"
    )

    await act(async () => {
      sidebar().getByRole("link", { name: "Overview" }).click()
    })
    expect(currentEntries()).toEqual(["Overview"])
    expect(sidebar().getByRole("button", { name: "Blog" })).not.toHaveAttribute(
      "data-active-child"
    )

    await act(async () => {
      router.history.back()
    })
    expect(currentEntries()).toEqual(["Comments"])

    await act(async () => {
      router.history.back()
    })
    expect(currentEntries()).toEqual(["Users"])

    await act(async () => {
      router.history.forward()
    })
    expect(currentEntries()).toEqual(["Comments"])
  })
})

describe("AdminSidebarNav, without a router", () => {
  // The fallback port navigates with full page loads, so every page is a
  // direct load of its URL: reading the address bar on render is all it takes.
  afterEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("lights the entry of the page loaded, in path mode", async () => {
    window.history.replaceState(null, "", "/admin/admin_posts/read/1")

    await act(async () => {
      render(
        <ResourceViewProvider
          viewResourceContextParams={parseLink(window.location.pathname)}
          configuration={{ scopes: SCOPES, defaultScope: "admin" }}
        />
      )
    })

    expect(currentEntries()).toEqual(["Posts"])
    expect(sidebar().getByRole("button", { name: "Blog" })).toHaveAttribute(
      "data-active-child"
    )
  })

  it("lights the scope's default page on a bare URL", async () => {
    window.history.replaceState(null, "", "/admin")

    await act(async () => {
      render(
        <ResourceViewProvider
          viewResourceContextParams={parseLink(window.location.pathname)}
          configuration={{ scopes: SCOPES, defaultScope: "admin" }}
        />
      )
    })

    expect(currentEntries()).toEqual(["Overview"])
  })
})

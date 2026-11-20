import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { configureLibraries, PLAYGROUND_PATH } from "@/demo/setup"
import { Route as PlaygroundRoute } from "@/routes/playground/index"

/**
 * The playground as /playground serves it, page after page: it fails on the
 * error screen, or on anything written to the console as an error.
 *
 * The route is rendered only in the browser (`ClientOnly`), so the prerender
 * that fails the site's build on a broken page never mounts it — a declaration
 * that throws went out to production showing nothing but "Something went
 * wrong". It is the route's own component that is mounted here, with the scope
 * it loads lazily, so a resource declared in the wrong order fails here first.
 */

configureLibraries()

/**
 * Each screen of the back office, and a text that says it has rendered. On
 * each one, every tab is opened in turn: the layouts of a list (table, cards,
 * board, calendar…) and the tabs of a record (a company's team, a post's
 * comments…) are tabs alike.
 */
const PAGES: Array<[view: string, ready: string | RegExp]> = [
  ["", "Companies"],
  ["admin/admin_users/list", "Ada Lovelace"],
  ["admin/admin_users/read/1", /Curriculum vitæ/],
  ["admin/admin_users/update/1", "Edit a user"],
  ["admin/admin_companies/list", "Café des Arceaux"],
  ["admin/admin_companies/update/1", /Team/],
  ["admin/admin_companies/update/1/team", /Team/],
  ["admin/admin_posts/list", "Choosing a grinder you will keep"],
  ["admin/admin_posts/update/1", /Comments/],
  ["admin/admin_comments/list", "Jules"],
  ["admin/admin_newsletters/list", "Newsletters"],
  ["admin/admin_products/list", "Ethiopia Yirgacheffe — 250 g"],
  ["admin/admin_orders/list", "CMD-2601"],
  ["admin/admin_tasks/list", "Reorder 250 g kraft bags"],
  ["admin/admin_settings/list", "Settings"],
]

const consoleError = vi.spyOn(console, "error")

beforeEach(() => consoleError.mockClear())
afterEach(cleanup)

function renderPlayground(view: string) {
  const rootRoute = createRootRoute()
  const playgroundRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: PLAYGROUND_PATH,
    component: PlaygroundRoute.options.component,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([playgroundRoute]),
    history: createMemoryHistory({
      initialEntries: [view ? `${PLAYGROUND_PATH}?view=${view}` : PLAYGROUND_PATH],
    }),
  })

  render(<RouterProvider router={router} />)
}

/** Neither the error screen nor an error in the console. */
function expectNoError() {
  expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  expect(consoleError).not.toHaveBeenCalled()
}

describe("the playground", () => {
  it.each(PAGES)(
    "renders %s without an error",
    async (view, ready) => {
      const user = userEvent.setup()
      renderPlayground(view)

      // The scope is loaded lazily: until it is, there is nothing to fail.
      await waitFor(
        () => {
          expect(screen.queryByText(/Something went wrong/i)).toBeNull()
          // As a text, or as the value of a field: the posts table edits in place.
          expect(
            screen.queryAllByText(ready).length +
              screen.queryAllByDisplayValue(ready).length
          ).toBeGreaterThan(0)
        },
        { timeout: 10_000 }
      )
      expectNoError()

      const tabs = screen.queryAllByRole("tab").map((tab) => tab.textContent)
      for (const name of tabs) {
        const tab = screen
          .queryAllByRole("tab")
          .find((candidate) => candidate.textContent === name)
        if (!tab) continue
        await user.click(tab)
        await waitFor(() => expect(tab).toHaveAttribute("aria-selected", "true"))
        expectNoError()
      }
    },
    30_000
  )
})

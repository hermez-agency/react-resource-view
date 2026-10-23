import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource } from "@/utils/createViewResource"
import type { UpdateViewDefinition } from "@/ResourceDefinition"
import { ChildViewResourceDialog } from "@/components/ChildViewResourceDialog"
import { ChildViewRouteContext } from "@/open/childViewRoute"

// What the frame wraps is a whole view context; what is under test is the link
// to it, and what the frame is called.
vi.mock("@/provider/ViewResourceContextProvider", () => ({
  default: () => <div data-testid="view" />,
}))

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ fetchData: () => {} }),
}))

vi.mock("@/ports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ports")>()),
  useNavigate: () => () => {},
}))

const { default: ResourceViewButton } = await import("@/action/ResourceViewButton")

let count = 0

function resourceWith(update: UpdateViewDefinition) {
  return createViewResource(`button_items_${++count}`, {
    storage: "local",
    // The list's own sentence, which every action inherits.
    description: "Everything the shop sells.",
    views: { update: { ...update } },
  })
}

/** The view a URL opens over the page, as the routed view draws it. */
async function renderFrame(
  view: UpdateViewDefinition,
  action: ActionList = ActionList.update
) {
  const resource = resourceWith(view)
  render(
    <ChildViewResourceDialog
      childViewResource={{ resource, resourceAction: action, id: "12" }}
    />
  )
  // The frame is loaded on demand: it is there once the view inside it is.
  await screen.findByTestId("view")

  return resource
}

describe("ResourceViewButton", () => {
  it("is a link to the view's page when it opens on one", () => {
    const resource = resourceWith({})
    render(<ResourceViewButton action="update" resource={resource} id="12" />)

    expect(
      screen.getByRole("link", { name: /update/i }).getAttribute("href")
    ).toMatch(new RegExp(`/${resource["@id"]}/update/12$`))
  })

  it("writes a view opened over the page under the routed view", () => {
    const resource = resourceWith({ open: "dialog" })
    render(
      <ChildViewRouteContext
        value={{
          parentParams: {
            resource,
            resourceAction: ActionList.list,
            scope: "shop",
            viewVariantId: "board",
          },
          claimInline: () => () => {},
        }}
      >
        <ResourceViewButton action="update" resource={resource} id="12" />
      </ChildViewRouteContext>
    )

    expect(screen.getByRole("link", { name: /update/i })).toHaveAttribute(
      "href",
      `/shop/${resource["@id"]}/list/${resource["@id"]}/update/12?variant=board`
    )
  })

  it("opens over the resource's list when drawn outside any view", () => {
    const resource = resourceWith({ open: "drawer" })
    render(<ResourceViewButton action="update" resource={resource} id="12" />)

    expect(
      screen.getByRole("link", { name: /update/i }).getAttribute("href")
    ).toMatch(new RegExp(`/${resource["@id"]}/list/${resource["@id"]}/update/12$`))
  })
})

describe("A view opened in a dialog", () => {
  it("names the dialog after the view", async () => {
    await renderFrame({ title: "Reprice a bag", open: "dialog" })

    expect(
      screen.getByRole("heading", { name: "Reprice a bag" })
    ).toBeInTheDocument()
  })

  it("does not introduce a form with the sentence written for the list", async () => {
    await renderFrame({
      title: "Reprice a bag",
      description: "Everything the shop sells.",
      open: "dialog",
    })

    expect(screen.queryByText("Everything the shop sells.")).toBeNull()
  })
})

describe("A view opened in a drawer", () => {
  it("slides the view in rather than replacing the page", async () => {
    await renderFrame({ title: "Reprice a bag", open: "drawer" })

    expect(
      screen.getByRole("heading", { name: "Reprice a bag" })
    ).toBeInTheDocument()
    expect(screen.getByTestId("view")).toBeInTheDocument()
  })

  /**
   * The panel travels along the axis it is swiped away on, and `matchMedia` is
   * stubbed as a narrow screen for the tests — so what a phone gets is what is
   * asserted here.
   */
  it("comes up from the bottom on a narrow screen", async () => {
    await renderFrame({ title: "Reprice a bag", open: "drawer" })

    expect(document.querySelector("[data-swipe-axis='y']")).not.toBeNull()
  })
})

describe("The link to the full page", () => {
  const expandLink = () => screen.queryByRole("link", { name: "Open in full page" })

  it("is in the header of a dialog, and leads to the same view on its page", async () => {
    const resource = await renderFrame({ open: "dialog" })

    expect(expandLink()).toHaveAttribute("title", "Open in full page")
    expect(expandLink()?.getAttribute("href")).toMatch(
      new RegExp(`/${resource["@id"]}/update/12$`)
    )
  })

  it("is in the header of a drawer too", async () => {
    await renderFrame({ open: "drawer" })

    expect(expandLink()).toBeInTheDocument()
  })

  it("is left out with `expandable: false`", async () => {
    await renderFrame({ open: "dialog", expandable: false })

    expect(expandLink()).toBeNull()
  })

  it("is left out of a deletion, which has no page worth opening", async () => {
    await renderFrame({}, ActionList.delete)

    expect(screen.getByTestId("view")).toBeInTheDocument()
    expect(expandLink()).toBeNull()
  })
})

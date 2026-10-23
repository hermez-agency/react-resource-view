import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { ResourceViewProvider, createPage, generateLink } from "@/index"

describe("createPage", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("builds a menu entry and refuses every route but the page", () => {
    const help = createPage("help-page", { name: "Help", component: () => null })

    expect(help.name).toBe("Help")
    expect(help.permissions).toMatchObject({
      list: true,
      read: false,
      create: false,
      update: false,
      delete: false,
    })
    expect(
      generateLink({
        resourceId: help["@id"] as string,
        resourceAction: ActionList.list,
      })
    ).toContain("help-page")
  })

  it("draws its component without sending any request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const help = createPage("help-no-request", {
      name: "Help",
      component: () => <p>Need a hand?</p>,
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{
          resourceId: help["@id"] as string,
          resourceAction: ActionList.list,
        }}
        configuration={{ resources: [help] }}
      />
    )

    expect(await screen.findByText("Need a hand?")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ResourceViewProvider from "@/provider/ResourceViewProvider"

/**
 * A link cut short by a mail client or a chat, or edited by hand, must not
 * take the whole application down: the parameter is dropped, the view shows.
 */

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, "", "/")
})

describe("a provider under a malformed ?filter= or ?defaultData=", () => {
  it.each([
    ["filter", "oops"],
    ["filter", "%7B%22a%22"],
    ["defaultData", "oops"],
    ["defaultData", "%7B%22a%22"],
  ])("still renders its children for ?%s=%s", (key, value) => {
    window.history.pushState({}, "", `/?${key}=${value}`)

    render(
      <ResourceViewProvider>
        <p>still here</p>
      </ResourceViewProvider>
    )

    expect(screen.getByText("still here")).toBeInTheDocument()
  })
})

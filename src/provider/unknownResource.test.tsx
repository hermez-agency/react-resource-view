import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource } from "@/utils/createViewResource"
import ViewResourceContextProvider from "@/provider/ViewResourceContextProvider"

/**
 * A typo in a menu link is the most frequent error of a first wiring: the
 * message names what was asked and what exists, not just "View not found".
 */

function renderError(props: Parameters<typeof ViewResourceContextProvider>[0]) {
  try {
    render(<ViewResourceContextProvider {...props} />)
  } catch (error) {
    return (error as Error).message
  }
  throw new Error("expected the provider to throw")
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe("a view asked for something that does not exist", () => {
  it("names the resource that is not registered, and the registered ones", () => {
    createViewResource("unknown_tasks", { storage: "local" })

    const message = renderError({
      resourceId: "does_not_exist",
      resourceAction: ActionList.list,
    })

    expect(message).toMatch(
      /^Resource "does_not_exist" is not registered\. Registered: /
    )
    expect(message).toContain("unknown_tasks")
  })

  it("names the action a registered resource has no view for, and its views", () => {
    createViewResource("unknown_users", { storage: "local" })

    const message = renderError({
      resourceId: "unknown_users",
      resourceAction: "nope" as ActionList,
    })

    expect(message).toMatch(
      /^Resource "unknown_users" has no "nope" view\. Available: /
    )
    expect(message).toContain("list")
    expect(message).toContain("read")
  })
})

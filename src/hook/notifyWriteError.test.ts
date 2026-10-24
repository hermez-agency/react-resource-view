import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiRequestError } from "@/api/apiRequestError"
import type { ViewResource } from "@/ViewResource"

const toast = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toast) }))

const { notifyWriteError } = await import("@/hook/useResourceMutation")

const resource = {} as ViewResource

beforeEach(() => toast.error.mockClear())

describe("notifyWriteError", () => {
  it("says the server could not be reached when the request got no answer", () => {
    notifyWriteError(resource, new TypeError("Failed to fetch"))

    expect(toast.error).toHaveBeenCalledWith("An error occurred", {
      description: "The server could not be reached.",
    })
  })

  it("gives the status when the API answered without a detail", () => {
    const html = new ApiRequestError({
      status: 500,
      url: "/api/tasks",
      payload: "<html>Internal Server Error</html>",
    })

    notifyWriteError(resource, html)

    expect(toast.error).toHaveBeenCalledWith("An error occurred", {
      description: "500 — The server answered with an error.",
    })
  })

  it("says nothing more about a bug", () => {
    notifyWriteError(resource, new Error("boom"))

    expect(toast.error).toHaveBeenCalledWith("An error occurred", {
      description: undefined,
    })
  })
})

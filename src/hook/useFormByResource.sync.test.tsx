import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { ActionList } from "react-data-form"
import type { ViewResourceContextParams } from "@/ViewResourceContext"

/**
 * The record of an edit screen arrives after the first render, once the
 * provider has loaded it: the form fills itself in, with nothing to copy into
 * the view that draws it.
 */

const updateData = vi.fn()
let ready = true

vi.mock("react-data-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-data-form")>()
  return {
    ...actual,
    useForm: () => ({ form: { label: {} }, ready, updateData }),
  }
})

vi.mock("@/views/update/getFormByCurrentResourceContext", () => ({
  default: () => ({ label: {}, inputs: {} }),
}))
vi.mock("@/utils/findResource", () => ({ findResource: () => ({ "@id": "items" }) }))
vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }))

const { default: useFormByResource } = await import("@/hook/useFormByResource")

function render(initial: ViewResourceContextParams) {
  return renderHook(
    (currentResource: ViewResourceContextParams) =>
      useFormByResource({ currentResource, data: currentResource.defaultData }),
    { initialProps: initial }
  )
}

const base = {
  resourceId: "items",
  id: "1",
  resourceAction: ActionList.update,
  view: {},
} as ViewResourceContextParams

describe("useFormByResource, when the record arrives", () => {
  it("fills the form again with it", () => {
    updateData.mockClear()
    const { rerender } = render(base)
    expect(updateData).not.toHaveBeenCalled()

    const loaded = { name: "Loaded" }
    rerender({ ...base, data: loaded } as ViewResourceContextParams)

    expect(updateData).toHaveBeenCalledWith(loaded, true)
  })

  it("does not fill it again with the record it started from", () => {
    updateData.mockClear()
    const record = { name: "Already there" }
    const { rerender } = render({
      ...base,
      data: record,
    } as ViewResourceContextParams)
    rerender({ ...base, data: record } as ViewResourceContextParams)

    expect(updateData).not.toHaveBeenCalled()
  })

  it("waits for the form to be ready", () => {
    updateData.mockClear()
    ready = false
    const { rerender } = render(base)
    rerender({ ...base, data: { name: "Early" } } as ViewResourceContextParams)
    ready = true

    expect(updateData).not.toHaveBeenCalled()
  })
})

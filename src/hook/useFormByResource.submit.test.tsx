import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { ActionList } from "react-data-form"
import type { ViewResourceContextParams } from "@/ViewResourceContext"
import { messages } from "@/i18n/messages"

/**
 * The submit button says what the form does: "Save" when it edits a record,
 * "Create" when it makes one. A label the definition declares stays first.
 */

let drawn: { label?: { submit?: string } } | undefined

vi.mock("react-data-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-data-form")>()
  return {
    ...actual,
    useForm: ({ form }: { form: { label?: { submit?: string } } }) => {
      drawn = form
      return { form: { label: {} }, ready: true, updateData: () => {} }
    },
  }
})

vi.mock("@/views/update/getFormByCurrentResourceContext", () => ({
  default: (currentResource: { declared?: string }) => ({
    label: currentResource.declared ? { submit: currentResource.declared } : {},
    inputs: {},
  }),
}))
vi.mock("@/utils/findResource", () => ({ findResource: () => ({ "@id": "items" }) }))
vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }))

const { default: useFormByResource } = await import("@/hook/useFormByResource")

function submitLabelOf(currentResource: Record<string, unknown>) {
  renderHook(() =>
    useFormByResource({
      currentResource: currentResource as unknown as ViewResourceContextParams,
    })
  )
  return drawn?.label?.submit
}

describe("useFormByResource, submit label", () => {
  it("reads Save on an edit screen", () => {
    expect(
      submitLabelOf({
        resourceId: "items",
        id: "/items/1",
        resourceAction: ActionList.update,
        view: {},
      })
    ).toBe("Save")
  })

  it("reads Create on a creation screen", () => {
    expect(
      submitLabelOf({
        resourceId: "items",
        resourceAction: ActionList.create,
        view: {},
      })
    ).toBe("Create")
  })

  it("keeps the label the definition declares", () => {
    expect(
      submitLabelOf({
        resourceId: "items",
        id: "/items/1",
        resourceAction: ActionList.update,
        declared: "Enregistrer",
        view: {},
      })
    ).toBe("Enregistrer")
  })

  it("has both default labels in the translation catalogue", () => {
    expect(messages.Save).toBe("Save")
    expect(messages.Create).toBe("Create")
  })
})

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { ActionList } from "react-data-form"
import type { ResolvedView } from "@/ViewResource"
import { createElement, ReactNode } from "react"
import { OverlayContext, type OverlayInterface } from "@/action/overlayContext"

/**
 * What happens once a record has been created, and where the user lands.
 *
 * A full-page "New user" moves on to the new record's edit screen, so nobody
 * is left in front of a form that has already been sent. A dialog must not:
 * navigating leaves the page it is drawn on, and the list underneath — its
 * filters, its page — goes with it.
 */

const created = { "@id": "/items/1" }
let submit: ((data: object) => Promise<unknown>) | undefined
const updateData = vi.fn()

vi.mock("react-data-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-data-form")>()
  return {
    ...actual,
    // The form itself is not under test: only the callback it is handed.
    useForm: ({ onSubmit }: { onSubmit: (data: object) => Promise<unknown> }) => {
      submit = onSubmit
      return { form: { label: {} }, updateData }
    },
  }
})

const navigate = vi.fn()
vi.mock("@/ports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ports")>()),
  useNavigate: () => navigate,
}))

vi.mock("@/views/update/getFormByCurrentResourceContext", () => ({
  default: () => ({ label: {}, inputs: {} }),
}))

const createItem = vi.fn(async () => ({ data: created }))
const updateItem = vi.fn(async () => ({ data: created }))
const resource = {
  "@id": "items",
  scope: "admin",
  createItem,
  updateItem,
}

vi.mock("@/utils/findResource", () => ({
  findResource: () => resource,
}))

vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }))

const { default: useFormByResource } = await import("@/hook/useFormByResource")

const close = vi.fn()

/** In a frame — a dialog, a drawer — when `frame` is set. */
async function createWith(
  view: Partial<ResolvedView>,
  frame?: OverlayInterface,
  action: ActionList = ActionList.create
) {
  renderHook(
    () =>
      useFormByResource({
        currentResource: {
          resourceId: "items",
          id: action === ActionList.update ? "/items/1" : undefined,
          resourceAction: action,
          view: view as ResolvedView,
        },
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(OverlayContext, { value: frame ?? null }, children),
    }
  )

  await submit?.({ name: "A new one" })
}

describe("useFormByResource, after a creation", () => {
  beforeEach(() => {
    navigate.mockClear()
    updateData.mockClear()
    createItem.mockClear()
    close.mockClear()
  })

  it("closes its frame rather than moving on, when it opened in one", async () => {
    await createWith({}, { close })

    expect(navigate).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("stays in its frame on `stay`", async () => {
    await createWith({ afterSave: "stay" }, { close })

    expect(navigate).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  it("moves on to the new record's edit screen on a screen of its own", async () => {
    await createWith({})

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0].to).toContain("update")
  })

  it("builds that link in the resource's own scope", async () => {
    await createWith({})

    expect(navigate.mock.calls[0][0].to).toContain("admin")
  })

  it("hands the view context to the repository with the payload", async () => {
    await createWith({})

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "A new one" }),
      expect.objectContaining({
        viewResourceContext: expect.objectContaining({ resourceId: "items" }),
      })
    )
  })
})

describe("useFormByResource, `afterSave`", () => {
  beforeEach(() => {
    navigate.mockClear()
    updateData.mockClear()
  })

  it("goes back to the list on `close`, from a page", async () => {
    await createWith({ afterSave: "close" })

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0].to).toContain("list")
  })

  it("goes where `redirect` says, given the saved record", async () => {
    await createWith(
      { afterSave: { redirect: (item) => `/done${item["@id"]}` } },
      { close }
    )

    expect(navigate).toHaveBeenCalledWith({ to: "/done/items/1" })
  })

  it("fills the form again with the answer on `reload`", async () => {
    await createWith({ afterSave: "reload" }, { close })

    expect(updateData).toHaveBeenCalledWith(created)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("goes to the page of the record just created on `read`", async () => {
    await createWith({ afterSave: "read" })

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0].to).toContain("read")
    expect(navigate.mock.calls[0][0].to).toContain("admin")
  })

  it("goes to the page of the record just updated on `read`", async () => {
    await createWith({ afterSave: "read" }, undefined, ActionList.update)

    expect(updateItem).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0].to).toContain("read")
  })

  it("leaves a frame for the record's page on `read`", async () => {
    await createWith({ afterSave: "read" }, { close })

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0].to).toContain("read")
  })
})

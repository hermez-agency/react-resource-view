import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
import { strapiDialect } from "@/api/dialect/strapiDialect"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"

// Two resources of one application, each reading its own backend: what a link
// carries is the identity the resource's dialect reads, not the configured one.
const navigate = vi.fn()
let current: { resource: unknown; id?: string; viewVariant?: string } = {
  resource: undefined,
}

vi.mock("@/provider/useCurrentViewResourceContext", () => ({
  default: () => ({ fetchData: () => {}, ...current }),
}))

vi.mock("@/provider/ViewResourceContextProvider", () => ({
  default: () => <div data-testid="view" />,
}))

vi.mock("@/views/list/component/DefaultRowComponent", () => ({
  DefaultRowComponent: () => <div />,
}))

vi.mock("@/views/list/component/ListPagination", () => ({ default: () => null }))

vi.mock("@/layout/useLayout", () => ({ useLayout: () => ({ options: {} }) }))

vi.mock("@/ports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ports")>()),
  useNavigate: () => navigate,
}))

const { default: ResourceViewButton } = await import("@/action/ResourceViewButton")
const { default: ListSplit } = await import("@/views/list/component/split/ListSplit")

const strapi = createViewResource("two_backends_products", {
  path: "/products",
  dialect: strapiDialect(),
})
const supabase = createViewResource("two_backends_notes", {
  path: "notes",
  dialect: supabaseDialect({ apiKey: "anon-key", primaryKey: "uuid" }),
})

const product = { id: 5, documentId: "abc123" }
const note = { uuid: "7c1e" }

describe.each([
  ["Strapi", strapi, product, "abc123"],
  ["Supabase", supabase, note, "7c1e"],
])(
  "a %s resource in an application with another dialect",
  (_, resource, row, id) => {
    it.each(["update", "delete"] as const)(
      "links its %s action to the record",
      (action) => {
        current = { resource }
        render(<ResourceViewButton action={action} resource={resource} data={row} />)

        expect(screen.getByRole("link").getAttribute("href")).toMatch(
          new RegExp(`/${action}/${id}$`)
        )
      }
    )

    it("selects a row of its split by the same identity", () => {
      current = { resource }
      navigate.mockClear()
      render(<ListSplit rows={[{ data: row }] as never} />)

      fireEvent.click(screen.getByRole("button"))

      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: expect.stringContaining(id) })
      )
    })
  }
)

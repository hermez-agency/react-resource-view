import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { createViewResource } from "@/utils/createViewResource"
import { strapiDialect } from "@/api/dialect/strapiDialect"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"
import ViewResourceContextProvider from "@/provider/ViewResourceContextProvider"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"

/**
 * The selection key is the identity the resource's dialect reads: a Strapi or
 * Supabase record has no `@id`, and used to be impossible to select.
 */

function Picker({ item }: { item: Record<string, unknown> }) {
  const { setSelected, isSelected, selected } = useCurrentViewResourceContext()

  return (
    <>
      <button onClick={() => setSelected(item as any)}>pick</button>
      <output>{`${isSelected(item as any)}|${selected.join(",")}`}</output>
    </>
  )
}

afterEach(() => localStorage.clear())

describe("the selection of the provider, without an @id", () => {
  it.each([
    ["Strapi", strapiDialect(), { id: 1, documentId: "kx8f2" }, "kx8f2"],
    ["Supabase", supabaseDialect({ apiKey: "anon-key" }), { id: 7 }, "7"],
  ])("selects a %s record and tells onSelected", (name, dialect, item, key) => {
    const onSelected = vi.fn()
    const resource = createViewResource(`selection_${name}`, {
      storage: "local",
      dialect,
      components: { view: () => <Picker item={item} /> },
    })

    render(
      <ViewResourceContextProvider
        resource={resource}
        resourceAction={ActionList.list}
        onSelected={onSelected}
      />
    )
    fireEvent.click(screen.getByText("pick"))

    expect(onSelected).toHaveBeenCalledWith([key])
    expect(screen.getByRole("status")).toHaveTextContent(`true|${key}`)
  })
})

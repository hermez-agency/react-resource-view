import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ItemRender from "@/views/list/ItemRender"

describe("ItemRender", () => {
  it("draws what the media inputs store rather than their base64", () => {
    const logo = "data:image/png;base64,cG5n"
    const { container } = render(<>{ItemRender(logo)}</>)
    expect(container.querySelector("img")).toHaveAttribute("src", logo)
    expect(container).not.toHaveTextContent("base64")

    render(
      <>
        {ItemRender([
          { name: "kbis.pdf", type: "application/pdf", size: 10, url: "data:," },
        ])}
      </>
    )
    expect(screen.getByRole("link", { name: /kbis\.pdf/ })).toBeInTheDocument()
  })
})

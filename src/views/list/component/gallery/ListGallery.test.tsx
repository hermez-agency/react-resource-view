import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { createViewResource } from "@/utils/createViewResource"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { layout } from "@/layout/layout"
import { coverImageOf } from "@/views/list/component/gallery/coverImage"

afterEach(() => localStorage.clear())

describe("coverImageOf", () => {
  it("reads an URL, a data URL, a media object or the first of a list", () => {
    const media = { name: "a.png", type: "image/png", size: 1, url: "/a.png" }

    expect(coverImageOf("https://x.test/a.png")).toBe("https://x.test/a.png")
    expect(coverImageOf("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA"
    )
    expect(coverImageOf(media)).toBe("/a.png")
    expect(coverImageOf([media, { ...media, url: "/b.png" }])).toBe("/a.png")
  })

  it("has no cover for an empty or foreign value", () => {
    for (const value of [undefined, null, "", "  ", [], 3, {}]) {
      expect(coverImageOf(value)).toBeUndefined()
    }
  })
})

describe("layout.gallery", () => {
  it("keeps the options it was given, over its defaults", () => {
    expect(layout.gallery({ imageField: "photo" }).options).toEqual({
      imageField: "photo",
      aspect: "4/3",
      fit: "cover",
      columns: 4,
    })
    expect(
      layout.gallery({ imageField: "photo", aspect: "16/9", fit: "contain" }).options
    ).toMatchObject({ aspect: "16/9", fit: "contain" })
  })

  it("is refused without imageField in development", () => {
    expect(() => layout.gallery({} as never)).toThrow(/imageField/)
    expect(() =>
      layout.gallery({ imageField: "photo", aspect: "2/1" as never })
    ).toThrow(/aspect/)
  })

  it("draws a lazy cover, and a placeholder where the image is missing", async () => {
    const products = createViewResource<{ name: string; photo?: string }>(
      "gallery_products",
      {
        name: "Products",
        storage: "local",
        form: { inputs: { name: { label: "Name" }, photo: { label: "Photo" } } },
        views: {
          list: {
            layouts: [layout.gallery({ imageField: "photo", titleField: "name" })],
          },
        },
      }
    )
    const member = (id: string, name: string, photo?: string) => ({
      "@id": "/gallery_products/" + id,
      "@type": "gallery_products",
      id,
      name,
      photo,
    })
    localStorage.setItem(
      "gallery_products",
      JSON.stringify({
        "@id": "gallery_products",
        "@type": "Collection",
        member: [member("1", "Lamp", "/lamp.png"), member("2", "Chair")],
        totalItems: 2,
      })
    )

    const { container } = render(
      <ResourceViewProvider
        viewResourceContextParams={{
          scope: "gallery",
          resourceId: "gallery_products",
        }}
        configuration={{ resources: [products], defaultScope: "gallery" }}
      />
    )
    await screen.findByText("Lamp")

    const img = container.querySelector("img")
    expect(img).toHaveAttribute("src", "/lamp.png")
    expect(img).toHaveAttribute("loading", "lazy")
    expect(
      container.querySelectorAll('[data-slot="gallery-cover-placeholder"]')
    ).toHaveLength(1)
  })
})

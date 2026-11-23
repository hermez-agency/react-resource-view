import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
// @ts-expect-error — plain .mjs script, no types.
import { variantsOf } from "../../scripts/cover-variants.mjs"
import covers from "@/content/covers.json"
import { coverVariants, getCover, inlineSvg } from "@/lib/blogCover"

const BLOG = join(import.meta.dirname, "../../blog")
const PUBLIC_BLOG = join(import.meta.dirname, "../../public/blog")
const ILLUSTRATIONS = join(import.meta.dirname, "../content/illustrations")

describe("blog covers", () => {
  it("names the variants the way the generation script writes them", () => {
    expect(coverVariants("mon-article.jpg")).toEqual(variantsOf("mon-article.jpg"))
  })

  it("gives every article an illustration with an alt text, and its files exist", () => {
    const slugs = readdirSync(BLOG)
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3))
    const present = new Set(readdirSync(PUBLIC_BLOG))

    for (const slug of slugs) {
      const entry = (covers as Record<string, { alt: string; file: string }>)[slug]
      expect(entry?.file, slug).toBeTruthy()
      expect(entry.alt.trim(), slug).not.toBe("")
      expect(readdirSync(ILLUSTRATIONS), slug).toContain(entry.file)
      for (const file of variantsOf(entry.file)) {
        expect(present.has(file), `${slug}: ${file}`).toBe(true)
      }
    }
  })

  it("serves sources under the base and its own share image", () => {
    const cover = getCover("un-back-office-complet-en-10-minutes", "/react-resource-view/")
    expect(cover?.src).toBe("/react-resource-view/blog/un-back-office-complet-en-10-minutes-960.webp")
    expect(cover?.share).toBe("/react-resource-view/blog/un-back-office-complet-en-10-minutes-share.jpg")
    expect(cover?.sources[0]).toEqual({
      type: "image/avif",
      srcSet:
        "/react-resource-view/blog/un-back-office-complet-en-10-minutes-480.avif 480w, /react-resource-view/blog/un-back-office-complet-en-10-minutes-960.avif 960w",
    })
  })

  it("inlines the SVG, drawn on the brand's palette, and keeps its theme on the site's class", () => {
    const { svg } = getCover("un-back-office-complet-en-10-minutes", "/")!
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('data-brand="react-resource-view"')
    expect(svg).toContain(".dark svg[data-brand=")
    expect(svg).not.toContain("prefers-color-scheme")
    expect(svg).not.toMatch(/<(text|image)\b/)
  })

  it("only strips the system dark-mode rule when inlining", () => {
    const svg =
      '<svg a="1"><style>\nsvg[data-brand="x"]{--ill-bg:#fff}\n@media (prefers-color-scheme:dark){svg[data-brand="x"]{--ill-bg:#000}}\n.dark svg[data-brand="x"]{--ill-bg:#000}\n</style></svg>'
    expect(inlineSvg(svg)).toBe(
      '<svg preserveAspectRatio="xMidYMid slice" a="1"><style>\nsvg[data-brand="x"]{--ill-bg:#fff}\n.dark svg[data-brand="x"]{--ill-bg:#000}\n</style></svg>'
    )
  })

  it("has no cover for an unknown article, so the site card stays the fallback", () => {
    expect(getCover("inconnu", "/")).toBeUndefined()
  })
})

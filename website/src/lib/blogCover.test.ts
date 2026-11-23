import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
// @ts-expect-error — plain .mjs script, no types.
import { variantsOf } from "../../scripts/cover-variants.mjs"
import covers from "@/content/covers.json"
import { coverVariants, getCover } from "@/lib/blogCover"

const BLOG = join(import.meta.dirname, "../../blog")
const PUBLIC_BLOG = join(import.meta.dirname, "../../public/blog")

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
      for (const file of [entry.file, ...variantsOf(entry.file)]) {
        expect(present.has(file), `${slug}: ${file}`).toBe(true)
      }
    }
  })

  it("serves sources under the base and its own share image", () => {
    const cover = getCover("un-back-office-complet-en-10-minutes", "/react-resource-view/")
    expect(cover?.src).toBe("/react-resource-view/blog/un-back-office-complet-en-10-minutes.jpg")
    expect(cover?.share).toBe("/react-resource-view/blog/un-back-office-complet-en-10-minutes-og.jpg")
    expect(cover?.sources[0]).toEqual({
      type: "image/avif",
      srcSet:
        "/react-resource-view/blog/un-back-office-complet-en-10-minutes-480.avif 480w, /react-resource-view/blog/un-back-office-complet-en-10-minutes-960.avif 960w",
    })
  })

  it("has no cover for an unknown article, so the site card stays the fallback", () => {
    expect(getCover("inconnu", "/")).toBeUndefined()
  })
})

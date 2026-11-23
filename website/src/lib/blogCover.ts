import covers from "@/content/covers.json"

/**
 * The illustration of a blog article, declared in `src/content/covers.json`
 * (one entry per slug). Its source is an SVG drawn by hand under
 * `src/content/illustrations/`, following the Brand Assets grammar; the rasters
 * in `public/blog/` are produced from it by Brand Assets' `rasterize` tool.
 *
 * The SVG is inlined in the page, so it follows the site's light / dark theme;
 * the rasters are the `<picture>` fallback, and the share image.
 *
 * The widths, formats and names below are the ones `scripts/cover-variants.mjs`
 * lists; `blogCover.test.ts` keeps both in step.
 */

export const COVER_WIDTHS = [480, 960] as const
export const COVER_FORMATS = ["avif", "webp"] as const

/** Declared size of the share image: LinkedIn's 1.91:1 preview. */
export const SHARE_SIZE = { width: 1200, height: 630 } as const

interface CoverEntry {
  alt: string
  /** The SVG source under `src/content/illustrations/`. */
  file: string
}

const SOURCES = import.meta.glob("../content/illustrations/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

/**
 * The SVG ready to be inlined. Its `prefers-color-scheme` rule is dropped: the
 * site's theme is the `.dark` class on `<html>`, which a visitor can set against
 * their system's setting, and the SVG's own `.dark` rule already follows it.
 * `slice` fills a card that is not 16:9.
 */
export function inlineSvg(svg: string): string {
  return svg
    .replace(/@media \(prefers-color-scheme:dark\)\{svg\[[^\]]*\]\{[^}]*\}\}\n?/, "")
    .replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ')
}

export interface BlogCover {
  alt: string
  /** The inline-ready SVG, when the article has one: it follows the theme. */
  svg?: string
  /** The largest raster, the `<img>` fallback. */
  src: string
  /** One `srcset` per format, smallest first. */
  sources: { type: string; srcSet: string }[]
  /** The 1200 × 630 JPEG for `og:image` and `twitter:image`. */
  share: string
}

function stem(file: string): string {
  return file.slice(0, file.lastIndexOf("."))
}

/** The names of a cover's variants: `<name>-480.avif`… and `<name>-share.jpg`. */
export function coverVariants(file: string): string[] {
  const name = stem(file)
  return [
    ...COVER_WIDTHS.flatMap((width) => COVER_FORMATS.map((format) => `${name}-${width}.${format}`)),
    `${name}-share.jpg`,
  ]
}

/**
 * The cover of an article under `base`, or `undefined` when it has none —
 * the page then falls back to the site's sharing card.
 */
export function getCover(slug: string, base: string): BlogCover | undefined {
  const entry = (covers as Record<string, CoverEntry>)[slug]
  if (!entry?.file) return undefined

  const url = (name: string) => `${base}blog/${name}`
  const name = stem(entry.file)
  const svg = SOURCES[`../content/illustrations/${entry.file}`]

  return {
    alt: entry.alt,
    svg: svg && inlineSvg(svg),
    src: url(`${name}-960.webp`),
    sources: COVER_FORMATS.map((format) => ({
      type: `image/${format}`,
      srcSet: COVER_WIDTHS.map((width) => `${url(`${name}-${width}.${format}`)} ${width}w`).join(", "),
    })),
    share: url(`${name}-share.jpg`),
  }
}

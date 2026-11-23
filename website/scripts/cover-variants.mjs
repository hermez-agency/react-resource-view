/**
 * Les déclinaisons d'une illustration d'article : AVIF et WebP à deux
 * largeurs, et l'image de partage (`og:image`, `twitter:image`), un JPEG
 * 1200 × 630 que LinkedIn sait lire.
 *
 * La source est le SVG de `src/content/illustrations/`. Les rasters sont
 * produits par l'outil de Brand Assets (`illustrations rasterize`), pas ici :
 * un clone de `hermez-agency/brand-assets` avec `pnpm install` fait dans
 * `site/`, trouvé par `BRAND_ASSETS_DIR` (par défaut, un dossier
 * `brand-assets` à côté du dépôt).
 *
 *     node scripts/cover-variants.mjs [slug…]   # sans slug : toutes
 *
 * Les largeurs et le nommage sont repris par `src/lib/blogCover.ts` et
 * contrôlés par `scripts/check-covers.ts`.
 */

import { spawnSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join, parse, resolve } from "node:path"
import { pathToFileURL } from "node:url"

export const COVERS_FILE = "src/content/covers.json"
export const ILLUSTRATIONS_DIR = "src/content/illustrations"
export const BLOG_DIR = "public/blog"

export const COVER_WIDTHS = [480, 960]
export const COVER_FORMATS = ["avif", "webp"]

/** Le nom de l'image de partage de `file`, ex. `mon-article-share.jpg`. */
export function shareImageOf(file) {
  return `${parse(file).name}-share.jpg`
}

/** Les noms des déclinaisons de `file`, ex. `mon-article-480.avif`. */
export function variantsOf(file) {
  const { name } = parse(file)
  return [
    ...COVER_WIDTHS.flatMap((width) =>
      COVER_FORMATS.map((format) => `${name}-${width}.${format}`)
    ),
    shareImageOf(file),
  ]
}

/** Réécrit les déclinaisons de `src/content/illustrations/<file>`. */
export function writeVariants(file) {
  const brandAssets = resolve(process.env.BRAND_ASSETS_DIR ?? "../../brand-assets")
  const result = spawnSync(
    "pnpm",
    [
      "--dir",
      join(brandAssets, "site"),
      "illustrations",
      "rasterize",
      resolve(ILLUSTRATIONS_DIR, file),
      "--out",
      resolve(BLOG_DIR),
    ],
    { stdio: "inherit" }
  )
  if (result.status !== 0) {
    throw new Error(`rasterize a échoué pour ${file} (BRAND_ASSETS_DIR=${brandAssets})`)
  }
}

async function main() {
  const covers = JSON.parse(await readFile(COVERS_FILE, "utf8"))
  const only = process.argv.slice(2)
  const entries = Object.entries(covers).filter(([slug]) => !only.length || only.includes(slug))
  for (const [, { file }] of entries) writeVariants(file)
  console.log(`${entries.length} illustration(s) déclinée(s)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(`Déclinaisons interrompues : ${error.message}`)
    process.exit(1)
  })
}

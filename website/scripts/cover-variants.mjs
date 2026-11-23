/**
 * Les déclinaisons d'une illustration d'article : AVIF et WebP à deux
 * largeurs, servies par `<picture>` sur `/blog` et en tête de l'article, et
 * l'image de partage (`og:image`, `twitter:image`), un JPEG recadré en
 * 1200 × 630 — LinkedIn ne lit pas l'AVIF, et rogne tout ce qui n'est pas au
 * 1,91:1 de ses aperçus.
 *
 * `post:image` les écrit à côté de l'image dès qu'elle arrive dans
 * `public/blog/`. Lancé directement, le script rattrape celles qui manquent
 * pour toutes les illustrations de `covers.json` :
 *
 *     node scripts/cover-variants.mjs
 *
 * Les largeurs et le nommage sont repris par `src/lib/blogCover.ts` et
 * contrôlés par `scripts/check-covers.ts`.
 */

import { access, readFile } from "node:fs/promises"
import { join, parse } from "node:path"
import { pathToFileURL } from "node:url"

export const COVERS_FILE = "src/content/covers.json"
export const BLOG_DIR = "public/blog"

export const COVER_WIDTHS = [480, 960]
export const COVER_FORMATS = ["avif", "webp"]

/** Le format des aperçus LinkedIn, repris par `blogCover.ts`. */
const SHARE_WIDTH = 1200
const SHARE_HEIGHT = 630

/** Le nom de l'image de partage de `file`, ex. `mon-article-og.jpg`. */
export function shareImageOf(file) {
  return `${parse(file).name}-og.jpg`
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

/** Écrit les déclinaisons de `public/blog/<file>`, en écrasant les anciennes. */
export async function writeVariants(file) {
  // Chargé ici seulement : le contrôle du build n'a besoin que des noms.
  const { default: sharp } = await import("sharp")
  const source = await readFile(join(BLOG_DIR, file))
  const { name } = parse(file)
  for (const width of COVER_WIDTHS) {
    const resized = sharp(source).resize({ width })
    const out = (format) => join(BLOG_DIR, `${name}-${width}.${format}`)
    await resized.clone().avif({ quality: 50 }).toFile(out("avif"))
    await resized.clone().webp({ quality: 75 }).toFile(out("webp"))
  }
  // Recadrée au centre : l'illustration en 16:9 perd un peu en haut et en bas.
  await sharp(source)
    .resize({ width: SHARE_WIDTH, height: SHARE_HEIGHT, fit: "cover" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(join(BLOG_DIR, shareImageOf(file)))
  console.log(`  déclinaisons de ${file} : ${variantsOf(file).join(", ")}`)
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  const covers = JSON.parse(await readFile(COVERS_FILE, "utf8"))
  let written = 0
  for (const { file } of Object.values(covers)) {
    if (!file) continue
    const present = await Promise.all(
      variantsOf(file).map((variant) => exists(join(BLOG_DIR, variant)))
    )
    if (present.every(Boolean)) continue
    await writeVariants(file)
    written += 1
  }
  console.log(`${written} illustration(s) déclinée(s)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(`Déclinaisons interrompues : ${error.message}`)
    process.exit(1)
  })
}

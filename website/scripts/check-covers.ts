import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Runs after the build (see package.json) and fails when a blog illustration
 * is declared but missing, or when an article has none declared: the cards and
 * the share image would silently fall back to the site's generic card.
 *
 * Reads `src/content/covers.json` (the declaration), `public/blog/` (the
 * generated files, which `vite build` copies as they are) and `blog/*.md`.
 * A plain Node script, like `check-links.ts`.
 */
const ROOT = join(import.meta.dirname, "..")
const covers = JSON.parse(readFileSync(join(ROOT, "src/content/covers.json"), "utf8")) as Record<
  string,
  { alt: string; prompt: string; file: string }
>

const WIDTHS = [480, 960]
const FORMATS = ["avif", "webp"]

function variantsOf(file: string): string[] {
  const name = file.slice(0, file.lastIndexOf("."))
  return [
    ...WIDTHS.flatMap((width) => FORMATS.map((format) => `${name}-${width}.${format}`)),
    `${name}-og.jpg`,
  ]
}

const problems: string[] = []

const slugs = readdirSync(join(ROOT, "blog"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.slice(0, -".md".length))

for (const slug of slugs) {
  if (!covers[slug]?.file) {
    problems.push(`${slug}: no illustration — add it to covers.json and run \`pnpm run post:image ${slug}\``)
  }
}

for (const [slug, cover] of Object.entries(covers)) {
  if (!slugs.includes(slug)) problems.push(`${slug}: declared in covers.json, but blog/${slug}.md does not exist`)
  if (!cover.alt.trim()) problems.push(`${slug}: the illustration has no alt text`)
  if (!cover.file) continue
  for (const file of [cover.file, ...variantsOf(cover.file)]) {
    if (!existsSync(join(ROOT, "dist/client/blog", file))) {
      problems.push(`${slug}: public/blog/${file} is missing from the build`)
    }
  }
}

if (problems.length > 0) {
  console.error(`Blog illustrations:\n  - ${problems.join("\n  - ")}`)
  process.exit(1)
}
console.log(`${Object.keys(covers).length} blog illustrations checked`)

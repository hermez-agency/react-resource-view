import { readFileSync } from "node:fs"
import { join, sep } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

/**
 * Where the site takes `react-resource-view` from.
 *
 * The deployed site takes it from npm, at the version a reader would install —
 * that is the promise the documentation makes, so `"npm"` stays the default and
 * no build drifts away from it by accident. The other two modes are for the
 * person changing the library rather than reading about it:
 *
 * - `"src"` mounts the working tree straight into the page, so an edit under
 *   `src/` reaches the playground on the next hot reload, with no publish and
 *   no build step in between.
 * - `"dist"` goes through `pnpm run build` first, so the site runs on the
 *   artifact npm would receive: its `exports` map, its `"use client"` banner
 *   and whatever `tsdown.config.ts` decided to externalise.
 *
 * CI uses `"dist"`, because it is the mode that fails on a packaging mistake as
 * well as on a broken component.
 */
export type SourceMode = "npm" | "src" | "dist"

/** The repository this site lives in — one directory up. */
export const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url))

const LIB_SRC = join(REPO_ROOT, "src")
const LIB_DIST = join(REPO_ROOT, "dist")
const SITE_SRC = fileURLToPath(new URL("./src", import.meta.url))

export function sourceMode(): SourceMode {
  const raw = process.env.RRV_SOURCE?.trim()
  if (!raw || raw === "npm") return "npm"
  if (raw === "1" || raw === "src") return "src"
  if (raw === "dist") return "dist"
  throw new Error(
    `RRV_SOURCE is "${raw}"; it takes "src" (or "1"), "dist", or "npm".`,
  )
}

/**
 * The library's entry points, in the mode's terms. Longest specifier first:
 * `react-resource-view/tanstack` must not be read as a subpath of the root
 * entry.
 */
function libraryEntries(mode: SourceMode) {
  if (mode === "npm") return []
  const dir = mode === "src" ? LIB_SRC : LIB_DIST
  const index = mode === "src" ? "index.ts" : "index.js"
  const tanstack = mode === "src" ? "tanstack/index.tsx" : "tanstack/index.js"
  return [
    { find: /^react-resource-view\/tanstack$/, replacement: join(dir, tanstack) },
    { find: /^react-resource-view\/styles\.css$/, replacement: join(dir, "styles.css") },
    // Footer.tsx reads the version the site runs on from here.
    {
      find: /^react-resource-view\/package\.json$/,
      replacement: join(REPO_ROOT, "package.json"),
    },
    { find: /^react-resource-view$/, replacement: join(dir, index) },
  ]
}

/**
 * Tailwind generates classes for the files it is told to scan, and the library
 * ships its own. Which files those are depends on the mode, and a stylesheet
 * cannot read an environment variable — so the `@source` list lives in a file
 * of its own that this alias picks.
 */
function tailwindSources(mode: SourceMode) {
  const file = mode === "npm" ? "librarySources.css" : "librarySources.worktree.css"
  return {
    find: "@library-sources",
    replacement: join(SITE_SRC, "styles", file),
  }
}

export function resolveAliases(mode: SourceMode) {
  const entries = [...libraryEntries(mode), tailwindSources(mode)]
  // In `"src"` mode both trees spell their internal alias `@/`, so it cannot be
  // a plain rewrite any more: resourceViewSourcePlugin resolves it instead.
  const site = mode === "src" ? [] : [{ find: "@", replacement: SITE_SRC }]
  return [...entries, ...site]
}

/**
 * Packages that must exist exactly once in the page. In source mode the
 * library resolves its own imports from the repository root while the site
 * resolves them from `website/node_modules`; two copies of anything holding a
 * React context means a provider the other half never sees.
 */
export function dedupeList(mode: SourceMode) {
  const shared = ["react", "react-dom", "@tanstack/react-router"]
  if (mode === "npm") return shared
  return [...shared, "react-data-form", "react-mini-i18n", "resource-registry"]
}

/**
 * What the server has to render through Vite rather than hand to Node.
 *
 * In source mode this has to grow: a module Node loads itself resolves `react`
 * next to *it* — the repository's copy, not this project's — and a second React
 * is a null dispatcher the moment a component calls a hook. Anything the
 * library pulls in that touches React therefore has to go through Vite, which
 * applies `resolve.dedupe`.
 *
 * `@base-ui/utils` is the one that makes the pattern necessary: it is nobody's
 * declared dependency, it arrives under `@base-ui/react`, and it calls hooks.
 * React itself stays out — it is CJS, and the dev server's module runner
 * cannot evaluate CJS.
 *
 * The npm build keeps its curated list, so what GitHub Pages receives is
 * unchanged.
 */
export function ssrNoExternal(mode: SourceMode, base: string[]) {
  if (mode === "npm") return base
  return [...base, /^@base-ui\//, ...libraryDependencies()]
}

/**
 * The library's own dependencies, read from its manifest rather than copied
 * here, so adding one to the library does not quietly leave this list behind.
 */
function libraryDependencies(): string[] {
  const manifest = readFileSync(join(REPO_ROOT, "package.json"), "utf8")
  return Object.keys(JSON.parse(manifest).dependencies ?? {})
}

/**
 * Resolves `@/…` for both trees at once, which a string alias cannot do: the
 * site means `website/src`, the library means `src`, and only the importer
 * tells them apart. Needed in `"src"` mode alone — the built library carries no
 * `@/` left to resolve.
 */
export function resourceViewSourcePlugin(mode: SourceMode): Plugin[] {
  if (mode !== "src") return []
  return [
    {
      name: "react-resource-view:source-alias",
      enforce: "pre",
      async resolveId(source, importer, options) {
        if (!source.startsWith("@/")) return null
        const from = importer?.startsWith("\0") ? undefined : importer?.split("?")[0]
        const root = from?.startsWith(LIB_SRC + sep) ? LIB_SRC : SITE_SRC
        const resolved = await this.resolve(join(root, source.slice(2)), importer, {
          ...options,
          skipSelf: true,
        })
        return resolved ?? null
      },
    },
  ]
}

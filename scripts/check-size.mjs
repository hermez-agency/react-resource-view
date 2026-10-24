// What a project pays for importing one thing from the built package: the
// entry and the chunks it loads at once, minified, every dependency left out.
// The chunks fetched on demand (the layouts) are not counted — that is the
// point of loading them on demand. Run after `pnpm run build`.
import { build } from "esbuild"
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
].flatMap((name) => [name, `${name}/*`])

/** Sizes in bytes, minified. A limit is a ceiling, not a target. */
const ENTRIES = [
  {
    name: "createViewResource",
    code: `import { createViewResource } from "react-resource-view"; console.log(createViewResource)`,
    limit: 42_000,
  },
  {
    name: "layout",
    code: `import { layout } from "react-resource-view"; console.log(layout)`,
    limit: 25_000,
  },
  {
    name: "configureApi",
    code: `import { configureApi } from "react-resource-view"; console.log(configureApi)`,
    limit: 10_000,
  },
]

// A chunk fetched on demand costs nothing until it is drawn: its `import()` stays
// an `import()` instead of being bundled in.
const leaveDynamicImportsOut = {
  name: "leave-dynamic-imports-out",
  setup(build) {
    build.onResolve({ filter: /^\./ }, ({ kind, path, resolveDir }) =>
      kind === "dynamic-import"
        ? { path: join(resolveDir, path), external: true }
        : undefined
    )
  },
}

const dir = mkdtempSync(join(tmpdir(), "rrv-size-"))
let failed = false

try {
  for (const { name, code, limit } of ENTRIES) {
    const entry = join(dir, `${name}.mjs`)
    writeFileSync(entry, code)
    const { outputFiles } = await build({
      entryPoints: [entry],
      bundle: true,
      format: "esm",
      minify: true,
      write: false,
      outdir: join(dir, "out"),
      external,
      alias: { "react-resource-view": join(root, "dist/index.js") },
      plugins: [leaveDynamicImportsOut],
      logLevel: "silent",
    })

    const size = outputFiles.reduce((total, file) => total + file.contents.length, 0)
    const ok = size <= limit
    if (!ok) failed = true
    console.log(
      `${ok ? "ok  " : "FAIL"} ${name}: ${(size / 1000).toFixed(1)} kB (limit ${(limit / 1000).toFixed(1)} kB)`
    )
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}

if (failed) process.exit(1)

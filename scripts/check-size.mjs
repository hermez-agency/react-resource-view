// What a project pays for importing one thing from the built package: the
// entry and the chunks it loads at once, minified, every dependency left out.
// The chunks fetched on demand (the layouts) are not counted — that is the
// point of loading them on demand. Run after `pnpm run build`.
import { build } from "esbuild"
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs"
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
    limit: 51_000,
  },
  {
    name: "layout",
    code: `import { layout } from "react-resource-view"; console.log(layout)`,
    limit: 26_000,
  },
  {
    name: "configureApi",
    code: `import { configureApi } from "react-resource-view"; console.log(configureApi)`,
    limit: 10_000,
  },
  // The navigation adapters: a few lines each, router left out.
  {
    name: "tanstackAdapter",
    code: `import { tanstackAdapter } from "react-resource-view/tanstack"; console.log(tanstackAdapter)`,
    limit: 2_000,
  },
  {
    name: "reactRouterAdapter",
    code: `import { reactRouterAdapter } from "react-resource-view/react-router"; console.log(reactRouterAdapter)`,
    limit: 2_000,
  },
  {
    name: "nextAdapter",
    code: `import { nextAdapter } from "react-resource-view/next"; console.log(nextAdapter)`,
    limit: 2_000,
  },
]

// The core knows no router: only the adapter entry points may import one.
const ROUTERS = /["'](@tanstack\/react-router|react-router|next)(\/[^"']*)?["']/
const ADAPTER_DIRS = new Set(["tanstack", "react-router", "next"])
function coreFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return ADAPTER_DIRS.has(entry.name) ? [] : coreFiles(path)
    return entry.name.endsWith(".js") ? [path] : []
  })
}

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
      alias: {
        "react-resource-view": join(root, "dist/index.js"),
        "react-resource-view/tanstack": join(root, "dist/tanstack/index.js"),
        "react-resource-view/react-router": join(root, "dist/react-router/index.js"),
        "react-resource-view/next": join(root, "dist/next/index.js"),
      },
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

  for (const file of coreFiles(join(root, "dist"))) {
    const match = readFileSync(file, "utf8").match(
      new RegExp(`(from|import\\()\\s*${ROUTERS.source}`)
    )
    if (match) {
      failed = true
      console.log(
        `FAIL core imports a router: ${file.slice(root.length + 1)} (${match[2]})`
      )
    }
  }
  if (!failed) console.log("ok   core imports no router")
} finally {
  rmSync(dir, { recursive: true, force: true })
}

if (failed) process.exit(1)

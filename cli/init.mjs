/**
 * react-resource-view — `init`: a whole application, pointed at an API.
 *
 * The starter is a Vite + React + Tailwind project with one scope, one
 * resource and the admin layout around it, wired to the backend the reader
 * picked: the dialect, the URL, and the commands that dump the API's OpenAPI
 * schema into TypeScript with api-dumper. Like the rest of the command line it
 * is templates and nothing else — no dependency, no build step.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"

/* -------------------------------------------------------------------------- */
/* Backends                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What the starter needs to know of each backend.
 *
 * `schemaPath` is where the API publishes its OpenAPI document, relative to
 * the API's URL; `null` means api-dumper cannot read it (Supabase serves
 * Swagger 2.0) and the backend's own generator is used instead.
 */
export const BACKENDS = {
  "api-platform": {
    label: "API Platform (JSON-LD / Hydra)",
    dialect: "jsonLdDialect",
    dialectCall: "jsonLdDialect()",
    apiUrl: "https://localhost",
    schemaPath: "/api/docs.jsonopenapi",
    preset: "api-platform",
    sample: { id: "books", name: "Books", path: "/api/books" },
    docs: "https://api-platform.com/docs/core/openapi/",
  },
  "spring-boot": {
    label: "Spring Boot (springdoc-openapi)",
    dialect: "springDialect",
    dialectCall: "springDialect()",
    apiUrl: "http://localhost:8080",
    schemaPath: "/v3/api-docs",
    sample: { id: "books", name: "Books", path: "/api/books" },
    docs: "https://springdoc.org",
  },
  rest: {
    label: "Another REST API (OpenAPI)",
    dialect: "fastapiDialect",
    // Plain JSON, `?page=&size=`, filters as query parameters, `/items/{id}`:
    // the most common shape. Anything else is a dialect of your own.
    dialectCall: `fastapiDialect({ pagination: "page-size" })`,
    apiUrl: "http://localhost:3000",
    schemaPath: "/openapi.json",
    sample: { id: "items", name: "Items", path: "/api/items" },
    docs: "https://hermez.dev/react-resource-view/docs/resource-view/backends",
  },
  supabase: {
    label: "Supabase (PostgREST)",
    dialect: "supabaseDialect",
    dialectCall: `supabaseDialect({ apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY })`,
    apiUrl: "https://your-project.supabase.co",
    schemaPath: null,
    sample: { id: "articles", name: "Articles", path: "articles" },
    docs: "https://supabase.com/docs/guides/api/rest/generating-types",
  },
  strapi: {
    label: "Strapi v4 / v5",
    dialect: "strapiDialect",
    dialectCall: "strapiDialect()",
    apiUrl: "http://localhost:1337",
    schemaPath: "/api/openapi.json",
    sample: { id: "articles", name: "Articles", path: "articles" },
    docs: "https://docs.strapi.io/cms/features/api-documentation",
  },
  fastapi: {
    label: "FastAPI",
    dialect: "fastapiDialect",
    dialectCall: "fastapiDialect()",
    apiUrl: "http://localhost:8000",
    schemaPath: "/openapi.json",
    sample: { id: "items", name: "Items", path: "items" },
    docs: "https://fastapi.tiangolo.com/tutorial/first-steps/#openapi",
  },
  django: {
    label: "Django REST Framework (drf-spectacular)",
    dialect: "djangoDialect",
    dialectCall: "djangoDialect()",
    apiUrl: "http://localhost:8000",
    schemaPath: "/api/schema/?format=json",
    sample: { id: "articles", name: "Articles", path: "/api/articles" },
    docs: "https://drf-spectacular.readthedocs.io",
  },
}

export const BACKEND_IDS = Object.keys(BACKENDS)

/** Names the reader may type for a backend, beyond its id. */
const BACKEND_ALIASES = {
  "api-platform": ["apiplatform", "api_platform", "jsonld", "json-ld", "hydra"],
  "spring-boot": ["spring", "springboot", "spring_boot"],
  rest: ["openapi", "generic", "other"],
  supabase: ["postgrest"],
  strapi: [],
  fastapi: ["fast-api"],
  django: ["drf", "django-rest-framework", "django-rest"],
}

/** The backend a typed name refers to, or `undefined`. */
export function resolveBackend(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
  if (!key) return undefined
  if (BACKENDS[key]) return key
  const index = Number(key)
  if (Number.isInteger(index) && index >= 1 && index <= BACKEND_IDS.length) {
    return BACKEND_IDS[index - 1]
  }
  return BACKEND_IDS.find((id) => BACKEND_ALIASES[id].includes(key))
}

/**
 * Where the schema lives, given the API's URL: `http://localhost:8080` and
 * Spring Boot give `http://localhost:8080/v3/api-docs`.
 */
export function defaultSchemaUrl(backend, apiUrl) {
  const { schemaPath } = BACKENDS[backend]
  if (!schemaPath) return undefined
  return `${String(apiUrl).replace(/\/+$/, "")}${schemaPath}`
}

/* -------------------------------------------------------------------------- */
/* Package managers                                                           */
/* -------------------------------------------------------------------------- */

export const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"]

/** The package manager that ran the command — `pnpm dlx`, `npx`, `yarn dlx`… */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent) {
  const name = String(userAgent ?? "").split("/")[0]
  return PACKAGE_MANAGERS.includes(name) ? name : "npm"
}

/** `pnpm run dev`, `npm run dev`: `run` works on all four. */
const runScript = (pm, script) => `${pm} run ${script}`

/* -------------------------------------------------------------------------- */
/* Versions                                                                   */
/* -------------------------------------------------------------------------- */

function readManifest() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    return JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"))
  } catch {
    return {}
  }
}

const manifest = readManifest()

/**
 * This package's own version, so a starter made by 0.14 installs 0.14 — the
 * one whose dialects the generated code imports.
 */
function ownVersion() {
  return manifest.version
}

/**
 * The range this package asks of a peer, so the starter can never write one
 * its own peerDependencies rule out (npm refuses to install it otherwise).
 */
function peerRange(name) {
  const range = manifest.peerDependencies?.[name]
  if (!range) throw new Error(`${name} is not a peer dependency of this package`)
  return range
}

export const VERSIONS = {
  "react-resource-view": ownVersion() ? `^${ownVersion()}` : "latest",
  react: "^19.2.0",
  "react-dom": "^19.2.0",
  "react-data-form": peerRange("react-data-form"),
  "react-mini-i18n": peerRange("react-mini-i18n"),
  "resource-registry": peerRange("resource-registry"),
  "jsonld-api-client": "^0.1.0",
  "@tanstack/react-router": peerRange("@tanstack/react-router"),
  "lucide-react": "^0.577.0",
  "api-dumper": "^0.1.0",
  "@tailwindcss/vite": "^4.3.3",
  tailwindcss: "^4.3.3",
  "@types/react": "^19.2.0",
  "@types/react-dom": "^19.2.0",
  "@vitejs/plugin-react": "^6.0.0",
  typescript: "^6.0.3",
  vite: "^8.2.0",
}

const pick = (names) =>
  Object.fromEntries(names.map((name) => [name, VERSIONS[name]]))

/* -------------------------------------------------------------------------- */
/* The project                                                                */
/* -------------------------------------------------------------------------- */

/** A package name npm accepts, from whatever the directory is called. */
export function toPackageName(value) {
  const name = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
  return name || "my-admin"
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`

function renderPackageJson({ name, backend }) {
  const dumps = BACKENDS[backend].schemaPath !== null

  const scripts = {
    dev: "vite",
    build: "tsc --noEmit && vite build",
    preview: "vite preview",
    typecheck: "tsc --noEmit",
    ...(dumps
      ? { "api-schema": "api-dumper", "api-schema:check": "api-dumper --check" }
      : {
          "api-schema":
            'mkdir -p src/api-schema && npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > src/api-schema/database.types.ts',
        }),
  }

  return json({
    name,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts,
    dependencies: pick([
      "@tanstack/react-router",
      ...(backend === "api-platform" ? ["jsonld-api-client"] : []),
      "lucide-react",
      "react",
      "react-data-form",
      "react-dom",
      "react-mini-i18n",
      "react-resource-view",
      "resource-registry",
    ]),
    devDependencies: pick([
      "@tailwindcss/vite",
      "@types/react",
      "@types/react-dom",
      "@vitejs/plugin-react",
      ...(dumps ? ["api-dumper"] : []),
      "tailwindcss",
      "typescript",
      "vite",
    ]),
  })
}

function renderEnv({ backend, apiUrl }) {
  const lines = [
    "# The API the views talk to. Read at build time by Vite.",
    `VITE_API_URL=${apiUrl}`,
  ]
  if (backend === "supabase") {
    lines.push(
      "",
      "# Project settings → API → anon public key.",
      "VITE_SUPABASE_ANON_KEY=",
      "# The id in https://<ref>.supabase.co — used by `api-schema`.",
      "SUPABASE_PROJECT_REF="
    )
  }
  return `${lines.join("\n")}\n`
}

function renderApiDumperConfig({ backend, schemaUrl }) {
  const { preset } = BACKENDS[backend]
  const extra =
    backend === "api-platform"
      ? `  preset: "api-platform",
  // A collection that also exports CSV would type every response as a union.
  strip: { contentTypes: ["text/csv"] },
`
      : preset
        ? `  preset: "${preset}",\n`
        : ""

  return `import { defineConfig } from "api-dumper"

/**
 * \`api-schema\` reads the API's OpenAPI schema and writes, under
 * src/api-schema/: openapi.json (the schema as read), api-schema.ts (the
 * types) and one file per enum. Commit all of it — the app then builds
 * without the API running, and a change of the API shows up as a diff.
 */
export default defineConfig({
  // URL or file, JSON or YAML. The API has to be running to read a URL.
  source: "${schemaUrl}",
  outDir: "src/api-schema",
${extra}})
`
}

function renderSetup({ backend, appName }) {
  const { dialect, dialectCall } = BACKENDS[backend]
  const apiPlatform = backend === "api-platform"

  const clientImport = apiPlatform
    ? `import { configureClient } from "jsonld-api-client"\n`
    : ""

  const clientBlock = apiPlatform
    ? `
// API Platform goes through the JSON-LD client — middleware, Mercure and the
// X-Scope header included. configureApi falls back to these settings.
configureClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
})
`
    : ""

  return `${clientImport}import { configureApi, configurePorts, ${dialect} } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

/**
 * Wires react-resource-view into this application, once, before anything
 * renders: the router it navigates with, and the API it talks to.
 */

/** The bearer token sent with every request — none until you add a sign-in. */
function getAuthToken(): string | undefined {
  return localStorage.getItem("token") ?? undefined
}

configurePorts({
  navigation: tanstackAdapter,
  appName: ${JSON.stringify(appName)},
  isDev: import.meta.env.DEV,
})
${clientBlock}
configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken,
  dialect: ${dialectCall},
})
`
}

function renderResource({ backend }) {
  const { sample } = BACKENDS[backend]
  const Type = sample.name.replace(/s$/, "")
  const dumps = BACKENDS[backend].schemaPath !== null

  const generated = dumps
    ? backend === "api-platform"
      ? `//   import type { components } from "@/api-schema/api-schema"
//   type ${Type} = components["schemas"]["${Type}.jsonld"]`
      : `//   import type { components } from "@/api-schema/api-schema"
//   type ${Type} = components["schemas"]["${Type}"] & { "@id": string }`
    : `//   import type { Tables } from "@/api-schema/database.types"
//   type ${Type} = Tables<"${sample.id}"> & { "@id": string }`

  return `import { BookOpen } from "lucide-react"
import { createViewResource, layout } from "react-resource-view"

/**
 * One resource: the list, the detail, the create and edit forms and the
 * delete confirmation of ${sample.path}, from this declaration alone. Every
 * action is offered; restrict them with \`permissions\` — the API stays where
 * access is enforced.
 *
 * Written by hand so the project compiles before the API is reachable. Once
 * \`api-schema\` has run, take the type from the schema instead:
 *
${generated}
 */
export interface ${Type} {
  "@id": string
  id: number | string
  title: string
}

export const ${sample.id} = createViewResource<${Type}>("${sample.id}", {
  name: "${sample.name}",
  path: "${sample.path}",
  icon: BookOpen,
  form: {
    inputs: {
      title: { label: "Title", required: true },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search" } } },
      layouts: [layout.table(), layout.cards()],
    },
  },
})
`
}

function renderScope({ backend, appName }) {
  const { sample } = BACKENDS[backend]

  return `import { AdminLayout, type ScopeInterface } from "react-resource-view"
import { ${sample.id} } from "@/resources/${sample.id}"

/**
 * The back office: its resources, its menu, and the admin layout around every
 * view. A new resource is declared under src/resources/ and added to
 * \`resources\` — the menu lists them.
 */
export const adminScope: ScopeInterface = {
  name: "admin",
  label: ${JSON.stringify(appName)},
  decoratorComponent: AdminLayout,
  resources: [${sample.id}],
  menu: "auto",
  defaultViewResourceContextParams: {
    resourceId: ${sample.id}["@id"],
    resourceAction: "list",
  },
}
`
}

const APP = `import { useRouterState } from "@tanstack/react-router"
import { parseLink, ResourceViewProvider } from "react-resource-view"

/**
 * Loaded on demand: a scope is a chunk of its own, so a second one — a public
 * site next to the back office — does not weigh on the first.
 */
const SCOPES = {
  admin: () => import("@/scope").then((module) => module.adminScope),
}

/**
 * The whole application. The URL says which scope, resource, action and
 * record — /admin/books/list, /admin/books/read/1 — and the provider renders it.
 */
export function App() {
  const location = useRouterState({ select: (state) => state.location })
  const params = parseLink(location.pathname + location.searchStr)

  return (
    <ResourceViewProvider
      viewResourceContextParams={
        params.scope && !(params.scope in SCOPES) ? undefined : params
      }
      configuration={{ scopes: SCOPES, defaultScope: "admin" }}
    />
  )
}
`

const MAIN = `import "@/setup"
import "@/styles.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { App } from "@/App"

/**
 * One route: every URL renders the application, which reads the view to show
 * out of it. The router is there for client-side navigation, not to list pages.
 */
const router = createRouter({
  routeTree: createRootRoute({ component: App, notFoundComponent: () => null }),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
`

const STYLES = `@import "tailwindcss";

/* The components ship compiled; Tailwind has to scan them for their classes. */
@source "../node_modules/react-resource-view/dist";
@source "../node_modules/react-data-form/dist";

/* The shadcn theme the components are drawn with. Drop it for your own. */
@import "react-resource-view/styles.css";

@layer base {
  body {
    @apply bg-background text-foreground antialiased;
  }
}
`

const VITE_CONFIG = `import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/setup" → src/setup.ts, as tsconfig.json's paths say.
    alias: { "@": "/src" },
  },
})
`

const TSCONFIG = json({
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "bundler",
    jsx: "react-jsx",
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    isolatedModules: true,
    resolveJsonModule: true,
    types: ["vite/client"],
    paths: { "@/*": ["./src/*"] },
  },
  include: ["src", "vite.config.ts", "api-dumper.config.ts"],
})

function renderEnvTypes({ backend }) {
  const supabase =
    backend === "supabase" ? "  readonly VITE_SUPABASE_ANON_KEY: string\n" : ""
  return `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
${supabase}}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
`
}

function renderIndexHtml({ appName }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
}

const GITIGNORE = `node_modules
dist
.env
`

/**
 * The commands of the project, behind make: what the reader types every day
 * should not depend on remembering which package manager the project uses.
 */
function renderMakefile({ pm, backend }) {
  const dumps = BACKENDS[backend].schemaPath !== null
  const check = dumps
    ? `
## Fails when src/api-schema is out of date with the API — for the CI.
api-schema-check:
\t${runScript(pm, "api-schema:check")}
`
    : ""

  return `# .env holds the API's settings; make passes them on to every command.
-include .env
export

.PHONY: install dev build typecheck api-schema${dumps ? " api-schema-check" : ""}

install:
\t${pm} install

dev:
\t${runScript(pm, "dev")}

build:
\t${runScript(pm, "build")}

typecheck:
\t${runScript(pm, "typecheck")}

## Dumps the API's schema into TypeScript, under src/api-schema/.
api-schema:
\t${runScript(pm, "api-schema")}
${check}`
}

function renderReadme({ appName, backend, apiUrl, schemaUrl, pm }) {
  const { label, sample, docs } = BACKENDS[backend]
  const dumps = schemaUrl !== undefined

  const schemaSection = dumps
    ? `## Typing it from the API

The API publishes its OpenAPI schema at:

    ${schemaUrl}

\`api-schema\` reads it with [api-dumper](https://github.com/SalvadorCardona/api-dumper)
and writes the types under \`src/api-schema/\` — the API has to be running:

\`\`\`bash
${runScript(pm, "api-schema")}         # or: make api-schema
${runScript(pm, "api-schema:check")}   # in the CI: fails when the files are stale
\`\`\`

Commit what it writes. The source URL is in \`api-dumper.config.ts\`. Then type
the resources from \`components["schemas"]\` — see the comment in
\`src/resources/${sample.id}.ts\`.`
    : `## Typing it from the API

Supabase serves its schema as Swagger 2.0, which api-dumper refuses; its own
CLI generates the types instead. Set \`SUPABASE_PROJECT_REF\` in \`.env\`, sign in
with \`npx supabase login\`, then:

\`\`\`bash
make api-schema   # reads .env; or: SUPABASE_PROJECT_REF=<ref> ${runScript(pm, "api-schema")}
\`\`\``

  return `# ${appName}

A back office on ${label}, built with
[react-resource-view](https://hermez.dev/react-resource-view/docs/resource-view).

## Running it

\`\`\`bash
${pm} install
${runScript(pm, "dev")}
\`\`\`

The API is \`${apiUrl}\` — change \`VITE_API_URL\` in \`.env\` to point elsewhere.
The browser calls it directly, so the API has to allow this origin (CORS).

${schemaSection}

## Where things are

| File | What it does |
| --- | --- |
| \`src/setup.ts\` | The router and the API: URL, token, dialect |
| \`src/resources/${sample.id}.ts\` | The example resource — copy it for the next one |
| \`src/scope.ts\` | The back office: its resources and its menu |
| \`src/App.tsx\` | Reads the URL and renders the view it names |

## Next

- [Declaring a resource](https://hermez.dev/react-resource-view/docs/resource-view)
- [Backends and dialects](https://hermez.dev/react-resource-view/docs/resource-view/backends)
- [Typing resources from an OpenAPI schema](https://hermez.dev/react-resource-view/docs/resource-view/openapi-types)
- [${label}](${docs})
`
}

/**
 * Every file of the starter, by path relative to the project.
 *
 * Pure: nothing is written, so the tests — and \`--dry-run\` — read exactly
 * what would land on disk.
 */
export function renderStarter({
  name,
  backend,
  apiUrl = BACKENDS[backend].apiUrl,
  schemaUrl = defaultSchemaUrl(backend, apiUrl),
  pm = "npm",
}) {
  if (!BACKENDS[backend]) throw new Error(`Unknown backend: ${backend}`)

  const packageName = toPackageName(name)
  const appName = String(name ?? packageName).trim() || packageName
  const { sample } = BACKENDS[backend]
  const dumps = BACKENDS[backend].schemaPath !== null
  const options = {
    name: packageName,
    appName,
    backend,
    apiUrl,
    schemaUrl: dumps ? schemaUrl : undefined,
    pm,
  }

  const files = {
    "package.json": renderPackageJson(options),
    "README.md": renderReadme(options),
    Makefile: renderMakefile(options),
    ".gitignore": GITIGNORE,
    ".env": renderEnv(options),
    ".env.example": renderEnv(options),
    "index.html": renderIndexHtml(options),
    "vite.config.ts": VITE_CONFIG,
    "tsconfig.json": TSCONFIG,
    "src/vite-env.d.ts": renderEnvTypes(options),
    "src/main.tsx": MAIN,
    "src/App.tsx": APP,
    "src/setup.ts": renderSetup(options),
    "src/scope.ts": renderScope(options),
    [`src/resources/${sample.id}.ts`]: renderResource(options),
    "src/styles.css": STYLES,
  }

  if (dumps) files["api-dumper.config.ts"] = renderApiDumperConfig(options)

  return files
}

/* -------------------------------------------------------------------------- */
/* Arguments                                                                  */
/* -------------------------------------------------------------------------- */

export const INIT_USAGE = `react-resource-view init — start a project on your API

Usage
  npx react-resource-view init [directory] [options]

Arguments
  directory              Where to create the project. Asked for when omitted.

Options
  -b, --backend <name>   ${BACKEND_IDS.join(", ")}
  -u, --api-url <url>    The API's URL (e.g. http://localhost:8080).
  -s, --schema-url <url> Its OpenAPI schema. Guessed from the backend when omitted.
      --pm <name>        ${PACKAGE_MANAGERS.join(", ")} — for the commands written in the
                         README and the Makefile. Guessed from npx, pnpm dlx…
  -f, --force            Write into a directory that is not empty.
      --dry-run          List the files instead of writing them.
  -y, --yes              Never ask: take the defaults for whatever is missing.
  -h, --help             Show this.

Examples
  npx react-resource-view init my-admin
  npx react-resource-view init my-admin -b spring-boot -u http://localhost:8080
  pnpm dlx react-resource-view init back-office -b api-platform -y
`

/** The `init` command line, as an object — `{ error }` rather than a throw. */
export function parseInitArgs(argv) {
  const options = {
    directory: undefined,
    backend: undefined,
    apiUrl: undefined,
    schemaUrl: undefined,
    pm: undefined,
    force: false,
    dryRun: false,
    yes: false,
    help: false,
  }

  const rest = [...argv]
  const value = (flag) => {
    const next = rest.shift()
    return next === undefined || next.startsWith("-")
      ? { error: `${flag} needs a value.` }
      : next
  }

  while (rest.length) {
    const arg = rest.shift()

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true
        break
      case "-f":
      case "--force":
        options.force = true
        break
      case "-y":
      case "--yes":
        options.yes = true
        break
      case "--dry-run":
        options.dryRun = true
        break
      case "-b":
      case "--backend":
      case "-u":
      case "--api-url":
      case "-s":
      case "--schema-url":
      case "--pm": {
        const next = value(arg)
        if (typeof next !== "string") return { ...options, ...next }
        if (arg === "-b" || arg === "--backend") options.backend = next
        else if (arg === "-u" || arg === "--api-url") options.apiUrl = next
        else if (arg === "-s" || arg === "--schema-url") options.schemaUrl = next
        else options.pm = next
        break
      }
      default:
        if (arg.startsWith("-")) {
          return { ...options, error: `Unknown option: ${arg}` }
        }
        if (options.directory !== undefined) {
          return { ...options, error: `Unexpected argument: ${arg}` }
        }
        options.directory = arg
    }
  }

  if (options.backend !== undefined) {
    const backend = resolveBackend(options.backend)
    if (!backend) {
      return {
        ...options,
        error: `"${options.backend}" is not a backend this starter knows — pick one of ${BACKEND_IDS.join(", ")}.`,
      }
    }
    options.backend = backend
  }

  for (const [flag, url] of [
    ["--api-url", options.apiUrl],
    ["--schema-url", options.schemaUrl],
  ]) {
    if (url !== undefined && !isUrlOrFile(url)) {
      return { ...options, error: `${flag}: "${url}" is not an http(s) URL.` }
    }
  }

  if (options.pm !== undefined && !PACKAGE_MANAGERS.includes(options.pm)) {
    return {
      ...options,
      error: `--pm: pick one of ${PACKAGE_MANAGERS.join(", ")}.`,
    }
  }

  return options
}

/** An API URL, or — for a schema — a file api-dumper can read just as well. */
function isUrlOrFile(value) {
  return /^https?:\/\/[^\s]+$/i.test(value) || /\.(json|ya?ml)$/i.test(value)
}

/* -------------------------------------------------------------------------- */
/* Running it                                                                 */
/* -------------------------------------------------------------------------- */

async function isEmptyDirectory(path) {
  if (!existsSync(path)) return true
  const entries = await readdir(path)
  // A fresh `git init` is as good as empty.
  return entries.every((entry) => entry === ".git")
}

export async function runInit(
  argv,
  { cwd = process.cwd(), log = console.log, ask }
) {
  const options = parseInitArgs(argv)

  if (options.error) {
    console.error(`${options.error}\n\n${INIT_USAGE}`)
    return 1
  }
  if (options.help) {
    log(INIT_USAGE)
    return 0
  }

  const interactive = !options.yes && Boolean(ask)

  const directory =
    options.directory ??
    (interactive
      ? await ask("Project directory? [my-admin]", "my-admin")
      : "my-admin")

  let backend = options.backend
  if (!backend) {
    if (interactive) {
      const menu = BACKEND_IDS.map(
        (id, index) => `  ${index + 1}. ${BACKENDS[id].label}`
      ).join("\n")
      const answer = await ask(
        `Which API does it talk to?\n${menu}\nChoice [1]`,
        "1"
      )
      backend = resolveBackend(answer)
      if (!backend) {
        console.error(`"${answer}" is not one of the choices.`)
        return 1
      }
    } else {
      backend = BACKEND_IDS[0]
    }
  }

  const fallbackApiUrl = BACKENDS[backend].apiUrl
  const apiUrl =
    options.apiUrl ??
    (interactive
      ? await ask(`URL of the API? [${fallbackApiUrl}]`, fallbackApiUrl)
      : fallbackApiUrl)

  let schemaUrl = options.schemaUrl
  if (schemaUrl === undefined && BACKENDS[backend].schemaPath !== null) {
    const guessed = defaultSchemaUrl(backend, apiUrl)
    schemaUrl = interactive
      ? await ask(`URL of its OpenAPI schema? [${guessed}]`, guessed)
      : guessed
  }

  for (const [label, url] of [
    ["API URL", apiUrl],
    ["Schema URL", schemaUrl],
  ]) {
    if (url !== undefined && !isUrlOrFile(url)) {
      console.error(`${label}: "${url}" is not an http(s) URL.`)
      return 1
    }
  }

  const pm = options.pm ?? detectPackageManager()
  const root = isAbsolute(directory) ? directory : resolve(cwd, directory)
  const name = basename(root)
  const files = renderStarter({ name, backend, apiUrl, schemaUrl, pm })
  const where = relative(cwd, root) || "."

  if (options.dryRun) {
    log(
      Object.keys(files)
        .map((path) => join(where, path))
        .join("\n")
    )
    return 0
  }

  if (!options.force && !(await isEmptyDirectory(root))) {
    console.error(`${where} is not empty. Pass --force to write into it anyway.`)
    return 1
  }

  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, "utf8")
  }

  const dumps = BACKENDS[backend].schemaPath !== null
  const cd = where === "." ? "" : `  cd ${where}\n`

  log(`Created ${where} — a back office on ${BACKENDS[backend].label}.

${cd}  ${pm} install
  ${runScript(pm, "api-schema")}   # dumps ${dumps ? schemaUrl : "the Supabase types"} into src/api-schema/
  ${runScript(pm, "dev")}

The API is ${apiUrl} (VITE_API_URL in .env), and the example resource is
src/resources/${BACKENDS[backend].sample.id}.ts.
Documentation: https://hermez.dev/react-resource-view/docs/resource-view/starter`)

  return 0
}

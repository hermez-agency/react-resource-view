#!/usr/bin/env node
/**
 * react-resource-view — command line.
 *
 * Two commands: `init` starts a whole project on an API (see ./init.mjs), and
 * `create-view-variant` writes a layout of one's own where the reader wants
 * it, and `migrate` rewrites 0.x declarations into 1.0.
 *
 * Both are templates rather than a framework — which is why the command line
 * has no dependency and no build step. It is shipped as it is written, and
 * `npx react-resource-view <command>` runs it.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { existsSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { pathToFileURL } from "node:url"
import { stdin, stdout } from "node:process"
import { runInit } from "./init.mjs"
import { runMigrate } from "./migrate.mjs"

const COMMANDS = ["create-view-variant", "view-variant", "create-layout"]

/** `init`, under the names someone reaching for a starter would type. */
const INIT_COMMANDS = ["init", "create", "new"]

/** The directories a project is likely to keep its views in, best first. */
const LIKELY_DIRECTORIES = [
  "src/views",
  "src/components/views",
  "src/components",
  "app/views",
  "src",
]

export const USAGE = `react-resource-view — command line

Commands
  init [directory]              Start a project on your API: API Platform,
                                Spring Boot, Supabase, Strapi, FastAPI or any
                                REST API. See \`init --help\`.
  create-view-variant [name]    Write a layout of your own — below.
  migrate [paths…]              Rewrite 0.x declarations into 1.0. See
                                \`migrate --help\`.

Usage
  npx react-resource-view init [directory] [options]
  npx react-resource-view create-view-variant [name] [options]
  npx react-resource-view migrate [paths…] [options]

Arguments
  name                 The layout's name, as the layout switcher shows it
                       ("Heatmap", "Kanban board"). Asked for when omitted.

Options
  -d, --dir <path>     Where to write the file. Asked for when omitted.
  -i, --icon <name>    A lucide-react icon for the switcher (default: LayoutGrid).
      --jsx            Write JavaScript (.jsx) rather than TypeScript (.tsx).
  -f, --force          Overwrite the file if it already exists.
      --dry-run        Print the file instead of writing it.
  -y, --yes            Never ask: take the defaults for whatever is missing.
  -h, --help           Show this.

Examples
  npx react-resource-view create-view-variant Heatmap --dir src/views
  npx react-resource-view create-view-variant "Kanban board" -i Columns3 --jsx
`

/* -------------------------------------------------------------------------- */
/* Naming                                                                     */
/* -------------------------------------------------------------------------- */

/** The words of a name, however it was typed: "kanban-board", "KanbanBoard"… */
export function toWords(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
}

export function toPascalCase(value) {
  return toWords(value)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("")
}

export function toCamelCase(value) {
  const pascal = toPascalCase(value)
  return pascal ? pascal[0].toLowerCase() + pascal.slice(1) : ""
}

/**
 * The id the layout answers to in the URL.
 *
 * The generated file passes it as the layout's `type`, so the CLI can tell the
 * reader the address their layout will live at.
 */
export function toSlug(value) {
  return toWords(value)
    .map((word) => word.toLowerCase())
    .join("-")
}

/* -------------------------------------------------------------------------- */
/* The template                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The layout, as a single file.
 *
 * Everything the file needs is exported by the package, so what lands in the
 * project is readable on its own: three components, one function building the
 * layout, and the comments that say which of them draws what.
 */
export function renderViewVariant({ name, icon = "LayoutGrid", jsx = false }) {
  const Pascal = toPascalCase(name)
  const camel = toCamelCase(name)
  const slug = toSlug(name)
  const optionsInterface = `${Pascal}Options`

  /** A type annotation, dropped when the target is JavaScript. */
  const t = (annotation) => (jsx ? "" : annotation)

  const typeImports = jsx
    ? ""
    : `  type ItemComponentPropsInterface,
  type LayoutOptions,
  type ListComponentPropsInterface,
  type RowComponentPropsInterface,
`

  const optionsBlock = jsx
    ? ""
    : `/**
 * The options of this layout, on top of those every layout takes (\`id\`,
 * \`label\`, \`fields\`…). They are read back with \`useLayout().options\`.
 * \`dense\` is an example: replace it with your own.
 */
export interface ${optionsInterface} {
  dense?: boolean
}

`

  return `/**
 * ${name} — a layout for react-resource-view.
 *
 * A layout draws a list with three components, and nothing else:
 *
 *   list  draws the whole collection
 *   row   draws one record
 *   item  draws one field of a record
 *
 * Declare it beside the built-in ones and the reader gets a switcher; the
 * choice travels in the URL as "${slug}".
 *
 *   views: { list: { layouts: [layout.table(), ${camel}Layout()] } }
 */
// Any component taking a \`className\` does for an icon; lucide-react is what
// the package's own layouts use — \`npm i lucide-react\` if you have not got it.
import { ${icon} } from "lucide-react"
import {
  ItemRender,
  layout,
  ListPagination,
  ListResourceViewButton,
  useLayout,
${typeImports}} from "react-resource-view"

${optionsBlock}/**
 * One field of a record.
 *
 * \`ItemRender\` is the package's own value renderer — booleans, relations,
 * arrays and objects included. Anything else you write here replaces it.
 */
export function ${Pascal}Item({ formInput }${t(": ItemComponentPropsInterface")}) {
  if (!formInput) return null

  return <>{ItemRender(formInput.value)}</>
}

/**
 * One record.
 *
 * \`row.data\` is the record as the API answered it. The keys the API adds —
 * "@id", "@type", "id" — are dropped rather than drawn.
 */
export function ${Pascal}Row({ row }${t(": RowComponentPropsInterface")}) {
  const data = row?.data ?? {}
  const fields = Object.entries(data).filter(
    ([key]) => !key.startsWith("@") && key !== "id"
  )

  return (
    <div className="min-w-0 space-y-1">
      {fields.map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{key}</span>
          {/* A value is drawn as a paragraph, whose top margin is meant for
              prose rather than for a row of fields. */}
          <div className="min-w-0 [&_p]:mt-0">
            <${Pascal}Item formInput={{ name: key, value }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The whole collection.
 *
 * \`rows\` is what the current page holds, already filtered and paginated.
 * \`useLayout\` gives this layout's own options; \`useCurrentViewResourceContext\`
 * the rest — the resource, the loading state, the filters.
 */
export function ${Pascal}List({ rows = [] }${t(": ListComponentPropsInterface")}) {
  const { dense = false } = useLayout${t(`<${optionsInterface}>`)}().options

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing to show yet
      </p>
    )
  }

  return (
    <div className="w-full">
      <ul className={dense ? "space-y-1" : "space-y-3"}>
        {rows.map((row, index) => (
          <li
            key={"row-" + index}
            className="flex items-center gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <${Pascal}Row row={row} />
            </div>
            {/* Edit and delete, filtered by the resource's permissions. */}
            <div className="shrink-0">
              <ListResourceViewButton data={row.data} />
            </div>
          </li>
        ))}
      </ul>

      {/* The pager reads the collection's total; leaving it out is a choice. */}
      <div className="mt-4">
        <ListPagination />
      </div>
    </div>
  )
}

/**
 * The layout.
 *
 * Whatever is passed wins over what is written here, so a resource can still
 * adjust it on the spot:
 *
 *   ${camel}Layout({ label: "Compact", dense: true })
 */
export default function ${camel}Layout(
  { dense = false, components, ...options }${t(`: LayoutOptions & ${optionsInterface}`)} = {}
) {
  return layout.custom({
    type: "${slug}",
    label: "${name}",
    icon: ${icon},
    ...options,
    components: {
      list: ${Pascal}List,
      row: ${Pascal}Row,
      item: ${Pascal}Item,
      ...components,
    },
    options: { dense },
  })
}
`
}

/* -------------------------------------------------------------------------- */
/* Arguments                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The command line, as an object.
 *
 * Returns `{ error }` rather than throwing: the caller prints it next to the
 * usage, which is more use than a stack trace.
 */
export function parseCliArgs(argv) {
  const options = {
    command: undefined,
    name: undefined,
    dir: undefined,
    icon: undefined,
    jsx: false,
    force: false,
    dryRun: false,
    yes: false,
    help: false,
  }

  const rest = [...argv]

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
      case "--jsx":
      case "--js":
        options.jsx = true
        break
      case "-d":
      case "--dir":
        options.dir = rest.shift()
        if (!options.dir) return { ...options, error: "--dir needs a path." }
        break
      case "-i":
      case "--icon":
        options.icon = rest.shift()
        if (!options.icon) return { ...options, error: "--icon needs a name." }
        break
      default: {
        if (arg.startsWith("-")) {
          return { ...options, error: `Unknown option: ${arg}` }
        }
        if (!options.command && COMMANDS.includes(arg)) {
          options.command = arg
          break
        }
        if (options.name !== undefined) {
          return { ...options, error: `Unexpected argument: ${arg}` }
        }
        options.name = arg
      }
    }
  }

  if (options.icon !== undefined && !/^[A-Z][A-Za-z0-9]*$/.test(options.icon)) {
    return {
      ...options,
      error: `"${options.icon}" is not a lucide-react icon name — those are written like "LayoutGrid".`,
    }
  }

  if (options.name !== undefined && !toWords(options.name).length) {
    return {
      ...options,
      error: `"${options.name}" has no letter or digit in it, so it cannot name a layout.`,
    }
  }

  return options
}

/** The file the layout goes into, and how to talk about it. */
export function resolveTarget({ name, dir, jsx = false, cwd = process.cwd() }) {
  const fileName = `${toCamelCase(name)}Layout.${jsx ? "jsx" : "tsx"}`
  const directory = isAbsolute(dir) ? dir : resolve(cwd, dir)
  const path = join(directory, fileName)

  return { directory, fileName, path, relativePath: relative(cwd, path) || path }
}

/**
 * The directory to offer when none was given.
 *
 * A project that keeps its views somewhere obvious should not have to type the
 * path; one that does not gets the current directory and a prompt.
 */
export function guessDirectory(cwd = process.cwd()) {
  return (
    LIKELY_DIRECTORIES.find((candidate) => existsSync(join(cwd, candidate))) ?? "."
  )
}

/* -------------------------------------------------------------------------- */
/* Running it                                                                 */
/* -------------------------------------------------------------------------- */

async function ask(question, fallback) {
  const rl = createInterface({ input: stdin, output: stdout })

  try {
    const answer = (await rl.question(`${question} `)).trim()
    return answer || fallback
  } finally {
    rl.close()
  }
}

export async function run(argv, { cwd = process.cwd(), log = console.log } = {}) {
  if (argv[0] === "migrate") {
    return runMigrate(argv.slice(1), { cwd, log })
  }

  if (INIT_COMMANDS.includes(argv[0])) {
    const interactive = stdin.isTTY && stdout.isTTY
    return runInit(argv.slice(1), { cwd, log, ask: interactive ? ask : undefined })
  }

  const options = parseCliArgs(argv)

  if (options.error) {
    console.error(`${options.error}\n\n${USAGE}`)
    return 1
  }

  if (options.help || (!options.command && options.name === undefined)) {
    log(USAGE)
    return options.help ? 0 : 1
  }

  if (!options.command) {
    // A name with no command reads as one — `npx react-resource-view Heatmap`
    // is what someone types before reading the usage, and it means this.
    options.command = COMMANDS[0]
  }

  const interactive = !options.yes && stdin.isTTY && stdout.isTTY

  let name = options.name
  if (!name) {
    if (!interactive) {
      console.error(`A name is needed.\n\n${USAGE}`)
      return 1
    }
    name = await ask("Name of the layout? (e.g. Heatmap)", "")
    if (!toWords(name).length) {
      console.error("A layout needs a name with a letter in it.")
      return 1
    }
  }

  const suggestedDirectory = guessDirectory(cwd)
  const dir =
    options.dir ??
    (interactive
      ? await ask(`Where should it go? [${suggestedDirectory}]`, suggestedDirectory)
      : suggestedDirectory)

  const icon = options.icon ?? "LayoutGrid"
  const target = resolveTarget({ name, dir, jsx: options.jsx, cwd })
  const content = renderViewVariant({ name, icon, jsx: options.jsx })

  if (options.dryRun) {
    log(content)
    return 0
  }

  if (existsSync(target.path) && !options.force) {
    console.error(
      `${target.relativePath} already exists. Pass --force to overwrite it.`
    )
    return 1
  }

  await mkdir(dirname(target.path), { recursive: true })
  await writeFile(target.path, content, "utf8")

  const camel = `${toCamelCase(name)}Layout`

  log(`Created ${target.relativePath}

Declare it on a resource, and the reader gets a switcher:

  import ${camel} from "./${camel}"

  views: { list: { layouts: [layout.table(), ${camel}()] } },

The layout answers to "${toSlug(name)}" in the URL.
Documentation: https://hermez.dev/react-resource-view/docs/resource-view/custom-variant`)

  return 0
}

/**
 * Only run when this file *is* the command.
 *
 * npm installs a bin as a symlink, so the path node was given and the path of
 * this module are the same file under two names — hence the realpath.
 */
function invokedAsCommand() {
  const entry = process.argv[1]
  if (!entry) return false

  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url
  } catch {
    return false
  }
}

if (invokedAsCommand()) {
  process.exitCode = await run(process.argv.slice(2))
}

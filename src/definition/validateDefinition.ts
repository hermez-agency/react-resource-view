import { isPlainObject } from "@/definition/mergeDefinition"
import { getPorts } from "@/ports"
import { LEGACY_HINTS, LEGACY_KEYS } from "@/definition/legacyKeys"

/**
 * The development checks of a declaration.
 *
 * A key the library does not read used to be ignored without a word, and a
 * resource without `path` quietly kept its data in the browser. In
 * development, `createViewResource` and `layout.*` now say what is wrong and
 * how to write it — a 0.x key gets the exact 1.0 rewrite, the one
 * `migrations/1.0.json` gives; a typo gets the closest key. Nothing is checked
 * in production.
 */

/**
 * Whether the checks run: the bundler's `process.env.NODE_ENV` — replaced at
 * build time by every React toolchain — or the `isDev` port.
 */
export function isDevelopment(): boolean {
  if (getPorts().isDev) return true
  try {
    return process.env.NODE_ENV !== "production"
  } catch {
    // No `process` and no bundler to replace it: a page loaded as it is.
    return false
  }
}

export interface DefinitionProblem {
  level: "error" | "warning"
  /** Where in the declaration: `views.update.behavior`. */
  path: string
  message: string
}

/* -------------------------------------------------------------------------- */
/* What may be declared, level by level                                       */
/* -------------------------------------------------------------------------- */

const COMMON_KEYS = [
  "form",
  "fullWidth",
  "titleField",
  "className",
  "components",
  "description",
]
const ACTION_KEYS = ["title", "buttonLabel"]

export const KNOWN_KEYS: Record<string, string[]> = {
  resource: [
    ...COMMON_KEYS,
    "name",
    "icon",
    "alias",
    "path",
    "storage",
    "dialect",
    "repository",
    "hooks",
    "realtime",
    "optimistic",
    "permissions",
    "quota",
    "views",
  ],
  views: ["list", "read", "create", "update", "delete"],
  "view:list": [
    ...COMMON_KEYS,
    ...ACTION_KEYS,
    "layouts",
    "filters",
    "pageSize",
    "sort",
    "rowActions",
    "selectable",
    "bulkActions",
  ],
  "view:read": [...COMMON_KEYS, ...ACTION_KEYS, "open", "expandable", "tabs"],
  "view:create": [
    ...COMMON_KEYS,
    ...ACTION_KEYS,
    "open",
    "expandable",
    "afterSave",
    "optimistic",
  ],
  "view:update": [
    ...COMMON_KEYS,
    ...ACTION_KEYS,
    "open",
    "expandable",
    "afterSave",
    "optimistic",
    "tabs",
  ],
  "view:delete": [
    ...COMMON_KEYS,
    ...ACTION_KEYS,
    "open",
    "expandable",
    "optimistic",
  ],
  components: [
    "view",
    "list",
    "row",
    "item",
    "wrapper",
    "navigation",
    "title",
    "actions",
    "top",
    "bottom",
    "pagination",
    "empty",
    "error",
  ],
  tabs: ["orientation", "aside", "items"],
  tab: [
    "id",
    "label",
    "description",
    "icon",
    "resource",
    "action",
    "filter",
    "defaultData",
    "component",
  ],
  hooks: [
    "beforeList",
    "beforeRead",
    "beforeCreate",
    "beforeUpdate",
    "beforeDelete",
    "afterSave",
    "afterDelete",
  ],
  repository: ["getCollection", "getItem", "createItem", "updateItem", "removeItem"],
  quota: ["get", "fallback"],
  permissions: ["list", "read", "create", "update", "delete", "export", "move"],
}

/** Where a key belongs, for a key written at the wrong level. */
const HOME_OF: Record<string, string> = {
  layouts: "views.list.layouts",
  filters: "views.list.filters",
  pageSize: "views.list.pageSize",
  rowActions: "views.list.rowActions",
  open: "views.<action>.open (read, create, update or delete)",
  expandable: "views.<action>.expandable (read, create, update or delete)",
  afterSave: "views.create.afterSave or views.update.afterSave",
  tabs: "views.read.tabs or views.update.tabs",
  title: "views.<action>.title",
  buttonLabel: "views.<action>.buttonLabel",
  groupBy: "layout.board({ groupBy }) or layout.timeline({ groupBy })",
  openRecord: "views.read.open",
  selectable: "views.list.selectable",
  bulkActions: "views.list.bulkActions",
  realtime: "the root of the resource",
  permissions: "the root of the resource",
  hooks: "the root of the resource",
  storage: "the root of the resource",
  path: "the root of the resource",
}

/* -------------------------------------------------------------------------- */
/* The 0.x keys (see legacyKeys.ts)                                          */
/* -------------------------------------------------------------------------- */

interface LegacyHint {
  id: string
  hint: string
}

let legacy: Map<string, LegacyHint> | undefined

/** The 1.0 rewrite of a 0.x key found at `level`, if it is one. */
export function legacyHint(level: string, key: string): LegacyHint | undefined {
  legacy ??= new Map(
    LEGACY_KEYS.map(([where, name, id]) => [
      `${where}:${name}`,
      { id, hint: LEGACY_HINTS[id] },
    ])
  )

  return legacy.get(`${level}:${key}`)
}

/* -------------------------------------------------------------------------- */
/* Suggestions                                                                */
/* -------------------------------------------------------------------------- */

function distance(a: string, b: string): number {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  const row = Array.from({ length: y.length + 1 }, (_, i) => i)

  for (let i = 1; i <= x.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= y.length; j++) {
      const current = row[j]
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (x[i - 1] === y[j - 1] ? 0 : 1)
      )
      previous = current
    }
  }

  return row[y.length]
}

/** The known key closest to a typo, when one is close enough. */
export function closestKey(key: string, known: string[]): string | undefined {
  let best: string | undefined
  let bestDistance = Infinity
  for (const candidate of known) {
    const d = distance(key, candidate)
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }

  return bestDistance <= Math.max(2, Math.floor(key.length / 3)) ? best : undefined
}

function unknownKeyMessage(
  key: string,
  known: string[],
  legacyLevels: string[]
): string {
  for (const level of legacyLevels) {
    const legacy = legacyHint(level, key)
    if (legacy) {
      return `\`${key}\` is a 0.x key (${legacy.id}): ${legacy.hint}`
    }
  }

  const closest = closestKey(key, known)
  if (closest) {
    return `\`${key}\` does not exist here — did you mean \`${closest}\`?`
  }

  const home = HOME_OF[key]
  if (home) return `\`${key}\` does not belong here: it goes in ${home}.`

  return `\`${key}\` does not exist here. Expected one of: ${known.join(", ")}.`
}

/* -------------------------------------------------------------------------- */
/* The checks                                                                 */
/* -------------------------------------------------------------------------- */

function checkKeys(
  value: unknown,
  path: string,
  knownLevel: string,
  legacyLevels: string[],
  problems: DefinitionProblem[]
): Record<string, any> | undefined {
  if (!isPlainObject(value)) return undefined
  const known = KNOWN_KEYS[knownLevel]

  for (const key of Object.keys(value)) {
    if (known.includes(key)) continue
    problems.push({
      level: "error",
      path,
      message: unknownKeyMessage(key, known, legacyLevels),
    })
  }

  return value
}

const ACTIONS = ["list", "read", "create", "update", "delete"] as const

/** The title a view gets when it declares none. */
export function derivedTitle(action: string, name: string): string {
  const prefix: Record<string, string> = {
    create: "Create",
    update: "Edit",
    delete: "Delete",
  }

  return prefix[action] ? `${prefix[action]} — ${name}` : name
}

/**
 * Lists what is wrong with a declaration, without throwing. The rules are
 * those of the types, plus what the types cannot say: a resource with nowhere
 * to read its data from, two layouts sharing a URL id.
 */
export function inspectDefinition(
  id: string,
  definition: Record<string, any>,
  name: string
): DefinitionProblem[] {
  const problems: DefinitionProblem[] = []

  checkKeys(definition, "(root)", "resource", ["resource", "view"], problems)
  checkKeys(
    definition.components,
    "components",
    "components",
    ["components"],
    problems
  )
  checkKeys(definition.hooks, "hooks", "hooks", [], problems)
  checkKeys(definition.repository, "repository", "repository", [], problems)
  checkKeys(definition.quota, "quota", "quota", [], problems)
  checkPermissions(definition.permissions, problems)

  const views = checkKeys(definition.views, "views", "views", [], problems) ?? {}
  for (const action of ACTIONS) {
    const path = `views.${action}`
    const view = checkKeys(
      views[action],
      path,
      `view:${action}`,
      ["view", "resource"],
      problems
    )
    if (!view) continue

    if (isPlainObject(view.behavior)) {
      for (const key of Object.keys(view.behavior)) {
        const legacy = legacyHint("behavior", key)
        if (legacy) {
          problems.push({
            level: "error",
            path: `${path}.behavior`,
            message: `\`${key}\` (${legacy.id}): ${legacy.hint}`,
          })
        }
      }
    }

    checkKeys(
      view.components,
      `${path}.components`,
      "components",
      ["components"],
      problems
    )

    const tabs = checkKeys(view.tabs, `${path}.tabs`, "tabs", [], problems)
    if (tabs && Array.isArray(tabs.items)) {
      tabs.items.forEach((tab: unknown, index: number) =>
        checkKeys(tab, `${path}.tabs.items[${index}]`, "tab", ["tab"], problems)
      )
    }

    if (
      typeof view.title === "string" &&
      view.title === derivedTitle(action, name)
    ) {
      problems.push({
        level: "warning",
        path: `${path}.title`,
        message: `"${view.title}" is the title this view gets anyway: the line can go.`,
      })
    }

    if (action === "list" && Array.isArray(view.layouts)) {
      const seen = new Set<string>()
      for (const layout of view.layouts) {
        if (!layout || typeof layout !== "object" || !("type" in layout)) {
          problems.push({
            level: "error",
            path: `${path}.layouts`,
            message:
              "a layout is built with `layout.table()`, `layout.board({ … })`… — not written by hand.",
          })
          continue
        }
        if (seen.has(layout.id)) {
          problems.push({
            level: "error",
            path: `${path}.layouts`,
            message: `two layouts answer to the URL id "${layout.id}": give one of them an \`id\`.`,
          })
        }
        seen.add(layout.id)
      }
    }
  }

  if (definition.path && definition.storage) {
    problems.push({
      level: "error",
      path: "(root)",
      message:
        '`path` and `storage: "local"` both say where the data lives: keep one.',
    })
  }

  if (
    !definition.path &&
    !definition.storage &&
    !hasCompleteRepository(definition)
  ) {
    if (!rendersWithoutData(definition)) {
      problems.push({
        level: "error",
        path: "(root)",
        message: `no data source. Declare \`path: "/api/…"\` to talk to the API, or \`storage: "local"\` to keep the records in the browser — "${id}" no longer falls back on localStorage silently.`,
      })
    }
  }

  return problems
}

function checkPermissions(permissions: unknown, problems: DefinitionProblem[]) {
  if (permissions === undefined) return
  const known = KNOWN_KEYS.permissions

  if (typeof permissions === "string") {
    if (permissions !== "all" && permissions !== "readonly") {
      problems.push({
        level: "error",
        path: "permissions",
        message: `"${permissions}" is not a permission shortcut: "all" or "readonly".`,
      })
    }
    return
  }

  const keys = Array.isArray(permissions)
    ? permissions
    : isPlainObject(permissions)
      ? Object.keys(permissions)
      : []
  for (const key of keys) {
    if (known.includes(key)) continue
    const closest = closestKey(String(key), known)
    problems.push({
      level: "error",
      path: "permissions",
      message: `"${key}" is not an action${closest ? ` — did you mean "${closest}"?` : `: ${known.join(", ")}.`}`,
    })
  }
}

function hasCompleteRepository(definition: Record<string, any>): boolean {
  const repository = definition.repository
  if (!isPlainObject(repository)) return false

  return KNOWN_KEYS.repository.every((key) => typeof repository[key] === "function")
}

/** A resource whose screens are all components of its own needs no data. */
function rendersWithoutData(definition: Record<string, any>): boolean {
  return Boolean(
    definition.components?.view ?? definition.views?.list?.components?.view
  )
}

function report(subject: string, problems: DefinitionProblem[]): void {
  const errors = problems.filter((problem) => problem.level === "error")
  const warnings = problems.filter((problem) => problem.level === "warning")
  const line = (problem: DefinitionProblem) =>
    `  - ${problem.path}: ${problem.message}`

  if (warnings.length) {
    console.warn(`${subject}:\n${warnings.map(line).join("\n")}`)
  }
  if (errors.length) {
    throw new Error(
      `${subject}: ${errors.length} problem${errors.length > 1 ? "s" : ""} in the declaration.\n${errors.map(line).join("\n")}\nSee MIGRATION-1.0.md, or run \`npx react-resource-view migrate\` on a 0.x declaration.`
    )
  }
}

/** Checks a declaration in development; throws on what cannot work. */
export function validateDefinition(
  id: string,
  definition: Record<string, any>,
  name: string
): void {
  if (!isDevelopment()) return
  report(`createViewResource("${id}")`, inspectDefinition(id, definition, name))
}

/** Checks the options given to `layout.<type>()` in development. */
export function checkLayoutOptions(
  type: string,
  options: Record<string, any>,
  known: readonly string[]
): void {
  if (!isDevelopment()) return
  const problems: DefinitionProblem[] = []

  for (const key of Object.keys(options)) {
    if (known.includes(key)) continue
    problems.push({
      level: "error",
      path: key,
      message: unknownKeyMessage(
        key,
        [...known],
        [`layout:${type}`, "layout", "behavior"]
      ),
    })
  }

  if (type === "board") {
    if (!options.groupBy) {
      problems.push({
        level: "error",
        path: "groupBy",
        message:
          'a board needs `groupBy`: the field a card\'s column is read from (`groupBy: "status"`).',
      })
    }
    if (!Array.isArray(options.columns)) {
      problems.push({
        level: "error",
        path: "columns",
        message:
          "a board needs `columns`: one `{ value, label }` per column, in order.",
      })
    }
  }

  report(`layout.${type}()`, problems)
}

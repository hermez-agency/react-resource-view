import { isPlainObject, mergeDefinition } from "@/definition/mergeDefinition"
import { columnsFromForm } from "@/definition/boardColumns"
import { getPorts } from "@/ports"
import { resolveDialect } from "@/api/apiConfig"
import { LEGACY_HINTS, LEGACY_KEYS } from "@/definition/legacyKeys"
import { findResource } from "@/utils/findResource"
import { getRegisteredOpenFrames, getResourceViewDefaults } from "@/ResourceConfig"
import { slugify } from "@/views/list/savedViews/savedViews"

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

const FORM_KEYS = [
  "id",
  "action",
  "name",
  "icon",
  "error",
  "loading",
  "isBuilt",
  "validator",
  "inputs",
  "onSubmit",
  "className",
  "saveOnChange",
  "errors",
  "allowGeneratedValue",
  "version",
  "label",
  "components",
  "data",
  "getData",
  "originalData",
  "controller",
  "groups",
  "groupOption",
]

export const KNOWN_KEYS: Record<string, string[]> = {
  resource: [
    ...COMMON_KEYS,
    "name",
    "icon",
    "alias",
    "path",
    "storage",
    "dialect",
    "idField",
    "repository",
    "hooks",
    "realtime",
    "optimistic",
    "permissions",
    "quota",
    "singleton",
    "views",
  ],
  views: ["list", "read", "create", "update", "delete"],
  "view:list": [
    ...COMMON_KEYS,
    ...ACTION_KEYS,
    "layouts",
    "filters",
    "pageSize",
    "empty",
    "sort",
    "rowActions",
    "selectable",
    "bulkActions",
    "presets",
    "savedViews",
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
  // `FormInterface` of react-data-form
  form: FORM_KEYS,
  // A form, plus the values applied before any filter is chosen
  filters: [...FORM_KEYS, "initial"],
  sort: ["fields", "initial"],
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
  singleton: ["id", "get", "action", "defaultData"],
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
  groupBy: "layout.board({ groupBy }), layout.timeline({ groupBy }), layout.table({ groupBy }) or layout.cards({ groupBy })",
  openRecord: "views.read.open",
  selectable: "views.list.selectable",
  bulkActions: "views.list.bulkActions",
  presets: "views.list.presets",
  savedViews: "views.list.savedViews",
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
  checkKeys(definition.form, "form", "form", [], problems)
  checkKeys(definition.hooks, "hooks", "hooks", [], problems)
  checkKeys(definition.repository, "repository", "repository", [], problems)
  checkKeys(definition.quota, "quota", "quota", [], problems)
  checkSingleton(definition.singleton, problems)
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

    checkKeys(view.form, `${path}.form`, "form", [], problems)
    if (action === "list") {
      checkKeys(view.filters, `${path}.filters`, "filters", [], problems)
      checkKeys(view.sort, `${path}.sort`, "sort", [], problems)
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
      tabs.items.forEach((item: unknown, index: number) => {
        const tabPath = `${path}.tabs.items[${index}]`
        const tab = checkKeys(item, tabPath, "tab", ["tab"], problems)
        if (tab) checkTab(tab, tabPath, id, problems)
      })
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

    checkValues(view, path, problems)
    checkFieldReferences(definition, view, action, path, problems)
    if (action === "list") checkTableForm(definition, view, path, problems)
    if (action === "list") checkBoardColumns(definition, view, path, problems)

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

  const rootInputs = [
    ...inputNames(getResourceViewDefaults()),
    ...inputNames(definition),
  ]
  if (
    typeof definition.titleField === "string" &&
    rootInputs.length &&
    !rootInputs.includes(definition.titleField.split(".")[0])
  ) {
    const closest = closestKey(definition.titleField, rootInputs)
    problems.push({
      level: "warning",
      path: "titleField",
      message: `\`${definition.titleField}\` is not an input of the form${closest ? ` — did you mean \`${closest}\`?` : ""}`,
    })
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

  checkJsonLdPath(definition, problems)

  return problems
}

/**
 * A JSON-LD `path` is glued to the API's `baseUrl` as it is: without its
 * leading `/` it lands on another host (`https://api.example.comapi/books`).
 * And a Mercure topic is only built for an IRI under `/api/`, the prefix
 * `isApiIri` recognises: elsewhere `realtime: true` opens nothing.
 */
function checkJsonLdPath(
  definition: Record<string, any>,
  problems: DefinitionProblem[]
) {
  const { path } = definition
  if (typeof path !== "string" || !path) return
  const dialect = resolveDialect(definition)
  if (!dialect.referencesAreIris) return

  const isAbsolute = /^[a-z][a-z\d+.-]*:\/\//i.test(path)
  if (!path.startsWith("/") && !isAbsolute) {
    problems.push({
      level: "error",
      path: "path",
      message: `"${path}" does not start with a \`/\`: it would be glued to the API's host. Write "/${path}".`,
    })
    return
  }

  const realtime = definition.realtime
  if (!realtime) return
  if (typeof realtime === "object" && realtime.subscribe) return
  if (dialect.realtimeSubscribe?.(path)) return
  if (!dialect.realtimeTopic || dialect.realtimeTopic(path)) return
  problems.push({
    level: "warning",
    path: "realtime",
    message: `"${path}" is not under \`/api/\`, so no Mercure topic is built and nothing is subscribed to. Serve the resource under \`/api/\`, or give \`realtime: { subscribe }\`.`,
  })
}

const BUILT_IN_OPEN_NAMES = ["page", "dialog", "drawer"]
const AFTER_SAVE_VALUES = ["close", "stay", "read", "reload"]
const ROW_ACTIONS = ["read", "update", "delete"]

/** Lists the values admitted, quoted: `"close", "stay"`. */
const quoted = (values: string[]) => values.map((value) => `"${value}"`).join(", ")

/** The values of a view that the types forbid but a loose declaration lets through. */
function checkValues(
  view: Record<string, any>,
  path: string,
  problems: DefinitionProblem[]
): void {
  const error = (key: string, message: string) =>
    problems.push({ level: "error", path: `${path}.${key}`, message })

  const { open, afterSave, pageSize, rowActions, layouts, presets, savedViews } =
    view

  if (open !== undefined) {
    if (isPlainObject(open)) {
      if (typeof open.type !== "string" || typeof open.placement !== "string") {
        error(
          "open",
          "a frame of one's own is built with `open.custom({ type, component })`, not written by hand."
        )
      }
    } else {
      const registered = Object.keys(getRegisteredOpenFrames())
      const admitted = [...BUILT_IN_OPEN_NAMES, ...registered]
      if (typeof open !== "string" || !admitted.includes(open)) {
        const closest =
          typeof open === "string" ? closestKey(open, admitted) : undefined
        error(
          "open",
          `${JSON.stringify(open)} is not a frame${closest ? ` — did you mean "${closest}"?` : "."} Expected one of: ${quoted(admitted)}, or \`open.custom({ … })\`. A frame of one's own is registered with \`configureResourceView({ open })\`.`
        )
      }
    }
  }

  if (afterSave !== undefined) {
    const redirect =
      isPlainObject(afterSave) && typeof afterSave.redirect === "function"
    if (!redirect && !AFTER_SAVE_VALUES.includes(afterSave)) {
      const closest =
        typeof afterSave === "string"
          ? closestKey(afterSave, AFTER_SAVE_VALUES)
          : undefined
      error(
        "afterSave",
        `${JSON.stringify(afterSave)} is not what a form does once saved${closest ? ` — did you mean "${closest}"?` : "."} Expected one of: ${quoted(AFTER_SAVE_VALUES)}, or \`{ redirect: (item) => "/…" }\`.`
      )
    }
  }

  if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1)) {
    error(
      "pageSize",
      `how many records a page holds is a whole number from 1, not ${JSON.stringify(pageSize)}: \`pageSize: 20\`.`
    )
  }

  if (rowActions !== undefined) {
    const wrong = Array.isArray(rowActions)
      ? rowActions.filter((value: unknown) => !ROW_ACTIONS.includes(value as string))
      : [rowActions]
    if (!Array.isArray(rowActions) || wrong.length) {
      const closest =
        wrong.length === 1 && typeof wrong[0] === "string"
          ? closestKey(wrong[0], ROW_ACTIONS)
          : undefined
      error(
        "rowActions",
        `${wrong.map((value: unknown) => JSON.stringify(value)).join(", ")} ${Array.isArray(rowActions) ? "is not a row action" : "is not a list of row actions"}${closest ? ` — did you mean "${closest}"?` : "."} Expected a list of: ${quoted(ROW_ACTIONS)}.`
      )
    }
  }

  if (savedViews !== undefined && typeof savedViews !== "boolean") {
    error(
      "savedViews",
      `whether readers can save views is \`true\` or \`false\`, not ${JSON.stringify(savedViews)}: \`savedViews: true\`. The views declared in code are \`presets: [{ name, filter, sort, layout }]\`.`
    )
  }

  if (presets !== undefined) checkPresets(presets, layouts, error)

  if (layouts !== undefined && !Array.isArray(layouts)) {
    error(
      "layouts",
      "`layouts` is a list: `layouts: [layout.table()]`, not `layouts: layout.table()` — a lone layout was dropped for a default table."
    )
  }
}

/** The presets of a list: a name each, a layout it declares, an id of its own. */
function checkPresets(
  presets: unknown,
  layouts: unknown,
  error: (key: string, message: string) => void
): void {
  if (!Array.isArray(presets)) {
    error(
      "presets",
      '`presets` is a list: `presets: [{ name: "Late", filter: { … } }]`.'
    )
    return
  }

  const layoutIds: string[] = Array.isArray(layouts)
    ? layouts.map((candidate) => candidate?.id ?? candidate?.type)
    : []
  const seen = new Set<string>()

  presets.forEach((preset, index) => {
    const key = `presets[${index}]`
    if (!isPlainObject(preset) || typeof preset.name !== "string" || !preset.name) {
      error(key, 'a preset has a `name`: `{ name: "Late", filter: { … } }`.')
      return
    }
    const id = String(preset.id ?? slugify(preset.name))
    if (seen.has(id)) {
      error(
        key,
        `two presets are named "${id}": give one an \`id\`, or the URL cannot tell them apart.`
      )
    }
    seen.add(id)
    if (
      typeof preset.layout === "string" &&
      layoutIds.length &&
      !layoutIds.includes(preset.layout)
    ) {
      error(
        key,
        `the layout "${preset.layout}" is not one of the list's: ${quoted(layoutIds)}.`
      )
    }
  })
}

/** The layout options that name a field of the record. */
const LAYOUT_FIELD_OPTIONS = [
  "groupBy",
  "dateField",
  "endDateField",
  "titleField",
  "colorField",
  "startField",
  "endField",
  "parentField",
  "statusField",
  "latitudeField",
  "longitudeField",
  "valueField",
  "imageField",
]

/** The names of the inputs a level of the declaration declares. */
function inputNames(level: Record<string, any> | undefined): string[] {
  const inputs = level?.form?.inputs
  return isPlainObject(inputs) ? Object.keys(inputs) : []
}

/**
 * The fields a view names — `titleField`, `sort.fields`, what its layouts
 * group by or show — are inputs of the form. A warning, not an error: a
 * computed field is no input.
 */
function checkFieldReferences(
  definition: Record<string, any>,
  view: Record<string, any>,
  action: string,
  path: string,
  problems: DefinitionProblem[]
): void {
  const defaults = getResourceViewDefaults()
  const known = new Set([
    ...inputNames(defaults),
    ...inputNames((defaults.views as Record<string, any> | undefined)?.[action]),
    ...inputNames(definition),
    ...inputNames(view),
  ])
  // Without a form there is nothing to check against.
  if (!known.size) return

  const check = (field: unknown, at: string, extra: string[] = []) => {
    if (typeof field !== "string" || !field) return
    const names = [...known, ...extra]
    if (names.includes(field) || names.includes(field.split(".")[0])) return
    const closest = closestKey(field, names)
    problems.push({
      level: "warning",
      path: at,
      message: `\`${field}\` is not an input of the form${closest ? ` — did you mean \`${closest}\`?` : ""}`,
    })
  }

  check(view.titleField, `${path}.titleField`)

  if (action !== "list") return
  if (Array.isArray(view.sort?.fields)) {
    for (const field of view.sort.fields) check(field, `${path}.sort.fields`)
  }
  if (!Array.isArray(view.layouts)) return

  for (const layout of view.layouts) {
    if (!layout || typeof layout !== "object") continue
    const at = `${path}.layouts.${layout.id}`
    const own = inputNames(layout)
    for (const field of Array.isArray(layout.fields) ? layout.fields : []) {
      check(field, `${at}.fields`, own)
    }
    for (const option of LAYOUT_FIELD_OPTIONS) {
      check(layout.options?.[option], `${at}.${option}`, own)
    }
  }
}

/** A table draws its columns from a form: without one it draws a sentence. */
function checkTableForm(
  definition: Record<string, any>,
  view: Record<string, any>,
  path: string,
  problems: DefinitionProblem[]
): void {
  if (rendersWithoutData(definition)) return
  // The table nobody asked for, drawn when `layouts` is left out, is not
  // checked: only one that is declared.
  const tables = Array.isArray(view.layouts)
    ? view.layouts.filter((layout) => layout?.type === "table")
    : []
  if (!tables.length) return

  const defaults = getResourceViewDefaults()
  const hasForm = (level: Record<string, any> | undefined) => Boolean(level?.form)
  if (
    hasForm(definition) ||
    hasForm(view) ||
    hasForm(defaults) ||
    hasForm(defaults.views?.list)
  ) {
    return
  }
  if (tables.every((table) => hasForm(table))) return

  problems.push({
    level: "warning",
    path: `${path}.layouts`,
    message:
      "a table draws its columns from the inputs of a form, and there is none: declare `form: { inputs: { … } }` at the root of the resource (or on this view, or on the layout).",
  })
}

/**
 * A board without `columns` reads them from the options of the input it
 * groups by: with none there, it has nothing to draw.
 */
function checkBoardColumns(
  definition: Record<string, any>,
  view: Record<string, any>,
  path: string,
  problems: DefinitionProblem[]
): void {
  if (!Array.isArray(view.layouts)) return
  const defaults = getResourceViewDefaults()

  for (const layout of view.layouts) {
    if (layout?.type !== "board" || layout.options?.columns !== undefined) continue
    const { groupBy } = layout.options ?? {}
    if (!groupBy) continue

    const form = mergeDefinition<Record<string, any>>(
      defaults.form,
      defaults.views?.list?.form,
      definition.form,
      view.form,
      layout.form
    )
    if (columnsFromForm(form, groupBy)) continue

    problems.push({
      level: "error",
      path: `${path}.layouts.${layout.id}.columns`,
      message: `a board needs \`columns\` — one \`{ value, label }\` per column, in order — unless the input \`${groupBy}\` of the form has \`options\` to read them from.`,
    })
  }
}

function checkSingleton(singleton: unknown, problems: DefinitionProblem[]) {
  if (singleton === undefined) return
  const error = (path: string, message: string) =>
    problems.push({ level: "error", path, message })
  const record = checkKeys(singleton, "singleton", "singleton", [], problems)
  if (!record) {
    error("singleton", "`singleton` is an object: `{ id }` or `{ get }`.")
    return
  }

  const hasId = record.id !== undefined
  const hasGet = record.get !== undefined
  if (hasId === hasGet) {
    error(
      "singleton",
      "name the record with `singleton: { id }`, or fetch it with `singleton: { get: (context) => … }` — one of the two, not both."
    )
  }
  if (hasId && typeof record.id !== "string" && typeof record.id !== "number") {
    error("singleton.id", "the identifier of the record is a string or a number.")
  }
  if (hasGet && typeof record.get !== "function") {
    error("singleton.get", "`get` is a function returning the record, or nothing.")
  }
  if (
    record.action !== undefined &&
    record.action !== "read" &&
    record.action !== "update"
  ) {
    error(
      "singleton.action",
      `${JSON.stringify(record.action)} is not a view a singleton opens: "update" or "read".`
    )
  }
}

function checkPermissions(permissions: unknown, problems: DefinitionProblem[]) {
  if (permissions === undefined) return
  const known = KNOWN_KEYS.permissions

  if (isPlainObject(permissions)) {
    for (const [key, permission] of Object.entries(permissions)) {
      if (
        permission === undefined ||
        typeof permission === "boolean" ||
        typeof permission === "function"
      ) {
        continue
      }
      problems.push({
        level: "error",
        path: `permissions.${key}`,
        message: `${JSON.stringify(permission)} is not a permission: \`true\`, \`false\`, or a function \`({ item }) => boolean\`.`,
      })
    }
  }

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

/** A tab shows a resource or a component of its own, and the resource exists. */
function checkTab(
  tab: Record<string, any>,
  path: string,
  ownId: string,
  problems: DefinitionProblem[]
): void {
  if (!tab.resource && !tab.component) {
    problems.push({
      level: "error",
      path,
      message:
        'a tab needs a `resource` (the resource or its id) or a `component`: `{ resource: "comments" }`.',
    })
    return
  }

  if (
    typeof tab.resource === "string" &&
    tab.resource !== ownId &&
    !findResource({ resourceId: tab.resource })
  ) {
    problems.push({
      level: "error",
      path: `${path}.resource`,
      message: `"${tab.resource}" is not a known resource: declare it before this one, or pass the resource itself.`,
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

const GALLERY_ASPECTS = ["4/3", "1/1", "16/9"]

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
    if (options.columns !== undefined && !Array.isArray(options.columns)) {
      problems.push({
        level: "error",
        path: "columns",
        message:
          "`columns` is an array: one `{ value, label }` per column, in order.",
      })
    }
  }

  if (type === "chart" && !options.groupBy && !options.dateField) {
    problems.push({
      level: "error",
      path: "groupBy",
      message:
        'a chart needs `groupBy` (one bar per value) or `dateField` (one column per period): `groupBy: "status"`.',
    })
  }

  if (type === "gallery") {
    if (!options.imageField) {
      problems.push({
        level: "error",
        path: "imageField",
        message:
          'a gallery needs `imageField`: the field a card\'s cover is read from (`imageField: "photo"`).',
      })
    }
    if (options.aspect !== undefined && !GALLERY_ASPECTS.includes(options.aspect)) {
      problems.push({
        level: "error",
        path: "aspect",
        message: `gallery \`aspect\` is ${GALLERY_ASPECTS.map((a) => `"${a}"`).join(", ")} — not ${JSON.stringify(options.aspect)}.`,
      })
    }
    if (options.fit !== undefined && !["cover", "contain"].includes(options.fit)) {
      problems.push({
        level: "error",
        path: "fit",
        message: `gallery \`fit\` is "cover" or "contain" — not ${JSON.stringify(options.fit)}.`,
      })
    }
  }

  if ((type === "cards" || type === "gallery") && options.columns !== undefined) {
    const { columns } = options
    if (!Number.isInteger(columns) || columns < 1 || columns > 6) {
      problems.push({
        level: "error",
        path: "columns",
        message: `\`columns\` is how many cards sit side by side, from 1 to 6 — not ${JSON.stringify(columns)}.`,
      })
    }
  }

  report(`layout.${type}()`, problems)
}

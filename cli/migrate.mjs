/**
 * react-resource-view — `migrate`: rewrites 0.x declarations into 1.0.
 *
 * Every rule is a change of `migrations/1.0.json`, and its renames are read
 * from there: the file is the specification, this is its mechanical half.
 * What cannot be rewritten without understanding the code is left in place
 * with a `TODO(RV1-…)` comment, and listed in the report.
 *
 * The command line has no dependency of its own, so the parser is the
 * project's own TypeScript — every project that declares resources has it —
 * and the output goes through the project's Prettier when there is one.
 */
import { readFile, readdir, writeFile } from "node:fs/promises"
import { existsSync, readFileSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { extname, join, relative, resolve } from "node:path"

/**
 * The list of changes, shipped beside the command. Read from the repository
 * root when the module is not loaded from a file — under a test runner's
 * browser environment.
 */
function readMigrations() {
  const url = new URL("../migrations/1.0.json", import.meta.url)
  const path =
    url.protocol === "file:" ? url : join(process.cwd(), "migrations/1.0.json")
  return JSON.parse(readFileSync(path, "utf8"))
}

const MIGRATIONS = readMigrations()

/** One change of `migrations/1.0.json`, by id. */
function change(id) {
  const found = MIGRATIONS.changes.find((entry) => entry.id === id)
  if (!found) throw new Error(`migrations/1.0.json has no ${id}`)
  return found
}

const PACKAGE = "react-resource-view"
const ACTIONS = ["list", "read", "create", "update", "delete"]

/** `tableViewOptionFactory` → { type: "table", map: { … }, id } */
const FACTORIES = Object.fromEntries(
  MIGRATIONS.changes
    .filter((entry) => entry.factory)
    .map((entry) => [
      entry.factory.from,
      { type: entry.factory.to, map: entry.map ?? {}, id: entry.id },
    ])
)

/** Identifiers exported under another name in 1.0. */
const IDENTIFIERS = Object.assign(
  {},
  ...MIGRATIONS.changes.map((entry) => entry.identifiers ?? {})
)

const OPEN_VALUES = change("RV1-BEHAV-002").values
const COMPONENT_KEYS = change("RV1-COMP-001").map
const HOOK_KEYS = change("RV1-DATA-002").map
const TAB_KEYS = change("RV1-TABS-002").map
const TABS_KEYS = change("RV1-TABS-001").map
const LAYOUT_COMPONENT_KEYS = change("RV1-LAYOUT-010").map
const REPOSITORY_KEYS = change("RV1-DATA-003").from
const PERMISSION_KEYS = change("RV1-PERM-001").from

/** The options of a 0.x `behavior`. */
const BEHAVIOR_KEYS = [
  "openIn",
  "closeAfterUpdate",
  "refreshDataAfterUpdate",
  "redirectToAfterUpdate",
  "rowActions",
  "canExport",
  "eventSourced",
  "openRecordIn",
  "selectable",
  "bulkActions",
]

/** Words that make a file worth parsing. */
const TRIGGERS = [
  "createViewResource",
  "ViewOptionFactory",
  "splitViewFactory",
  "behavior",
  "setResourceConfig",
  "createItemMenuWithResource",
  "subViewResource",
  ...Object.keys(IDENTIFIERS),
]

/* -------------------------------------------------------------------------- */
/* Loading the project's tools                                                */
/* -------------------------------------------------------------------------- */

function requireFrom(cwd) {
  const anchor = existsSync(join(cwd, "package.json"))
    ? join(cwd, "package.json")
    : join(cwd, "noop.js")
  return createRequire(anchor)
}

export function loadTypeScript(cwd = process.cwd()) {
  for (const require of [requireFrom(cwd), createRequire(import.meta.url)]) {
    try {
      return require("typescript")
    } catch {
      // Not there: try the next one.
    }
  }

  throw new Error(
    "The migration reads your code with TypeScript, which is not installed here. Run it with `npx -p typescript -p react-resource-view react-resource-view migrate`."
  )
}

async function loadPrettier(cwd) {
  for (const require of [requireFrom(cwd), createRequire(import.meta.url)]) {
    try {
      const path = require.resolve("prettier")
      return await import(new URL(`file://${path}`).href)
    } catch {
      // Not there: try the next one.
    }
  }
  return undefined
}

/* -------------------------------------------------------------------------- */
/* Printing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A value about to be printed: source text (a node rewritten), an object of
 * entries, an array of values, or a call.
 */
const text = (value) => ({ kind: "text", value })
const object = (entries = []) => ({ kind: "object", entries })
const array = (items) => ({ kind: "array", items })

/** A property of an object being printed. */
const prop = (key, value, comments = "") => ({ kind: "prop", key, value, comments })
const spread = (value, comments = "") => ({ kind: "spread", value, comments })
const rawEntry = (value, comments = "") => ({ kind: "raw", value, comments })

function isIdentifierName(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key)
}

function printKey(key) {
  return isIdentifierName(key) ? key : JSON.stringify(key)
}

/** Re-indents text taken from the source to the column it is printed at. */
function reindent(value, indent) {
  const lines = value.split("\n")
  if (lines.length === 1) return value
  // A template literal spanning lines: its spaces are part of the string.
  if (/`[^`]*\n[^`]*`/.test(value)) return value
  const rest = lines.slice(1).filter((line) => line.trim())
  const common = Math.min(
    ...rest.map((line) => line.match(/^ */)[0].length),
    Infinity
  )
  const base = Number.isFinite(common) ? common : 0

  return [
    lines[0],
    ...lines.slice(1).map((line) => (line.trim() ? indent + line.slice(base) : "")),
  ].join("\n")
}

function printComments(comments, indent) {
  if (!comments.trim()) return ""
  return (
    comments
      .trim()
      .split("\n")
      .map((line) => indent + line.trim().replace(/^\*/, " *"))
      .join("\n") + "\n"
  )
}

/** An object worth one line: no comment, nothing spanning several lines. */
function isShort(entries, printed) {
  return (
    entries.every((entry) => !entry.comments.trim()) &&
    printed.every((entry) => !entry.body.includes("\n"))
  )
}

export function print(value, indent = "") {
  const inner = indent + "  "

  switch (value.kind) {
    case "text":
      return reindent(value.value, indent)
    case "array": {
      if (value.items.length === 0) return "[]"
      const items = value.items.map((item) => print(item, inner))
      const hasComments = value.items.some((item) => item.comments?.trim())
      const oneLine = `[${items.join(", ")}]`
      if (!hasComments && !oneLine.includes("\n") && oneLine.length < 60)
        return oneLine
      return `[\n${items
        .map(
          (item, index) =>
            printComments(value.items[index].comments ?? "", inner) +
            inner +
            item +
            ","
        )
        .join("\n")}\n${indent}]`
    }
    case "object": {
      const entries = value.entries
      if (entries.length === 0) return "{}"
      const printed = entries.map((entry) => {
        const body =
          entry.kind === "spread"
            ? `...${print(entry.value, inner)}`
            : entry.kind === "raw"
              ? print(entry.value, inner)
              : entry.value.kind === "text" && entry.value.value === entry.key
                ? entry.key
                : `${printKey(entry.key)}: ${print(entry.value, inner)}`
        return { comments: entry.comments, body }
      })
      if (!value.expand && isShort(entries, printed)) {
        const oneLine = `{ ${printed.map((entry) => entry.body).join(", ")} }`
        if (oneLine.length < 70) return oneLine
      }
      return `{\n${printed
        .map(
          (entry) => printComments(entry.comments, inner) + inner + entry.body + ","
        )
        .join("\n")}\n${indent}}`
    }
    case "call":
      return `${value.callee}${value.typeArguments ?? ""}(${value.args
        .map((arg) => print(arg, indent))
        .join(", ")})`
    default:
      throw new Error(`Cannot print ${value.kind}`)
  }
}

/* -------------------------------------------------------------------------- */
/* The transformation of one file                                             */
/* -------------------------------------------------------------------------- */

/**
 * Rewrites one file. Returns the new text, whether it changed, and what is
 * left to do by hand.
 */
export function transformSource(
  source,
  fileName,
  ts,
  { packages = [PACKAGE] } = {}
) {
  const kind =
    fileName.endsWith(".tsx") || fileName.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : /\.[cm]?js$/.test(fileName)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind
  )

  const notes = []
  const scopes = []
  const used = { layout: false, configureResourceView: false, types: new Set() }
  const renamed = new Set()

  const note = (node, id, message) => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
    notes.push({ line: line + 1, id, message })
  }

  /* ------------------------------------------------------------ imports */

  const imported = new Map()
  for (const statement of file.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      packages.includes(statement.moduleSpecifier.text) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const element of statement.importClause.namedBindings.elements) {
        imported.set(element.name.text, (element.propertyName ?? element.name).text)
      }
    }
  }
  const fromPackage = (name) => imported.has(name)

  /* ---------------------------------------------- shared board fragments */

  /**
   * `const BOARD = { behavior: { openRecordIn: "drawer" } }`, spread into a
   * board of a declaration of this file: where its cards open goes to that
   * declaration's `views.read.open`. Name of the constant → the value.
   */
  const fragmentOpens = new Map()
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      let initializer = declaration.initializer
      if (initializer && ts.isAsExpression(initializer))
        initializer = initializer.expression
      if (!ts.isIdentifier(declaration.name) || !initializer) continue
      if (!ts.isObjectLiteralExpression(initializer)) continue
      const behavior = initializer.properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(file) === "behavior" &&
          ts.isObjectLiteralExpression(property.initializer)
      )
      const openRecordIn = behavior?.initializer.properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(file) === "openRecordIn" &&
          ts.isStringLiteral(property.initializer)
      )
      if (openRecordIn) {
        const value = openRecordIn.initializer.text
        fragmentOpens.set(
          declaration.name.text,
          JSON.stringify(OPEN_VALUES[value] ?? value)
        )
      }
    }
  }

  /**
   * `const BOARD = { behavior: { openRecordIn: "drawer", bulkActions: […] } }`:
   * once migrated, nothing of it is a layout's — the selection and its
   * actions are the list's. Spread into a layout of a declaration of this
   * file, the spread moves to that declaration's `views.list`.
   */
  const LIST_BEHAVIOR_KEYS = ["rowActions", "selectable", "bulkActions"]
  const listFragments = new Set()
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      let initializer = declaration.initializer
      if (initializer && ts.isAsExpression(initializer))
        initializer = initializer.expression
      if (!ts.isIdentifier(declaration.name) || !initializer) continue
      if (!ts.isObjectLiteralExpression(initializer)) continue
      const [behavior, ...others] = initializer.properties
      if (
        others.length ||
        !behavior ||
        !ts.isPropertyAssignment(behavior) ||
        behavior.name.getText(file) !== "behavior" ||
        !ts.isObjectLiteralExpression(behavior.initializer)
      ) {
        continue
      }
      const keys = behavior.initializer.properties.map((property) =>
        ts.isPropertyAssignment(property) ? property.name.getText(file) : undefined
      )
      if (
        keys.some((key) => LIST_BEHAVIOR_KEYS.includes(key)) &&
        keys.every((key) => [...LIST_BEHAVIOR_KEYS, "openRecordIn"].includes(key))
      ) {
        listFragments.add(declaration.name.text)
      }
    }
  }

  /** The shared board fragments spread somewhere in `node`. */
  const fragmentsSpreadIn = (node) => {
    const found = []
    const visit = (child) => {
      if (
        ts.isSpreadAssignment(child) &&
        ts.isIdentifier(child.expression) &&
        fragmentOpens.has(child.expression.text)
      ) {
        found.push(child.expression.text)
      }
      ts.forEachChild(child, visit)
    }
    visit(node)
    return found
  }

  /** Spread into a declaration of this file, which takes their `openRecordIn`. */
  const fragmentsInDeclarations = new Set()
  const findDeclarations = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createViewResource"
    ) {
      for (const name of fragmentsSpreadIn(node)) fragmentsInDeclarations.add(name)
    }
    ts.forEachChild(node, findDeclarations)
  }
  findDeclarations(file)
  const isFactory = (name) =>
    Boolean(FACTORIES[imported.get(name) ?? ""]) ||
    (!imported.size && Boolean(FACTORIES[name]))

  /* ---------------------------------------------------------- helpers */

  const keyOf = (name) => {
    if (!name) return undefined
    if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text
    if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
    if (ts.isComputedPropertyName(name)) {
      const expression = name.expression
      // `[ActionList.update]` — the action, as a plain string.
      if (
        ts.isPropertyAccessExpression(expression) &&
        expression.expression.getText(file) === "ActionList"
      ) {
        return expression.name.text
      }
      if (ts.isStringLiteral(expression)) return expression.text
    }
    return undefined
  }

  const leadingComments = (node) => {
    const full = file.getFullText()
    const ranges = ts.getLeadingCommentRanges(full, node.pos) ?? []
    return ranges.map((range) => full.slice(range.pos, range.end)).join("\n")
  }

  /** The entries of an object literal, with the comments above each. */
  const entriesOf = (literal) =>
    literal.properties.map((property) => {
      const comments = leadingComments(property)
      if (ts.isPropertyAssignment(property)) {
        const key = keyOf(property.name)
        if (key !== undefined) {
          return {
            kind: "prop",
            key,
            node: property.initializer,
            comments,
            property,
          }
        }
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        return {
          kind: "prop",
          key: property.name.text,
          node: property.name,
          comments,
          property,
          shorthand: true,
        }
      }
      if (ts.isSpreadAssignment(property)) {
        return { kind: "spread", node: property.expression, comments, property }
      }
      return { kind: "raw", node: property, comments, property }
    })

  const isObjectLiteral = (node) => node && ts.isObjectLiteralExpression(node)
  const literalValue = (node) => {
    if (!node) return undefined
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text
    }
    return undefined
  }
  const quoted = (value) => text(JSON.stringify(value))
  const todo = (id, message) => `// TODO(${id}): ${message}`

  /* ------------------------------------------------- generic rewriting */

  /**
   * The text of a node with every rule applied below it. A node no rule
   * touches comes back as written.
   */
  function rewrite(node) {
    const special = rewriteSpecial(node)
    if (special !== undefined) return special

    const start = node.getStart(file)
    let result = ""
    let cursor = start
    const original = file.getFullText()

    ts.forEachChild(node, (child) => {
      const childStart = child.getStart(file)
      const replacement = rewrite(child)
      const childText = original.slice(childStart, child.end)
      if (replacement !== childText) {
        result += original.slice(cursor, childStart) + replacement
        cursor = child.end
      }
    })

    return result + original.slice(cursor, node.end)
  }

  const valueOf = (node) => text(rewrite(node))

  /**
   * The rewritten text, or the original when the rewrite only moved spaces
   * and commas around: a 1.0 declaration comes back as it was written.
   */
  const unlessSame = (node, rewritten) => {
    const squash = (code) =>
      code
        .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, "")
        .replace(/,([}\])])/g, "$1")
    const original = node.getText(file)
    const todos = (code) => (code.match(/TODO\(RV1-/g) ?? []).length
    return squash(original) === squash(rewritten) &&
      todos(rewritten) === todos(original)
      ? original
      : rewritten
  }

  /** The indentation of the line a node starts on: what it is printed at. */
  const indentOf = (node) => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
    const lineText = source.slice(file.getPositionOfLineAndCharacter(line, 0))
    return lineText.match(/^[ \t]*/)[0]
  }
  /** An element of an array, with the comments written above it. */
  const withComments = (value, node) => {
    value.comments = leadingComments(node)
    return value
  }

  function rewriteSpecial(node) {
    // Identifiers renamed in 1.0, wherever the import is used.
    if (ts.isIdentifier(node) && IDENTIFIERS[node.text] && fromPackage(node.text)) {
      const parent = node.parent
      const isMember =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node)
      if (!isMember) {
        renamed.add(node.text)
        // `{ useLimit }` keeps its key, and a re-export its public name.
        if (ts.isShorthandPropertyAssignment(parent)) {
          return `${node.text}: ${IDENTIFIERS[node.text]}`
        }
        if (ts.isExportSpecifier(parent) && !parent.propertyName) {
          return `${IDENTIFIERS[node.text]} as ${node.text}`
        }
        return IDENTIFIERS[node.text]
      }
    }

    // A board of a 1.0 preview built away from its resource: where its cards
    // open belongs to the resource's `read` view, its selection to the
    // resource's `views.list` — neither is here.
    if (ts.isCallExpression(node) && !isInsideDeclaration(node)) {
      const migrated = migrateBoardOpen(node)
      if (migrated) {
        if (migrated.read.length) {
          const values = migrated.read.map(
            (entry) => `${entry.key}: ${entry.value.value}`
          )
          note(
            node,
            "RV1-LAYOUT-013",
            `a card opens the record's \`read\` view where that view opens: declare \`views: { read: { ${values.join(", ")} } }\` on the resource.`
          )
        }
        keepListOptions(node, migrated.call, migrated.list, "RV1-LAYOUT-014")
        return unlessSame(node, print(migrated.call, indentOf(node)))
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callee = node.expression.text

      if (callee === "createViewResource" && isObjectLiteral(node.arguments[1])) {
        const args = node.arguments.map((arg, index) =>
          index === 1 ? migrateDeclaration(arg, node) : valueOf(arg)
        )
        return unlessSame(
          node,
          print(
            {
              kind: "call",
              callee,
              typeArguments: node.typeArguments
                ? `<${node.typeArguments.map((type) => rewrite(type)).join(", ")}>`
                : "",
              args,
            },
            indentOf(node)
          )
        )
      }

      if (isFactory(callee)) {
        // Outside a declaration's layouts: the options of the list it holds
        // stay, to be moved by hand.
        const call = migrateFactory(node)
        keepListOptions(node, call, call.list, "RV1-BEHAV-006")
        return print(call, indentOf(node))
      }

      if (callee === "createView" && fromPackage("createView")) {
        const migrated = migrateCreateView(node)
        if (migrated) return print(migrated, indentOf(node))
      }

      if (callee === "setResourceConfig" && fromPackage("setResourceConfig")) {
        const [config] = node.arguments
        if (isObjectLiteral(config)) {
          used.configureResourceView = true
          renamed.add("setResourceConfig")
          const entries = entriesOf(config).map((entry) =>
            entry.kind === "prop" && entry.key === "defaultResource"
              ? prop(
                  "defaults",
                  isObjectLiteral(entry.node)
                    ? migrateDefinitionObject(entry.node, { defaults: true })
                    : valueOf(entry.node),
                  entry.comments
                )
              : asEntry(entry)
          )
          return `configureResourceView(${print(object(entries), indentOf(node))})`
        }
      }

      if (
        callee === "createItemMenuWithResource" &&
        fromPackage("createItemMenuWithResource")
      ) {
        const [params] = node.arguments
        if (isObjectLiteral(params)) {
          const entries = entriesOf(params)
          const resource = entries.find((entry) => entry.key === "resource")
          // In a scope's menu, the resource stands for its own entry.
          const list = node.parent
          const owner =
            ts.isArrayLiteralExpression(list) && ts.isPropertyAssignment(list.parent)
              ? keyOf(list.parent.name)
              : undefined
          if (
            resource &&
            entries.length === 1 &&
            (owner === "menu" || owner === "items")
          ) {
            return rewrite(resource.node)
          }
        }
      }
    }

    // A fragment of a view outside any declaration — a constant spread into
    // several views: its `behavior` flattened in place.
    if (ts.isObjectLiteralExpression(node) && hasBehavior(node)) {
      const migrated = migrateFragment(node)
      return print(migrated, indentOf(node))
    }

    // `const X: { behavior: object } = { behavior: … }` — the annotation
    // described the 0.x shape, often to get around its types. It gets the
    // type of what the object now is, when that is one thing: options of the
    // list.
    if (
      ts.isVariableDeclaration(node) &&
      node.type &&
      /\bbehavior\b/.test(node.type.getText(file)) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer) &&
      hasBehavior(node.initializer)
    ) {
      const migrated = migrateFragment(node.initializer, { annotated: true })
      const keys = migrated.entries.map((entry) => entry.key)
      const isList =
        keys.length > 0 && keys.every((key) => LIST_BEHAVIOR_KEYS.includes(key))
      if (isList) {
        // Only the keys it holds: `Partial<ListViewDefinition>` would type
        // `titleField` and the others for any item, and refuse to be spread
        // into a list of tasks.
        used.types.add("ListViewDefinition")
        const picked = [...new Set(keys)]
          .map((key) => JSON.stringify(key))
          .join(" | ")
        return `${node.name.getText(file)}: Pick<ListViewDefinition, ${picked}> = ${print(migrated, indentOf(node))}`
      }
      note(
        node,
        "RV1-BEHAV-001",
        "the type annotation described the 0.x `behavior`: it was removed."
      )
      return `${node.name.getText(file)} = ${print(migrated, indentOf(node))}`
    }

    return undefined
  }

  /**
   * A `behavior` of 0.x: every key one the library read — an object of
   * another library that happens to have a `behavior` is left alone.
   */
  const hasBehavior = (literal) =>
    literal.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        keyOf(property.name) === "behavior" &&
        isObjectLiteral(property.initializer) &&
        property.initializer.properties.length > 0 &&
        property.initializer.properties.every(
          (option) =>
            ts.isPropertyAssignment(option) &&
            BEHAVIOR_KEYS.includes(keyOf(option.name))
        )
    ) && !isInsideDeclaration(literal)

  function isInsideDeclaration(node) {
    for (let current = node.parent; current; current = current.parent) {
      if (
        ts.isCallExpression(current) &&
        ts.isIdentifier(current.expression) &&
        (current.expression.text === "createViewResource" ||
          current.expression.text === "setResourceConfig" ||
          isFactory(current.expression.text))
      ) {
        return true
      }
    }
    return false
  }

  const asEntry = (entry) => {
    if (entry.kind === "spread") return spread(valueOf(entry.node), entry.comments)
    if (entry.kind === "raw") return rawEntry(valueOf(entry.node), entry.comments)
    if (entry.shorthand) return prop(entry.key, valueOf(entry.node), entry.comments)
    return prop(entry.key, valueOf(entry.node), entry.comments)
  }

  /**
   * `layout.board({ openRecord, expandable, selectable, bulkActions })`, as
   * the 1.0 previews wrote it: a card now opens the record's `read` view
   * where that view says, and the selection is the list's. The call without
   * them, what goes to `views.read` and what goes to `views.list`.
   */
  function migrateBoardOpen(call) {
    if (!ts.isCallExpression(call)) return undefined
    if (call.expression.getText(file) !== "layout.board") return undefined
    const [argument] = call.arguments
    if (!isObjectLiteral(argument)) return undefined
    const entries = entriesOf(argument)
    const opens = entries.filter(
      (entry) =>
        entry.kind === "prop" &&
        (entry.key === "openRecord" || entry.key === "expandable")
    )
    const selection = entries.filter(
      (entry) =>
        entry.kind === "prop" &&
        (entry.key === "selectable" || entry.key === "bulkActions")
    )
    const moved = [...opens, ...selection]
    if (!moved.length) return undefined

    return {
      call: {
        kind: "call",
        callee: "layout.board",
        typeArguments: call.typeArguments
          ? `<${call.typeArguments.map((type) => rewrite(type)).join(", ")}>`
          : "",
        args: [
          object(entries.filter((entry) => !moved.includes(entry)).map(asEntry)),
        ],
      },
      read: opens.map((entry) =>
        prop(
          entry.key === "openRecord" ? "open" : "expandable",
          valueOf(entry.node),
          entry.comments
        )
      ),
      list: selection.map((entry) =>
        prop(entry.key, valueOf(entry.node), entry.comments)
      ),
    }
  }

  /**
   * Options of the list found on a layout away from any declaration: they
   * stay on the layout — no code is lost — marked to be moved by hand to the
   * resource's `views.list`.
   */
  function keepListOptions(node, call, list, id) {
    if (!list.length) return
    const marker = `TODO(${id})`
    const options = call.args[0] ?? object([])
    for (const entry of list) {
      options.entries.push(
        entry.comments.includes(marker)
          ? entry
          : {
              ...entry,
              comments: [
                entry.comments,
                todo(id, "move to the resource's views.list"),
              ]
                .filter(Boolean)
                .join("\n"),
            }
      )
    }
    call.args = [options]
    const names = list.map((entry) =>
      entry.kind === "spread" ? `...${entry.value.value}` : entry.key
    )
    note(
      node,
      id,
      `\`${names.join("`, `")}\` belong to the list, not to a layout: declare them in \`views: { list: { … } }\` on the resource.`
    )
  }

  /* ------------------------------------------------------- behaviors */

  /**
   * The options of a `behavior` object, each told where it goes:
   * `{ view: [...], list: [...], resource: [...], read: [...] }`.
   */
  function splitBehavior(literal) {
    const out = { view: [], list: [], resource: [], read: [], todo: [] }
    const entries = entriesOf(literal)
    const byKey = Object.fromEntries(
      entries
        .filter((entry) => entry.kind === "prop")
        .map((entry) => [entry.key, entry])
    )

    // What follows a save: one value, the three 0.x options having been
    // free to contradict each other.
    const redirect = byKey.redirectToAfterUpdate
    const refresh = byKey.refreshDataAfterUpdate
    const close = byKey.closeAfterUpdate
    let afterSave
    if (redirect) {
      afterSave = text(`{ redirect: () => ${rewrite(redirect.node)} }`)
    } else if (refresh && literalValue(refresh.node) !== false) {
      afterSave =
        literalValue(refresh.node) === true
          ? quoted("reload")
          : text(`${rewrite(refresh.node)} ? "reload" : "stay"`)
    } else if (close && literalValue(close.node) !== false) {
      afterSave =
        literalValue(close.node) === true
          ? quoted("close")
          : text(`${rewrite(close.node)} ? "close" : "stay"`)
    }
    if ([redirect, refresh, close].filter(Boolean).length > 1) {
      note(
        literal,
        "RV1-BEHAV-003",
        "several after-save options combined: check `afterSave`."
      )
    }

    // Closing is what a dialog or a drawer does after a save anyway.
    const opensOver = ["popup", "drawer"].includes(literalValue(byKey.openIn?.node))
    if (opensOver && afterSave?.value === '"close"') afterSave = undefined

    for (const entry of entries) {
      if (entry.kind !== "prop") {
        out.todo.push(entry)
        continue
      }
      const comments = entry.comments
      switch (entry.key) {
        case "openIn": {
          const value = literalValue(entry.node)
          out.view.push(
            prop(
              "open",
              typeof value === "string"
                ? quoted(OPEN_VALUES[value] ?? value)
                : valueOf(entry.node),
              comments
            )
          )
          break
        }
        case "closeAfterUpdate":
        case "refreshDataAfterUpdate":
        case "redirectToAfterUpdate":
          if (afterSave) {
            out.view.push(prop("afterSave", afterSave, comments))
            afterSave = undefined
          }
          break
        case "rowActions":
          out.list.push(prop("rowActions", actionsArray(entry.node), comments))
          break
        case "canExport":
          out.resource.push({ export: entry })
          break
        case "eventSourced":
          out.resource.push(prop("realtime", valueOf(entry.node), comments))
          break
        case "openRecordIn": {
          // A card opens the record's `read` view where that view opens.
          const value = literalValue(entry.node)
          out.read.push(
            prop(
              "open",
              typeof value === "string"
                ? quoted(OPEN_VALUES[value] ?? value)
                : valueOf(entry.node),
              comments
            )
          )
          break
        }
        case "selectable":
        case "bulkActions":
          out.list.push(prop(entry.key, valueOf(entry.node), comments))
          break
        default:
          out.todo.push(entry)
      }
    }

    return out
  }

  /** The object literal a top-level `const` of this file is initialised with. */
  function constantObject(name) {
    for (const statement of file.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          return declaration.initializer
        }
      }
    }
    return undefined
  }

  /** `[ActionList.read, ActionList.update]` → `["read", "update"]` */
  function actionsArray(node) {
    if (!ts.isArrayLiteralExpression(node)) return valueOf(node)
    return array(
      node.elements.map((element) =>
        ts.isPropertyAccessExpression(element) &&
        element.expression.getText(file) === "ActionList"
          ? quoted(element.name.text)
          : valueOf(element)
      )
    )
  }

  /** A view fragment outside any declaration: `{ behavior: { openIn } }`. */
  function migrateFragment(literal, { annotated = false } = {}) {
    const result = []
    // Away from the declaration, `"drawer"` would be typed as any string;
    // `as const` keeps it the value `open` expects — unless the whole object
    // already is.
    const isConst =
      ts.isAsExpression(literal.parent) &&
      literal.parent.type.getText(file) === "const"
    const isTypeScript = kind !== ts.ScriptKind.JS
    const narrow = (entry) =>
      !isConst &&
      !annotated &&
      isTypeScript &&
      ["open", "afterSave"].includes(entry.key) &&
      entry.value.kind === "text" &&
      entry.value.value.startsWith('"')
        ? prop(entry.key, text(`${entry.value.value} as const`), entry.comments)
        : entry
    for (const entry of entriesOf(literal)) {
      if (
        entry.kind === "prop" &&
        entry.key === "behavior" &&
        isObjectLiteral(entry.node)
      ) {
        const split = splitBehavior(entry.node)
        const first = [...split.view, ...split.list].map(narrow)
        if (first[0]) first[0].comments = entry.comments + first[0].comments
        result.push(...first)
        const owner =
          literal.parent && ts.isAsExpression(literal.parent)
            ? literal.parent.parent
            : literal.parent
        const handled =
          owner &&
          ts.isVariableDeclaration(owner) &&
          ts.isIdentifier(owner.name) &&
          fragmentsInDeclarations.has(owner.name.text)
        for (const moved of handled ? [] : split.read) {
          note(
            entry.node,
            "RV1-BEHAV-006",
            `a card opens the record's \`read\` view where that view opens: declare \`views: { read: { open: ${moved.value.value} } }\` on the resource.`
          )
        }
        for (const moved of split.resource) {
          note(
            entry.node,
            "RV1-BEHAV-005",
            "an option of the resource itself (`realtime`, `permissions.export`) cannot be set from a shared fragment."
          )
          if (moved.kind === "prop") result.push(moved)
        }
        for (const left of split.todo) {
          note(
            left.node,
            "RV1-BEHAV-001",
            `\`${left.key ?? "…"}\` has no 1.0 equivalent here.`
          )
        }
        continue
      }
      result.push(asEntry(entry))
    }
    return object(result)
  }

  /* -------------------------------------------------------- layouts */

  /** `columnViewOptionFactory({ … })` → `layout.board({ … })` */
  function migrateFactory(call) {
    const callee = call.expression.text
    const factory = FACTORIES[imported.get(callee) ?? callee]
    used.layout = true
    const [argument] = call.arguments
    const typeArguments = call.typeArguments
      ? `<${call.typeArguments.map((type) => rewrite(type)).join(", ")}>`
      : ""

    if (!argument) {
      return {
        kind: "call",
        callee: `layout.${factory.type}`,
        typeArguments,
        args: [],
        list: [],
      }
    }
    if (!isObjectLiteral(argument)) {
      note(call, factory.id, "options passed as a variable: rename them by hand.")
      return {
        kind: "call",
        callee: `layout.${factory.type}`,
        typeArguments,
        args: [valueOf(argument)],
        list: [],
      }
    }

    const entries = []
    const components = []
    // The options of the list written on the layout: the caller takes them
    // to `views.list`.
    const list = []
    const defaultLabel = factory.type.charAt(0).toUpperCase() + factory.type.slice(1)

    for (const entry of entriesOf(argument)) {
      if (
        entry.kind === "spread" &&
        ts.isIdentifier(entry.node) &&
        listFragments.has(entry.node.text)
      ) {
        list.push(asEntry(entry))
        continue
      }
      if (entry.kind !== "prop" || entry.shorthand) {
        entries.push(asEntry(entry))
        continue
      }
      const { key, node, comments } = entry

      if (key === "name") {
        if (literalValue(node) !== defaultLabel) {
          entries.push(prop("label", valueOf(node), comments))
        }
        continue
      }
      if (factory.map[key]) {
        entries.push(prop(factory.map[key], valueOf(node), comments))
        continue
      }
      if (LAYOUT_COMPONENT_KEYS[key]) {
        components.push(prop(LAYOUT_COMPONENT_KEYS[key], valueOf(node), comments))
        continue
      }
      if (key === "behavior" && isObjectLiteral(node)) {
        const split = splitBehavior(node)
        const selection = split.list.filter((moved) => moved.key !== "rowActions")
        if (selection[0]) selection[0].comments = comments + selection[0].comments
        list.push(...selection)
        for (const moved of split.read) {
          note(
            node,
            "RV1-BEHAV-006",
            `a card opens the record's \`read\` view where that view opens: declare \`views: { read: { open: ${moved.value.value} } }\` on the resource.`
          )
        }
        for (const left of [
          ...split.view,
          ...split.list.filter((moved) => !selection.includes(moved)),
          ...split.resource,
          ...split.todo,
        ]) {
          note(
            node,
            "RV1-BEHAV-001",
            `\`${left.key ?? "an option"}\` of a layout's behavior has no effect there and was dropped.`
          )
        }
        continue
      }
      if (key === "form" && isObjectLiteral(node)) {
        entries.push(...layoutForm(node, comments))
        continue
      }
      if (key === "id") {
        entries.push(prop("id", valueOf(node), comments))
        continue
      }
      entries.push(prop(key, valueOf(node), comments))
    }

    if (components.length) entries.push(prop("components", object(components)))

    return {
      kind: "call",
      callee: `layout.${factory.type}`,
      typeArguments,
      args: entries.length ? [object(entries)] : [],
      list,
    }
  }

  /**
   * `createView({ name: "Heatmap", listComponent: HeatmapList, dense: true })`
   * → `layout.custom({ type: "heatmap", components: { list: HeatmapList },
   * options: { dense: true } })`. A call spreading its arguments — a factory
   * of one's own — is left to the hand.
   */
  function migrateCreateView(call) {
    const [argument] = call.arguments
    if (!isObjectLiteral(argument)) {
      note(
        call,
        "RV1-LAYOUT-012",
        "`createView` with arguments built elsewhere: rewrite it with `layout.custom({ type, components, options })`."
      )
      return undefined
    }
    const entries = entriesOf(argument)
    if (entries.some((entry) => entry.kind !== "prop")) {
      note(
        call,
        "RV1-LAYOUT-012",
        "`createView` spreads its options: rewrite it with `layout.custom({ type, components, options })`, and read the options with `useLayout().options`."
      )
      return undefined
    }

    used.layout = true
    const result = []
    const components = []
    const options = []
    let type
    for (const entry of entries) {
      const { key, node: value, comments } = entry
      if (key === "name") {
        const name = literalValue(value)
        type = typeof name === "string" ? slug(name) : undefined
        const label =
          typeof name === "string"
            ? name.charAt(0).toUpperCase() + name.slice(1)
            : undefined
        if (
          type === undefined ||
          label !== type.charAt(0).toUpperCase() + type.slice(1)
        ) {
          result.push(prop("label", valueOf(value), comments))
        }
      } else if (LAYOUT_COMPONENT_KEYS[key]) {
        components.push(prop(LAYOUT_COMPONENT_KEYS[key], valueOf(value), comments))
      } else if (["id", "icon", "fullWidth", "form"].includes(key)) {
        result.push(prop(key, valueOf(value), comments))
      } else {
        options.push(prop(key, valueOf(value), comments))
      }
    }
    if (!type) {
      note(
        call,
        "RV1-LAYOUT-012",
        "`createView` without a literal `name`: give the layout a `type`."
      )
      type = "custom"
    }

    return {
      kind: "call",
      callee: "layout.custom",
      args: [
        object([
          prop("type", quoted(type)),
          ...result,
          prop("components", object(components)),
          ...(options.length ? [prop("options", object(options))] : []),
        ]),
      ],
    }
  }

  /** The URL id 0.x derived from a name. */
  function slug(value) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  /**
   * A layout's form: in 0.x it replaced the resource's, in 1.0 it is merged
   * over it — so the fields it listed become `fields`, and the inputs are
   * kept only when they say more than "the same field".
   */
  function layoutForm(literal, comments) {
    const entries = entriesOf(literal)
    const inputs = entries.find((entry) => entry.key === "inputs")
    const rest = entries.filter((entry) => entry !== inputs)

    // `inputs: FIELDS`, with `const FIELDS = { … }` in the same file: its keys
    // are the columns, and the inputs stay as they were written.
    const declared =
      inputs && ts.isIdentifier(inputs.node) && constantObject(inputs.node.text)
    if (declared) {
      const keys = entriesOf(declared)
      if (keys.every((entry) => entry.kind === "prop")) {
        return [
          prop("fields", array(keys.map((entry) => quoted(entry.key))), comments),
          prop("form", object(entries.map(asEntry))),
        ]
      }
    }

    if (!inputs || !isObjectLiteral(inputs.node)) {
      note(
        literal,
        "RV1-LAYOUT-011",
        "a layout's form is now merged over the resource's: list its fields with `fields: [\"…\"]`."
      )
      return [
        prop(
          "form",
          object(entries.map(asEntry)),
          [
            comments,
            todo(
              "RV1-LAYOUT-011",
              "a layout's form is now merged over the resource's — list the columns with `fields`"
            ),
          ]
            .filter(Boolean)
            .join("\n")
        ),
      ]
    }

    const inputEntries = entriesOf(inputs.node)
    const fields = inputEntries
      .filter((entry) => entry.kind === "prop")
      .map((entry) => quoted(entry.key))
    const sayMore = inputEntries.filter(
      (entry) =>
        entry.kind !== "prop" ||
        !(
          entry.shorthand ||
          (ts.isPropertyAccessExpression(entry.node) &&
            entry.node.name.text === entry.key)
        )
    )

    const result = [prop("fields", array(fields), comments)]
    if (sayMore.length || rest.length) {
      result.push(
        prop(
          "form",
          object([
            ...rest.map(asEntry),
            ...(sayMore.length
              ? [prop("inputs", object(sayMore.map(asEntry)))]
              : []),
          ])
        )
      )
    }
    return result
  }

  /* ---------------------------------------------------------- views */

  /**
   * What one 0.x view holds, sorted by where it goes in 1.0:
   * `own` stays on the view, `list` goes to `views.list`, `resource` to the
   * root, `perAction` to other actions.
   */
  function migrateView(literal, action) {
    const out = {
      own: [],
      list: [],
      resource: [],
      perAction: {},
      components: [],
      layoutComponents: [],
      layouts: undefined,
      filters: [],
      title: undefined,
      exportPermission: undefined,
    }
    // What the root view gives every action carries the 0.x key it came
    // from: an action declaring that key replaced it wholesale.
    const addTo = (target, entry, origin) => {
      out.perAction[target] = out.perAction[target] ?? []
      out.perAction[target].push({ ...entry, origin })
    }
    out.keys = new Set(
      entriesOf(literal)
        .filter((entry) => entry.kind === "prop")
        .map((entry) => entry.key)
    )
    // `components` is written where the first component was.
    const componentsHere = () => {
      if (!out.own.some((entry) => entry.kind === "placeholder")) {
        out.own.push({ kind: "placeholder", name: "components" })
      }
    }

    for (const entry of entriesOf(literal)) {
      if (entry.kind !== "prop") {
        out.own.push(asEntry(entry))
        continue
      }
      const { key, node, comments } = entry

      switch (key) {
        case "name":
          out.title = {
            value: valueOf(node),
            literal: literalValue(node),
            source: node.getText(file),
            comments,
          }
          break
        case "label":
          if (isObjectLiteral(node)) {
            for (const labelEntry of entriesOf(node)) {
              if (labelEntry.kind === "prop" && ACTIONS.includes(labelEntry.key)) {
                addTo(
                  labelEntry.key,
                  prop("buttonLabel", valueOf(labelEntry.node), labelEntry.comments),
                  "label"
                )
              }
            }
          } else {
            note(
              node,
              "RV1-VIEW-004",
              "`label` is a variable: write `views.<action>.buttonLabel` by hand."
            )
            out.own.push(
              prop(
                "label",
                valueOf(node),
                [
                  comments,
                  todo(
                    "RV1-VIEW-004",
                    "write views.<action>.buttonLabel for each action"
                  ),
                ].join("\n")
              )
            )
          }
          break
        case "behavior":
          if (isObjectLiteral(node)) {
            const split = splitBehavior(node)
            const first = [...split.view, ...split.list][0]
            if (first) first.comments = comments + first.comments
            if (action === "root") {
              // A root behaviour reached every action.
              for (const moved of split.view) {
                const targets =
                  moved.key === "afterSave"
                    ? ["create", "update"]
                    : ["read", "create", "update", "delete"]
                for (const target of targets) addTo(target, moved, "behavior")
              }
            } else if (action === "list") {
              for (const moved of split.view) {
                note(
                  node,
                  "RV1-BEHAV-001",
                  `\`${moved.key}\` has no effect on a list and was dropped.`
                )
              }
            } else {
              for (const moved of split.view) {
                if (
                  moved.key === "afterSave" &&
                  !["create", "update"].includes(action)
                ) {
                  note(
                    node,
                    "RV1-BEHAV-003",
                    `\`afterSave\` has no effect on \`${action}\` and was dropped.`
                  )
                  continue
                }
                out.own.push(moved)
              }
            }
            out.list.push(...split.list)
            for (const moved of split.read) addTo("read", moved, "openRecordIn")
            for (const moved of split.resource) {
              if (moved.export) out.exportPermission = moved.export
              else out.resource.push(moved)
            }
            for (const left of split.todo) {
              note(
                left.node ?? node,
                "RV1-BEHAV-001",
                `\`${left.key ?? "…"}\` of \`behavior\` has no 1.0 equivalent.`
              )
            }
          } else {
            note(
              node,
              "RV1-BEHAV-001",
              "`behavior` is a variable: flatten it by hand."
            )
            out.own.push(
              prop(
                key,
                valueOf(node),
                [
                  comments,
                  todo("RV1-BEHAV-001", "behavior is gone — see MIGRATION-1.0.md"),
                ].join("\n")
              )
            )
          }
          break
        case "viewComponent":
          componentsHere()
          out.components.push(prop("view", valueOf(node), comments))
          break
        case "listComponent":
        case "rowComponent":
        case "itemComponent":
          out.layoutComponents.push(
            prop(COMPONENT_KEYS[key], valueOf(node), comments)
          )
          break
        case "components":
          if (isObjectLiteral(node)) {
            componentsHere()
            entriesOf(node).forEach((component, index) => {
              if (index === 0) component.comments = comments + component.comments
              if (component.kind === "prop" && component.key === "noResult") {
                out.components.push(
                  prop("empty", valueOf(component.node), component.comments)
                )
              } else {
                out.components.push(asEntry(component))
              }
            })
          } else {
            out.own.push(prop("components", valueOf(node), comments))
          }
          break
        case "itemsPerPage":
          out.list.push(prop("pageSize", valueOf(node), comments))
          break
        case "formFilter":
          if (isObjectLiteral(node)) {
            entriesOf(node).forEach((filterEntry, index) => {
              const migrated = asEntry(filterEntry)
              if (index === 0) migrated.comments = comments + migrated.comments
              out.filters.push({ ...migrated, source: "form" })
            })
          } else {
            out.filters.push({ ...spread(valueOf(node), comments), source: "form" })
          }
          break
        case "defaultFilter":
          out.filters.push({
            ...prop("initial", valueOf(node), comments),
            source: "initial",
          })
          break
        case "viewVariants":
          out.layouts = { node, comments }
          break
        case "layouts": {
          // A 1.0 preview's board saying where its cards open, or holding the
          // list's selection.
          let changed = false
          const items =
            action === "list" && ts.isArrayLiteralExpression(node)
              ? node.elements.map((element) => {
                  const migrated = migrateBoardOpen(element)
                  if (!migrated) return withComments(valueOf(element), element)
                  changed = true
                  out.list.push(...migrated.list)
                  for (const moved of migrated.read) {
                    addTo(
                      "read",
                      moved,
                      moved.key === "open" ? "openRecord" : "expandable"
                    )
                  }
                  return withComments(migrated.call, element)
                })
              : []
          out.own.push(prop(key, changed ? array(items) : valueOf(node), comments))
          break
        }
        case "titleKey":
          out.own.push(prop("titleField", valueOf(node), comments))
          break
        case "id":
        case "icon":
          break
        case "subViewResource":
          if (action === "root") {
            // Tabs under the record: those of the read view and of the form.
            const tabs = migrateTabs(node)
            addTo("read", prop("tabs", tabs, comments), "subViewResource")
            addTo("update", prop("tabs", tabs), "subViewResource")
            note(
              node,
              "RV1-TABS-001",
              "`view.subViewResource` reached every action: its tabs now sit on `views.read` and `views.update` — remove one if it had no use there."
            )
          } else if (action === "read" || action === "update") {
            out.own.push(prop("tabs", migrateTabs(node), comments))
          } else {
            note(
              node,
              "RV1-TABS-001",
              `tabs are declared on \`views.read\` or \`views.update\`, not on ${action === "root" ? "`view`" : `\`views.${action}\``}.`
            )
            out.own.push(
              prop(
                "tabs",
                migrateTabs(node),
                [
                  comments,
                  todo(
                    "RV1-TABS-001",
                    "move these tabs to views.read or views.update"
                  ),
                ].join("\n")
              )
            )
          }
          break
        default:
          out.own.push(prop(key, valueOf(node), comments))
      }
    }

    return out
  }

  function migrateTabs(node) {
    if (!isObjectLiteral(node)) {
      note(
        node,
        "RV1-TABS-001",
        "`subViewResource` is a variable: rename `list` → `items` by hand."
      )
      return valueOf(node)
    }
    const entries = entriesOf(node).map((entry) => {
      if (entry.kind !== "prop" || entry.shorthand) return asEntry(entry)
      const key = TABS_KEYS[entry.key] ?? entry.key
      if (entry.key === "list" && ts.isArrayLiteralExpression(entry.node)) {
        return prop(
          "items",
          array(
            entry.node.elements.map((tab) => withComments(migrateTab(tab), tab))
          ),
          entry.comments
        )
      }
      return prop(key, valueOf(entry.node), entry.comments)
    })
    return object(entries)
  }

  function migrateTab(node) {
    if (!isObjectLiteral(node)) return valueOf(node)
    const result = []
    for (const entry of entriesOf(node)) {
      if (entry.kind !== "prop" || entry.shorthand) {
        result.push(asEntry(entry))
        continue
      }
      const { key, node: value, comments } = entry
      if (key === "resourceAction") {
        const isList =
          ts.isPropertyAccessExpression(value) && value.name.text === "list"
        if (!isList && literalValue(value) !== "list") {
          result.push(prop("action", actionValue(value), comments))
        }
        continue
      }
      if (key === "onInitViewResource") {
        result.push(...migrateOnInit(value, comments))
        continue
      }
      result.push(prop(TAB_KEYS[key] ?? key, valueOf(value), comments))
    }
    return object(result)
  }

  const actionValue = (node) =>
    ts.isPropertyAccessExpression(node) &&
    node.expression.getText(file) === "ActionList"
      ? quoted(node.name.text)
      : valueOf(node)

  /**
   * `(view, parent) => { …; return { ...view, filter: F, defaultData: D } }`
   * becomes `filter: ({ item }) => F` and `defaultData: ({ item }) => D`.
   */
  function migrateOnInit(fn, comments) {
    const fallback = () => {
      note(
        fn,
        "RV1-TABS-003",
        "`onInitViewResource` could not be read: write `filter: ({ item }) => …` and `defaultData: ({ item }) => …` by hand."
      )
      return [
        prop(
          "onInitViewResource",
          valueOf(fn),
          [
            comments,
            todo(
              "RV1-TABS-003",
              "replace with filter: ({ item }) => … and defaultData: ({ item }) => …"
            ),
          ].join("\n")
        ),
      ]
    }

    if (!(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return fallback()
    const [viewParam, parentParam] = fn.parameters
    if (!viewParam || !ts.isIdentifier(viewParam.name)) return fallback()
    const viewName = viewParam.name.text
    const parentName =
      parentParam && ts.isIdentifier(parentParam.name)
        ? parentParam.name.text
        : undefined

    let statements = []
    let returned
    if (ts.isBlock(fn.body)) {
      statements = fn.body.statements.slice(0, -1)
      const last = fn.body.statements[fn.body.statements.length - 1]
      if (!last || !ts.isReturnStatement(last) || !last.expression) return fallback()
      returned = last.expression
    } else {
      returned = fn.body
    }
    while (ts.isParenthesizedExpression(returned)) returned = returned.expression
    if (!ts.isObjectLiteralExpression(returned)) return fallback()

    const constants = new Map()
    for (const statement of statements) {
      if (!ts.isVariableStatement(statement)) return fallback()
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
          return fallback()
        constants.set(declaration.name.text, declaration.initializer)
      }
    }

    const parts = {}
    for (const entry of entriesOf(returned)) {
      if (entry.kind === "spread" && entry.node.getText(file) === viewName) continue
      if (
        entry.kind === "prop" &&
        (entry.key === "filter" || entry.key === "defaultData")
      ) {
        parts[entry.key] = entry
        continue
      }
      return fallback()
    }

    // `parent?.data` is the record: `item`.
    const fromParent = (code) => {
      if (!parentName) return code
      return code.replace(
        new RegExp(`\\b${parentName}(\\?\\.|\\.)data\\b`, "g"),
        "item"
      )
    }
    const usesParent = (code) =>
      parentName && new RegExp(`\\b${parentName}\\b`).test(code)
    if (
      new RegExp(`\\b${viewName}\\b`).test(
        statements.map((s) => s.getText(file)).join("\n")
      )
    ) {
      return fallback()
    }

    const inline = (node) => {
      // Each constant used by the value is written in its place.
      const replacements = []
      const visit = (current) => {
        if (
          ts.isShorthandPropertyAssignment(current) &&
          constants.has(current.name.text)
        ) {
          replacements.push([
            current.getStart(file) - node.getStart(file),
            current.end - node.getStart(file),
            `${current.name.text}: ${constants.get(current.name.text).getText(file)}`,
          ])
          return
        }
        if (
          ts.isIdentifier(current) &&
          constants.has(current.text) &&
          !(
            ts.isPropertyAccessExpression(current.parent) &&
            current.parent.name === current
          ) &&
          !(
            ts.isPropertyAssignment(current.parent) &&
            current.parent.name === current
          )
        ) {
          replacements.push([
            current.getStart(file) - node.getStart(file),
            current.end - node.getStart(file),
            `(${constants.get(current.text).getText(file)})`,
          ])
          return
        }
        ts.forEachChild(current, visit)
      }
      visit(node)
      let code = node.getText(file)
      for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0])) {
        code = code.slice(0, start) + value + code.slice(end)
      }
      return fromParent(code)
    }

    const result = []
    for (const key of ["filter", "defaultData"]) {
      const part = parts[key]
      if (!part) continue
      const body = inline(part.node)
      const params = usesParent(body) ? `{ item, ${parentName} }` : "{ item }"
      const isObject = ts.isObjectLiteralExpression(part.node)
      result.push(
        prop(
          key,
          text(`(${params}) => ${isObject ? `(${body})` : body}`),
          result.length ? part.comments : comments + part.comments
        )
      )
    }
    return result
  }

  /* ---------------------------------------------------- declarations */

  /**
   * The definition object of a resource — or the defaults of
   * `setResourceConfig`, which have its shape.
   */
  function migrateDefinitionObject(literal, { defaults = false, call } = {}) {
    const entries = entriesOf(literal)
    const byKey = Object.fromEntries(
      entries
        .filter((entry) => entry.kind === "prop")
        .map((entry) => [entry.key, entry])
    )
    const root = []
    const views = Object.fromEntries(ACTIONS.map((action) => [action, []]))
    const resourceLevel = []
    const hooks = []
    const repository = []
    const components = []
    let viewsComments = ""
    let viewsVariable
    let viewsPosition
    let permissionsPosition
    let layoutsSource
    let listTitle
    let exportPermission

    const hasPath = Boolean(byKey.path)
    const resourceName =
      (byKey.name && literalValue(byKey.name.node)) ??
      (byKey.view && isObjectLiteral(byKey.view.node)
        ? literalValue(
            entriesOf(byKey.view.node).find((entry) => entry.key === "name")?.node
          )
        : undefined)
    // The title 1.0 derives anyway: written out, it would only repeat it.
    const derivedTitle = (action) => {
      if (typeof resourceName !== "string") return undefined
      const prefix = { create: "Create", update: "Edit", delete: "Delete" }[action]
      return prefix ? `${prefix} — ${resourceName}` : resourceName
    }
    // Methods of one's own replace those of the data source; all five
    // replace the data source itself.
    const hasRepository = REPOSITORY_KEYS.every((key) => byKey[key])

    // ------------------------------------------------- the old `view`
    const rootView =
      byKey.view && isObjectLiteral(byKey.view.node)
        ? migrateView(byKey.view.node, "root")
        : undefined
    if (byKey.view && !rootView) {
      note(
        byKey.view.node,
        "RV1-VIEW-001",
        "`view` is a variable: spread its common keys at the root and its list keys in `views.list` by hand."
      )
    }

    // ------------------------------------------------- the old `views`
    const viewParts = {}
    if (byKey.views && isObjectLiteral(byKey.views.node)) {
      for (const entry of entriesOf(byKey.views.node)) {
        if (
          entry.kind === "prop" &&
          ACTIONS.includes(entry.key) &&
          isObjectLiteral(entry.node)
        ) {
          viewParts[entry.key] = {
            ...migrateView(entry.node, entry.key),
            comments: entry.comments,
          }
        } else if (entry.kind === "prop" && ACTIONS.includes(entry.key)) {
          viewParts[entry.key] = {
            spreadValue: valueOf(entry.node),
            comments: entry.comments,
          }
        } else {
          note(
            entry.node ?? byKey.views.node,
            "RV1-VIEW-002",
            "an entry of `views` could not be read."
          )
        }
      }
    }

    const gatherView = (part, action) => {
      if (!part) return
      if (part.spreadValue) {
        views[action].push(spread(part.spreadValue))
        return
      }
      // The list also receives what the old `view` held: the comment written
      // above `views.list` is about the action's own options.
      const contributed = [...part.own, ...part.list]
      if (action === "list" && rootView && contributed[0] && part.comments) {
        contributed[0].comments = part.comments + contributed[0].comments
        part.comments = ""
      }
      if (part.title && part.title.literal !== derivedTitle(action)) {
        const title = part.title
        views[action].unshift(prop("title", title.value, title.comments))
      }
      views[action].push(
        ...withComponents(
          part.own,
          part.components.length ? object(part.components) : undefined
        )
      )
      views.list.push(...part.list)
      if (part.filters.length) {
        // 0.x merged `view` and `views.list` shallowly: the list's
        // `formFilter` replaced the root's, its `defaultFilter` too — each on
        // its own.
        const sources = new Set(part.filters.map((entry) => entry.source))
        rootFilters = rootFilters.filter((entry) => !sources.has(entry.source))
        listFilters.push(...part.filters)
      }
      if (part.layouts) layoutsSource = part.layouts
      resourceLevel.push(...part.resource)
      if (part.exportPermission) exportPermission = part.exportPermission
      for (const [target, moved] of Object.entries(part.perAction))
        views[target].push(...moved)
      if (part.layoutComponents.length) {
        listLayoutComponents.push(...part.layoutComponents)
      }
    }

    const listLayoutComponents = []
    let rootFilters = []
    const listFilters = []

    // -------------------------------------------------- root entries
    for (const entry of entries) {
      if (entry.kind !== "prop") {
        root.push(asEntry(entry))
        continue
      }
      const { key, node, comments } = entry

      if (PERMISSION_KEYS.includes(key)) {
        if (permissionsPosition === undefined) {
          permissionsPosition = root.length
          root.push({ kind: "placeholder", name: "permissions", comments })
        }
        continue
      }
      switch (key) {
        case "scope":
          if (!defaults) scopes.push({ scope: rewrite(node), node: call ?? literal })
          break
        case "view":
          if (rootView) {
            root.push({ kind: "placeholder", name: "view", comments })
          } else {
            root.push(
              prop(
                "view",
                valueOf(node),
                [
                  comments,
                  todo(
                    "RV1-VIEW-001",
                    "`view` is gone: move its keys to the root and to views.list"
                  ),
                ].join("\n")
              )
            )
          }
          break
        case "views":
          viewsComments = comments
          viewsPosition = root.length
          root.push({ kind: "placeholder", name: "views" })
          if (!isObjectLiteral(node)) {
            note(node, "RV1-VIEW-002", "`views` is a variable: migrate it by hand.")
            viewsVariable = valueOf(node)
            viewsComments = [
              comments,
              todo(
                "RV1-VIEW-002",
                "views is a variable: rewrite what it holds in 1.0"
              ),
            ].join("\n")
          }
          break
        case "components":
          // Merged with what the 0.x `view` and `decoratorComponent` bring.
          if (isObjectLiteral(node)) {
            entriesOf(node).forEach((component, index) => {
              const migrated =
                component.kind === "prop" && component.key === "noResult"
                  ? prop("empty", valueOf(component.node), component.comments)
                  : asEntry(component)
              if (index === 0) migrated.comments = comments + migrated.comments
              components.push(migrated)
            })
            if (!root.some((item) => item.name === "components")) {
              root.push({ kind: "placeholder", name: "components" })
            }
          } else {
            root.push(prop(key, valueOf(node), comments))
          }
          break
        case "preGetCollection":
        case "preGetItem":
        case "preCreate":
        case "preUpdate":
          hooks.push(prop(HOOK_KEYS[key], valueOf(node), comments))
          if (!root.some((item) => item.name === "hooks"))
            root.push({ kind: "placeholder", name: "hooks" })
          break
        case "getCollection":
        case "getItem":
        case "createItem":
        case "updateItem":
        case "removeItem":
          repository.push(prop(key, valueOf(node), comments))
          if (!root.some((item) => item.name === "repository"))
            root.push({ kind: "placeholder", name: "repository" })
          break
        case "limit":
          if (isObjectLiteral(node)) {
            root.push(
              prop(
                "quota",
                object(
                  entriesOf(node).map((limitEntry) =>
                    limitEntry.kind === "prop" && limitEntry.key === "getLimit"
                      ? prop("get", valueOf(limitEntry.node), limitEntry.comments)
                      : asEntry(limitEntry)
                  )
                ),
                comments
              )
            )
          } else {
            root.push(
              prop(
                "quota",
                valueOf(node),
                [comments, todo("RV1-DATA-004", "`getLimit` is now `get`")].join(
                  "\n"
                )
              )
            )
            note(
              node,
              "RV1-DATA-004",
              "`limit` is a variable: rename `getLimit` → `get` by hand."
            )
          }
          break
        case "decoratorComponent":
          components.push(prop("wrapper", valueOf(node), comments))
          if (!root.some((item) => item.name === "components"))
            root.push({ kind: "placeholder", name: "components" })
          break
        case "resourceBuild":
        case "onChange":
        case "@type":
          break
        default:
          root.push(prop(key, valueOf(node), comments))
      }
    }

    // ----------------------------------------- distributing the views
    if (rootView) {
      // The title the old `view` gave every action.
      if (rootView.title) {
        const name = byKey.name ? literalValue(byKey.name.node) : undefined
        if (!byKey.name) {
          root.unshift(prop("name", rootView.title.value, rootView.title.comments))
        } else if (
          rootView.title.source !== byKey.name.node.getText(file) &&
          (rootView.title.literal === undefined || rootView.title.literal !== name)
        ) {
          listTitle = rootView.title
        }
      }
      for (const [target, moved] of Object.entries(rootView.perAction)) {
        const replaced = viewParts[target]?.keys ?? new Set()
        views[target].push(...moved.filter((entry) => !replaced.has(entry.origin)))
      }
      views.list.push(...rootView.list)
      rootFilters = [...rootView.filters]
      if (rootView.layouts) layoutsSource = rootView.layouts
      resourceLevel.push(...rootView.resource)
      if (rootView.exportPermission) exportPermission = rootView.exportPermission
      listLayoutComponents.push(...rootView.layoutComponents)
    }
    for (const action of ACTIONS) gatherView(viewParts[action], action)
    if (rootFilters.length || listFilters.length) {
      views.list.push(prop("filters", object([...rootFilters, ...listFilters])))
    }
    if (listTitle && !views.list.some((entry) => entry.key === "title")) {
      views.list.unshift(prop("title", listTitle.value, listTitle.comments))
    }

    // The layouts — the options of the list a layout held (its behaviour's
    // selection, a shared fragment of them) go to the list.
    if (layoutsSource) {
      const node = layoutsSource.node
      let layouts
      if (ts.isArrayLiteralExpression(node)) {
        const fromLayouts = []
        layouts = array(
          node.elements.map((element) => {
            if (
              ts.isCallExpression(element) &&
              ts.isIdentifier(element.expression) &&
              isFactory(element.expression.text)
            ) {
              const call = migrateFactory(element)
              fromLayouts.push(...call.list)
              return withComments(call, element)
            }
            return withComments(valueOf(element), element)
          })
        )
        views.list.push(...fromLayouts)
      } else {
        layouts = valueOf(node)
      }
      views.list.push(prop("layouts", layouts, layoutsSource.comments))
      if (listLayoutComponents.length) {
        note(
          node,
          "RV1-LAYOUT-010",
          "list, row and item components declared on a view next to layouts had no effect and were dropped."
        )
      }
    } else if (listLayoutComponents.length) {
      used.layout = true
      views.list.push(
        prop(
          "layouts",
          array([
            {
              kind: "call",
              callee: "layout.table",
              args: [object([prop("components", object(listLayoutComponents))])],
            },
          ])
        )
      )
    }
    // A shared board fragment spread in here says where the cards open.
    for (const name of fragmentsSpreadIn(literal)) {
      if (!views.read.some((entry) => entry.key === "open")) {
        views.read.push(prop("open", text(fragmentOpens.get(name))))
      }
    }

    // ---------------------------------------------------- permissions
    const permissions = defaults
      ? undefined
      : migratePermissions(
          byKey,
          hasPath,
          exportPermission,
          call ?? literal,
          drawsBoard(literal)
        )

    // ------------------------------------------------------- assembly
    const out = []
    // The resource's own components, its wrapper and the old view's: one
    // `components`, written where the first of them was.
    const allComponents = [...components, ...(rootView?.components ?? [])]
    let componentsEmitted = false
    const written = Object.keys(viewParts)
    const order = [
      ...ACTIONS.filter((action) => !written.includes(action) && action === "list"),
      ...written,
      ...ACTIONS.filter((action) => !written.includes(action) && action !== "list"),
    ]
    const viewsEntries = order
      .filter((action) => views[action].length)
      .map((action) =>
        prop(
          action,
          object(dedupe(views[action])),
          viewParts[action]?.comments ?? ""
        )
      )
    for (const item of root) {
      if (item.kind !== "placeholder") {
        out.push(item)
        continue
      }
      switch (item.name) {
        case "permissions":
          if (permissions) out.push(prop("permissions", permissions, item.comments))
          break
        case "view": {
          const common = withComponents(
            allComponents.length &&
              !componentsEmitted &&
              !rootView.own.some((entry) => entry.kind === "placeholder")
              ? [...rootView.own, { kind: "placeholder", name: "components" }]
              : rootView.own,
            allComponents.length && !componentsEmitted
              ? object(dedupe(allComponents))
              : undefined
          )
          if (allComponents.length) componentsEmitted = true
          if (common[0]) common[0].comments = item.comments + common[0].comments
          out.push(...common)
          break
        }
        case "views":
          if (viewsVariable) {
            out.push(
              prop(
                "views",
                viewsEntries.length
                  ? object([spread(viewsVariable), ...viewsEntries])
                  : viewsVariable,
                viewsComments
              )
            )
          } else if (viewsEntries.length) {
            out.push(prop("views", object(viewsEntries), viewsComments))
          }
          break
        case "hooks":
          out.push(prop("hooks", object(hooks)))
          break
        case "repository":
          out.push(prop("repository", object(repository)))
          break
        case "components":
          if (allComponents.length && !componentsEmitted) {
            out.push(prop("components", object(dedupe(allComponents))))
            componentsEmitted = true
          }
          break
      }
    }
    out.push(...resourceLevel)
    if (viewsPosition === undefined && viewsEntries.length) {
      out.push(prop("views", object(viewsEntries)))
    }

    // Without a path, 0.x kept the records in localStorage without a word.
    const rootComponents =
      byKey.components && isObjectLiteral(byKey.components.node)
        ? entriesOf(byKey.components.node)
        : []
    const hasPageComponent = [
      ...(rootView?.components ?? []),
      ...rootComponents,
    ].some((entry) => entry.key === "view")
    const hasDataSource =
      hasPath || hasRepository || Boolean(byKey.storage) || Boolean(byKey.repository)
    if (!defaults && !hasDataSource && !hasPageComponent) {
      const anchor = Math.max(
        ...["name", "icon", "alias"].map((key) =>
          out.findIndex((entry) => entry.key === key)
        )
      )
      out.splice(anchor + 1, 0, prop("storage", quoted("local")))
    }

    // A declaration reads one key per line, however short it is. A key
    // written twice — at the root and in the old `view` — keeps the view's,
    // which is the one 0.x read.
    return { ...object(dedupe(out)), expand: !defaults }
  }

  /** Whether a declaration is written in 0.x: it uses a key 1.0 no longer has. */
  function isLegacy(byKey) {
    return [
      "view",
      "scope",
      "limit",
      "decoratorComponent",
      ...PERMISSION_KEYS,
      ...REPOSITORY_KEYS,
      ...Object.keys(HOOK_KEYS),
    ].some((key) => byKey[key])
  }

  /** The entries of a view, `components` in the place it was written in. */
  function withComponents(entries, components) {
    return entries.flatMap((entry) =>
      entry.kind === "placeholder"
        ? components
          ? [prop("components", components)]
          : []
        : [entry]
    )
  }

  /** Keeps the last of two entries with the same key — the view's own wins. */
  function dedupe(entries) {
    const seen = new Set()
    const result = []
    for (const entry of [...entries].reverse()) {
      if (entry.kind === "prop") {
        if (seen.has(entry.key)) continue
        seen.add(entry.key)
      }
      result.unshift(entry)
    }
    return result
  }

  /** Whether a board is declared in `node`, 0.x or 1.0. */
  function drawsBoard(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (callee.getText(file) === "layout.board") return true
      if (
        ts.isIdentifier(callee) &&
        isFactory(callee.text) &&
        FACTORIES[imported.get(callee.text) ?? callee.text].type === "board"
      ) {
        return true
      }
    }
    return Boolean(ts.forEachChild(node, (child) => drawsBoard(child) || undefined))
  }

  /**
   * The 0.x permissions, written so a migrated resource offers exactly what
   * it offered: an undeclared action was refused.
   */
  function migratePermissions(byKey, hasPath, exportEntry, declaration, hasBoard) {
    // A declaration that named no permission at all offered no action in
    // 0.x: that was the default nobody chose, and 1.0 offers everything.
    if (!PERMISSION_KEYS.some((key) => byKey[key]) && !exportEntry) {
      if (isLegacy(byKey)) {
        note(
          declaration,
          "RV1-PERM-002",
          "no permission was declared: 0.x offered no read, create, update or delete button here, 1.0 offers them all. Add `permissions` if that was the intent."
        )
      }
      return undefined
    }
    const valueFor = (entry) => {
      if (!entry) return false
      const literal = literalValue(entry.node)
      return typeof literal === "boolean" ? literal : rewrite(entry.node)
    }

    // 0.x never refused a list page — `canRead` only hid buttons and the
    // way back to the list — so the list stays allowed unless `canList` said
    // otherwise.
    const values = {
      list: byKey.canList ? valueFor(byKey.canList) : true,
      read: valueFor(byKey.canRead),
      create: valueFor(byKey.canCreate),
      update: valueFor(byKey.canUpdate),
      delete: valueFor(byKey.canDelete),
    }
    // Without a path there is nothing to export: the button needs one.
    if (hasPath) values.export = valueFor(exportEntry)

    const keys = Object.keys(values).filter((key) => values[key] !== undefined)
    const allLiteral = keys.every((key) => typeof values[key] === "boolean")

    // 0.x moved the cards of a board whatever `canUpdate` said; 1.0 asks
    // `update`, unless `move` is declared.
    const stopsCards = hasBoard && values.update !== true
    if (stopsCards) {
      note(
        declaration,
        "RV1-PERM-008",
        "`update` is refused and a board is declared: 0.x moved its cards anyway, 1.0 does not. Add `move: true` to `permissions` if the cards should still move."
      )
    }

    // Written as an object when the board's cards need a word on `update`.
    if (allLiteral && !stopsCards) {
      const allowed = keys.filter((key) => values[key])
      if (allowed.length === keys.length) return undefined
      const readonly = hasPath ? ["list", "read", "export"] : ["list", "read"]
      if (
        allowed.length === readonly.length &&
        readonly.every((key) => allowed.includes(key))
      ) {
        return quoted("readonly")
      }
    }

    // Allowed by default: only the refusals are written.
    return object(
      keys
        .filter((key) => values[key] !== true)
        .map((key) =>
          prop(
            key,
            values[key] === false ? text("false") : text(values[key]),
            key === "update" && stopsCards
              ? todo(
                  "RV1-PERM-008",
                  "add `move: true` if the board's cards should still move"
                )
              : ""
          )
        )
    )
  }

  const migrateDeclaration = (literal, call) =>
    migrateDefinitionObject(literal, { call })

  /* ------------------------------------------------------------ run */

  let output = rewrite(file)
  // `rewrite` starts at the first token; keep the file's leading trivia.
  output = source.slice(0, file.getStart(file)) + output.slice(0)

  if (output !== source) {
    output = fixImports(output, fileName, ts, { used, renamed, packages })
  }

  return {
    output,
    changed: output !== source,
    notes,
    scopes: scopes.map(({ scope, node }) => ({
      scope,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
    })),
  }
}

/**
 * The imports after the rewrite: the factories gone, `layout` and
 * `configureResourceView` added when used, renamed identifiers renamed, and
 * `ActionList` dropped when nothing uses it anymore.
 */
function fixImports(source, fileName, ts, { used, renamed, packages }) {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
  const references = new Map()
  const visit = (node) => {
    if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent)) {
      references.set(node.text, (references.get(node.text) ?? 0) + 1)
    }
    ts.forEachChild(node, visit)
  }
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) visit(statement)
  }

  const edits = []
  let hasPackageImport = false
  let lastImportEnd = 0
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    lastImportEnd = statement.end

    // A factory imported by its own path, as a default import: gone once
    // nothing calls it.
    const defaultName = statement.importClause?.name?.text
    if (
      defaultName &&
      FACTORIES[defaultName] &&
      !references.get(defaultName) &&
      !statement.importClause.namedBindings
    ) {
      edits.push([statement.getStart(file), statement.end, ""])
      continue
    }

    if (
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue
    }
    const module = statement.moduleSpecifier.text
    const isPackage = packages.includes(module)
    if (isPackage) hasPackageImport = true
    if (!isPackage && module !== "react-data-form") continue

    const elements = statement.importClause.namedBindings.elements
    const names = []
    for (const element of elements) {
      const local = element.name.text
      const isType = element.isTypeOnly ? "type " : ""
      if (isPackage) {
        // A factory still used as a value is left for the hand to see.
        if (
          FACTORIES[(element.propertyName ?? element.name).text] &&
          !references.get(local)
        ) {
          continue
        }
        if (renamed.has(local) && IDENTIFIERS[local]) {
          names.push(isType + IDENTIFIERS[local])
          continue
        }
        if (local === "createItemMenuWithResource" && !references.get(local))
          continue
        if (local === "createView" && !references.get(local)) continue
      }
      if (
        module === "react-data-form" &&
        local === "ActionList" &&
        !references.get(local)
      ) {
        continue
      }
      names.push(element.getText(file))
    }
    if (isPackage) {
      if (used.layout && !names.includes("layout")) names.push("layout")
      if (used.configureResourceView && !names.includes("configureResourceView")) {
        names.push("configureResourceView")
      }
      for (const type of used.types) {
        if (!names.includes(type) && !names.includes(`type ${type}`))
          names.push(`type ${type}`)
      }
    }

    const original = elements.map((element) => element.getText(file))
    if (
      original.length === names.length &&
      original.every((name, index) => name === names[index])
    ) {
      continue
    }

    const typeOnly = statement.importClause.isTypeOnly ? "type " : ""
    const defaultImport = statement.importClause.name
      ? statement.importClause.name.text + (names.length ? ", " : "")
      : ""
    // Written over as many lines as it was.
    const multiline = statement.getText(file).includes("\n") && names.length > 1
    const bindings = multiline
      ? `{\n${names.map((name) => `  ${name},`).join("\n")}\n}`
      : `{ ${names.join(", ")} }`
    const replacement =
      names.length || defaultImport
        ? `import ${typeOnly}${defaultImport}${names.length ? bindings : ""} from ${statement.moduleSpecifier.getText(file)}`
        : ""
    edits.push([statement.getStart(file), statement.end, replacement])
  }

  if (!hasPackageImport && (used.layout || used.configureResourceView)) {
    const names = [
      ...(used.layout ? ["layout"] : []),
      ...(used.configureResourceView ? ["configureResourceView"] : []),
    ]
    edits.push([
      lastImportEnd,
      lastImportEnd,
      `\nimport { ${names.join(", ")} } from "${PACKAGE}"`,
    ])
  }

  let output = source
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) {
    const after = replacement === "" && output[end] === "\n" ? end + 1 : end
    output = output.slice(0, start) + replacement + output.slice(after)
  }
  return output
}

/* -------------------------------------------------------------------------- */
/* Files                                                                      */
/* -------------------------------------------------------------------------- */

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
const SKIPPED = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage",
])

async function collectFiles(path) {
  const stat = statSync(path)
  if (stat.isFile()) return EXTENSIONS.includes(extname(path)) ? [path] : []

  const files = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue
    const child = join(path, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(child)))
    else if (
      EXTENSIONS.includes(extname(entry.name)) &&
      !/\.d\.[cm]?ts$/.test(entry.name)
    ) {
      files.push(child)
    }
  }
  return files
}

/** Formats with the project's Prettier and its configuration, when it has them. */
export async function formatWithPrettier(source, filePath, cwd = process.cwd()) {
  const prettier = await loadPrettier(cwd)
  if (!prettier) return source
  const api = prettier.default ?? prettier
  const options = (await api.resolveConfig(filePath)) ?? {}
  return api.format(source, { ...options, filepath: filePath })
}

/**
 * Whether a file was already formatted by the project's Prettier: only then is
 * the rewritten file formatted — a file kept by hand is not reflowed whole.
 */
async function isFormatted(source, filePath, cwd) {
  const prettier = await loadPrettier(cwd)
  if (!prettier) return false
  const api = prettier.default ?? prettier
  const options = (await api.resolveConfig(filePath)) ?? {}
  try {
    return await api.check(source, { ...options, filepath: filePath })
  } catch {
    return false
  }
}

export const MIGRATE_USAGE = `react-resource-view migrate — rewrites 0.x declarations into 1.0

Usage
  npx react-resource-view migrate [paths…] [options]

Arguments
  paths          Files or directories to rewrite (default: src).

Options
      --dry-run  Print what would change, write nothing.
      --check    Exit with 1 when a file would change (for CI).
      --no-format  Do not run the project's Prettier on the rewritten files
                 (it only runs on files it had already formatted).
  -h, --help     Show this.

What the migration cannot decide is left as a \`TODO(RV1-…)\` comment and
listed below the summary; every id is explained in MIGRATION-1.0.md and in
migrations/1.0.json (shipped with the package).
`

export async function runMigrate(
  argv,
  { cwd = process.cwd(), log = console.log, error = console.error } = {}
) {
  const options = {
    paths: [],
    dryRun: false,
    check: false,
    format: true,
    help: false,
  }
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true
    else if (arg === "--check") options.check = true
    else if (arg === "--no-format") options.format = false
    else if (arg === "-h" || arg === "--help") options.help = true
    else if (arg.startsWith("-")) {
      error(`Unknown option: ${arg}\n\n${MIGRATE_USAGE}`)
      return 1
    } else options.paths.push(arg)
  }
  if (options.help) {
    log(MIGRATE_USAGE)
    return 0
  }

  const ts = loadTypeScript(cwd)
  const roots = (options.paths.length ? options.paths : ["src"]).map((path) =>
    resolve(cwd, path)
  )
  // A mistyped path fails before anything is rewritten, rather than passing
  // a check with nothing in it.
  const missing = roots.filter((root) => !existsSync(root))
  if (missing.length) {
    for (const root of missing)
      error(`No such file or directory: ${relative(cwd, root) || root}`)
    return 1
  }
  const files = (await Promise.all(roots.map(collectFiles))).flat()

  let changed = 0
  let failed = 0
  const allNotes = []
  const allScopes = []

  for (const filePath of files) {
    const shown = relative(cwd, filePath)
    // A file the migration cannot read or rewrite is named, and left as it
    // is: the others are still migrated.
    try {
      const source = await readFile(filePath, "utf8")
      if (!TRIGGERS.some((trigger) => source.includes(trigger))) continue

      const result = transformSource(source, filePath, ts)
      if (result.changed) {
        const output =
          options.format && (await isFormatted(source, filePath, cwd))
            ? await formatWithPrettier(result.output, filePath, cwd)
            : result.output
        if (options.dryRun) {
          log(`--- ${shown}\n${output}`)
        } else if (!options.check) {
          await writeFile(filePath, output)
        }
        changed++
        log(
          `${options.check || options.dryRun ? "would rewrite" : "rewrote"} ${shown}`
        )
      }
      for (const item of result.notes) allNotes.push({ file: shown, ...item })
      for (const item of result.scopes) allScopes.push({ file: shown, ...item })
    } catch (caught) {
      failed++
      error(`could not migrate ${shown}: ${caught?.message ?? caught}`)
    }
  }

  log(
    `\n${changed} file${changed === 1 ? "" : "s"} ${options.check || options.dryRun ? "to rewrite" : "rewritten"}.`
  )
  if (failed) {
    log(
      `${failed} file${failed === 1 ? "" : "s"} could not be migrated, and ${failed === 1 ? "was" : "were"} left as ${failed === 1 ? "it was" : "they were"}.`
    )
  }

  if (allScopes.length) {
    log(
      `\nScopes (RV1-SCOPE-001) — a resource no longer names its scope: list each of these in the \`resources\` of its scope.`
    )
    for (const item of allScopes)
      log(`  ${item.file}:${item.line}  scope ${item.scope}`)
  }
  if (allNotes.length) {
    log(`\nTo do by hand (see MIGRATION-1.0.md):`)
    for (const item of allNotes)
      log(`  ${item.file}:${item.line}  ${item.id}  ${item.message}`)
  }

  return failed || (options.check && changed) ? 1 : 0
}

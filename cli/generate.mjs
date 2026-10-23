/**
 * react-resource-view — `generate resources`: one declaration per resource of
 * an OpenAPI schema.
 *
 * `init` writes a single example resource; this reads the schema the API
 * already publishes and writes the rest — the path, the form inputs and their
 * controllers, the permissions the operations allow, a table, and a board when
 * the resource has a status. Like the rest of the command line it is templates
 * and nothing else: no dependency, no build step, and the schema is read as
 * JSON.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

/* -------------------------------------------------------------------------- */
/* Naming                                                                     */
/* -------------------------------------------------------------------------- */

const words = (value) =>
  String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)

const pascal = (value) =>
  words(value)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("")

const camel = (value) => {
  const name = pascal(value)
  return name ? name[0].toLowerCase() + name.slice(1) : ""
}

const constant = (value) =>
  words(value)
    .map((word) => word.toUpperCase())
    .join("_")

/** "published_at" and "publishedAt" both read "Published at". */
const humanize = (value) => {
  const text = words(value)
    .map((word) => word.toLowerCase())
    .join(" ")
  return text ? text[0].toUpperCase() + text.slice(1) : String(value)
}

const singular = (value) =>
  value.endsWith("ies")
    ? `${value.slice(0, -3)}y`
    : value.endsWith("ses") || value.endsWith("xes")
      ? value.slice(0, -2)
      : value.endsWith("s") && !value.endsWith("ss")
        ? value.slice(0, -1)
        : value

const isIdentifier = (key) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
const property = (key) => (isIdentifier(key) ? key : JSON.stringify(key))

/* -------------------------------------------------------------------------- */
/* Reading the schema                                                         */
/* -------------------------------------------------------------------------- */

const ENVELOPE_KEYS = ["hydra:member", "member", "items", "data", "results"]
const JSON_TYPES = ["application/ld+json", "application/json"]

/** The node a `#/a/b` reference points to. */
function pointer(document, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((node, part) => node?.[part], document)
}

/**
 * A schema with its references followed, its `allOf` merged and its nullable
 * spelling (3.0 `nullable`, 3.1 `type: [x, "null"]`, `anyOf` with null)
 * reduced to one `nullable` flag. `refName` is the name of the last schema
 * the reference went through — what tells a relation from a plain object.
 */
export function resolveSchema(document, schema, depth = 0) {
  if (!schema || typeof schema !== "object" || depth > 12) return {}

  if (schema.$ref) {
    const target = resolveSchema(document, pointer(document, schema.$ref), depth + 1)
    const rest = { ...schema }
    delete rest.$ref
    return {
      ...target,
      ...rest,
      refName: String(schema.$ref).split("/").pop(),
    }
  }

  let merged = { ...schema }
  delete merged.allOf

  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf) {
      const resolved = resolveSchema(document, part, depth + 1)
      merged = {
        ...resolved,
        ...merged,
        properties: { ...merged.properties, ...resolved.properties },
        required: [...(resolved.required ?? []), ...(merged.required ?? [])],
        nullable: resolved.nullable || merged.nullable,
        refName: merged.refName ?? resolved.refName,
      }
    }
  }

  const branches = schema.anyOf ?? schema.oneOf
  if (Array.isArray(branches)) {
    const isNull = (branch) => branch?.type === "null"
    const rest = branches.filter((branch) => !isNull(branch))
    const first = resolveSchema(document, rest[0], depth + 1)
    merged = {
      ...first,
      ...merged,
      nullable: rest.length < branches.length || first.nullable,
    }
    delete merged.anyOf
    delete merged.oneOf
  }

  if (Array.isArray(merged.type)) {
    const types = merged.type.filter((type) => type !== "null")
    merged = {
      ...merged,
      type: types[0],
      nullable: types.length < merged.type.length || merged.nullable,
    }
  }

  if (merged.type === undefined && merged.properties) merged.type = "object"
  return merged
}

/** The JSON schema of a content map (`{ "application/json": { schema } }`). */
function contentSchema(content) {
  if (!content || typeof content !== "object") return undefined
  const type =
    JSON_TYPES.find((candidate) => content[candidate]) ??
    Object.keys(content).find((candidate) => candidate.includes("json")) ??
    Object.keys(content)[0]
  return content[type]?.schema
}

/** Parameters of an operation, references followed. */
function parametersOf(document, pathItem, operation) {
  return [...(pathItem?.parameters ?? []), ...(operation?.parameters ?? [])].map(
    (parameter) => (parameter.$ref ? pointer(document, parameter.$ref) : parameter)
  )
}

/** The schema an operation takes, in OpenAPI 3 or Swagger 2. */
function requestSchema(document, pathItem, operation) {
  if (!operation) return undefined
  const body = operation.requestBody?.$ref
    ? pointer(document, operation.requestBody.$ref)
    : operation.requestBody
  const fromBody = contentSchema(body?.content)
  if (fromBody) return fromBody
  return parametersOf(document, pathItem, operation).find(
    (parameter) => parameter?.in === "body"
  )?.schema
}

/** The schema of the first success response, in OpenAPI 3 or Swagger 2. */
function responseSchema(document, operation) {
  if (!operation?.responses) return undefined
  const code = Object.keys(operation.responses).find((status) => /^2/.test(status))
  if (!code) return undefined
  const response = operation.responses[code]?.$ref
    ? pointer(document, operation.responses[code].$ref)
    : operation.responses[code]
  return response?.schema ?? contentSchema(response?.content)
}

/** The schema of one record, out of a list response — whatever envelope. */
function itemSchemaOfList(document, schema) {
  const list = resolveSchema(document, schema)
  if (list.type === "array") return list.items
  const members = list.properties ?? {}
  const key =
    ENVELOPE_KEYS.find(
      (candidate) => resolveSchema(document, members[candidate]).type === "array"
    ) ??
    Object.keys(members).find(
      (candidate) => resolveSchema(document, members[candidate]).type === "array"
    )
  return key ? resolveSchema(document, members[key]).items : undefined
}

/** `/api/books/{id}` is the item path of `/api/books`; nothing else is. */
const itemPathOf = (collection) =>
  new RegExp(`^${collection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\{[^/}]+\\}$`)

/** The path of the API, `basePath` of a Swagger 2 document included. */
function prefixOf(document) {
  const base = typeof document.basePath === "string" ? document.basePath : ""
  return base === "/" ? "" : base.replace(/\/+$/, "")
}

const SEARCH_KEYS = [
  "name",
  "title",
  "label",
  "email",
  "slug",
  "reference",
  "username",
]
const STATUS_KEYS = /^(status|state|stage|phase|statut|etat)$/i

/**
 * The resources a schema declares: every collection path whose list or create
 * operation speaks about records with properties.
 *
 * Returns `{ resources, skipped }` — `skipped` says which paths were left out
 * and why, so the command can tell the reader instead of silently losing one.
 */
export function readResources(document) {
  const paths = document?.paths ?? {}
  const prefix = prefixOf(document ?? {})
  const resources = []
  const skipped = []

  for (const collection of Object.keys(paths)) {
    if (/\{[^}]+\}/.test(collection)) continue
    const pathItem = paths[collection]
    const get = pathItem.get
    const post = pathItem.post
    if (!get && !post) continue

    const bare = collection.replace(/\/+$/, "")
    const segments = bare.split("/").filter(Boolean)
    const id = segments[segments.length - 1]
    if (!id) continue

    const itemKey = Object.keys(paths).find((candidate) =>
      itemPathOf(bare).test(candidate.replace(/\/+$/, ""))
    )
    const itemItem = itemKey ? paths[itemKey] : undefined

    // A POST with nothing to list or read back is an action (`/token`), not a
    // resource.
    if (!get && !itemItem) continue

    // PostgREST has no item route: the collection is read, patched and
    // deleted with filters.
    const operations = itemItem ?? pathItem
    const ops = {
      list: Boolean(get),
      create: Boolean(post),
      read: Boolean(operations.get),
      update: Boolean(operations.put || operations.patch),
      delete: Boolean(operations.delete),
    }

    const readSchema =
      (get && itemSchemaOfList(document, responseSchema(document, get))) ||
      (itemItem?.get && responseSchema(document, itemItem.get)) ||
      (post && responseSchema(document, post))
    const writeSchema =
      requestSchema(document, pathItem, post) ??
      requestSchema(document, itemItem, itemItem?.put ?? itemItem?.patch) ??
      requestSchema(document, pathItem, pathItem.patch ?? pathItem.put)

    const read = resolveSchema(document, readSchema ?? writeSchema)
    if (!read.properties || !Object.keys(read.properties).length) {
      skipped.push({ path: collection, reason: "no record schema" })
      continue
    }

    const write = writeSchema ? resolveSchema(document, writeSchema) : undefined
    const parameters = get
      ? parametersOf(document, pathItem, get).filter((p) => p?.in === "query")
      : []

    resources.push({
      id,
      path: `${prefix}${bare}`,
      ops,
      schemaName: read.refName ?? write?.refName,
      read,
      write,
      filters: parameters.map((parameter) => parameter.name),
      document,
    })
  }

  // The same last segment under two prefixes would write the same file.
  const seen = new Set()
  return {
    resources: resources.filter((resource) => {
      if (seen.has(resource.id)) {
        skipped.push({ path: resource.path, reason: `"${resource.id}" is taken` })
        return false
      }
      seen.add(resource.id)
      return true
    }),
    skipped,
  }
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

/** A schema name without the serializer's suffix: `Book.jsonld-book.read` → `Book`. */
const cleanSchemaName = (name) => String(name ?? "").split(/[.-]/)[0]

/**
 * The resource a property refers to, or `undefined`.
 *
 * An IRI is a relation by its format; a foreign key by its name (`author_id`)
 * or, for PostgREST, by the `<fk table='…'/>` it writes in the description.
 */
function relationOf(key, schema, resources) {
  const byId = (name) =>
    resources.find(
      (resource) =>
        resource.id.toLowerCase() === String(name).toLowerCase() ||
        singular(resource.id).toLowerCase() === String(name).toLowerCase()
    )

  const target = schema.type === "array" ? schema.items : schema
  const format = target?.format
  const stem = key.replace(/(_id|Id|_iri|Iri|_ids|Ids)$/, "")
  const foreign = /<fk table='([^']+)'/.exec(schema.description ?? "")?.[1]

  if (foreign && byId(foreign)) return { resource: byId(foreign), valueField: "id" }

  if (format === "iri-reference") {
    const resource = byId(stem) ?? byId(singular(stem))
    return resource ? { resource, valueField: "@id" } : { resource: undefined }
  }

  if (stem !== key && (target?.type === "integer" || target?.type === "string")) {
    const resource = byId(stem)
    if (resource) return { resource, valueField: "id" }
  }

  return undefined
}

const STRING_CONTROLLERS = {
  date: "DatePickerInputController",
  "date-time": "DatePickerInputController",
  time: "TimeInputController",
  email: "EmailInputController",
  password: "PasswordInputController",
  uri: "WebsiteInputController",
  url: "WebsiteInputController",
}

const LONG_TEXT =
  /^(description|content|body|notes?|summary|bio|comment|message|text)$/i

/** The options of an enum, as `{ value, label }`. */
function enumOptions(values) {
  return values
    .filter((value) => value !== null)
    .map((value) => ({
      value,
      label: typeof value === "string" ? humanize(value) : String(value),
    }))
}

/**
 * One field of a record, as the form needs to know it.
 *
 * `controller` names a `react-data-form` controller; `options` is set for an
 * enum, `relation` for an IRI or a foreign key.
 */
function describeField(key, schema, resources) {
  const field = { key, schema }
  const list = schema.type === "array"
  const item = list ? resolveSchemaItem(schema) : schema

  const relation = relationOf(key, schema, resources)
  if (relation) {
    field.relation = relation
    field.controller = list
      ? "MultiSelectSearchInputController"
      : "SelectSearchInputController"
    return field
  }

  if (Array.isArray(item.enum) && item.enum.length) {
    field.options = enumOptions(item.enum)
    field.controller = list ? "MultiSelectInputController" : "SelectInputController"
    return field
  }

  if (list) {
    field.controller = undefined
    return field
  }

  switch (schema.type) {
    case "boolean":
      field.controller = "SwitchInputController"
      break
    case "integer":
    case "number":
      field.controller = "NumberInputController"
      break
    case "string":
      field.controller =
        STRING_CONTROLLERS[schema.format] ??
        (/^timestamp|^date/.test(schema.format ?? "")
          ? "DatePickerInputController"
          : undefined) ??
        (/^time\b/.test(schema.format ?? "") ? "TimeInputController" : undefined) ??
        (LONG_TEXT.test(key) || schema.maxLength > 255
          ? "TextAreaInputController"
          : undefined)
      break
    default:
      // An object is embedded, not edited: the form leaves it to its own
      // resource.
      field.skip = true
  }

  return field
}

const resolveSchemaItem = (schema) => schema.items ?? {}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** The TypeScript type of a property. */
function tsType(document, raw) {
  const schema = resolveSchema(document, raw)
  let type

  if (Array.isArray(schema.enum) && schema.enum.length && schema.enum.length <= 24) {
    type = schema.enum
      .filter((value) => value !== null)
      .map((value) => JSON.stringify(value))
      .join(" | ")
  } else if (schema.type === "array") {
    const inner = tsType(document, schema.items)
    type = /[|]/.test(inner) ? `(${inner})[]` : `${inner}[]`
  } else if (schema.type === "integer" || schema.type === "number") type = "number"
  else if (schema.type === "boolean") type = "boolean"
  else if (schema.type === "string") type = "string"
  else if (schema.type === "object") type = "Record<string, unknown>"
  else type = "unknown"

  return schema.nullable && type !== "unknown" ? `${type} | null` : type
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

const WIDTH = 85

/** An object literal on one line when Prettier would keep it there. */
function literal(entries, indent) {
  const inline = `{ ${entries.join(", ")} }`
  if (indent.length + inline.length + 1 <= WIDTH) return inline
  const inner = `${indent}  `
  return `{\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${indent}}`
}

/** The list of keys of a property map, in the order the schema wrote them. */
const isReserved = (key) => key.startsWith("@")

/**
 * What a resource's form is made of.
 *
 * The fields are those the API takes when it says so (the body of the create
 * or update operation, minus `readOnly`), and those it answers with when it
 * takes nothing — a read-only resource still shows its columns.
 */
function formFields(resource, resources) {
  const source = resource.write ?? resource.read
  const required = new Set(source.required ?? [])

  return Object.entries(source.properties ?? {})
    .filter(([key]) => key !== "id" && !isReserved(key))
    .map(([key, raw]) => [key, resolveSchema(resource.document, raw)])
    .filter(([, schema]) => !(resource.write && schema.readOnly))
    .map(([key, schema]) => ({
      ...describeField(key, schema, resources),
      required: required.has(key),
    }))
    .filter((field) => !field.skip)
}

/** The lines of the `valueOptions` constant of an enum field. */
function renderOptions(name, options) {
  const rows = options.map(
    (option) =>
      `  ${literal([`value: ${JSON.stringify(option.value)}`, `label: ${JSON.stringify(option.label)}`], "  ")},`
  )
  return options.length > 1
    ? `const ${name} = [\n${rows.join("\n")}\n]`
    : `const ${name} = [${rows.join("").trim().replace(/,$/, "")}]`
}

/**
 * The file of one resource.
 *
 * `context.resources` is every resource of the schema — a relation points at
 * one of them — and `context.relations` the import of the search helper.
 */
export function renderResource(resource, { resources }) {
  const Type = resource.typeName
  const fields = formFields(resource, resources)
  const imports = new Set()
  const consts = []

  const labelOf = (field) =>
    JSON.stringify(
      humanize(
        field.relation ? field.key.replace(/(_id|Id|_ids|Ids)$/, "") : field.key
      )
    )

  /** The `{ … }` of one input, written for the form or the filters. */
  const renderInput = (field, indent, { filter = false } = {}) => {
    const entries = [`label: ${labelOf(field)}`]
    if (field.required && !filter) entries.push("required: true")
    if (field.controller) {
      imports.add(field.controller)
      entries.push(`controller: ${field.controller}`)
    }
    if (field.options) entries.push(`valueOptions: ${field.optionsName}`)
    if (field.relation?.resource) {
      const target = field.relation.resource
      const label = target.titleField ?? "id"
      const options = `valueField: ${JSON.stringify(field.relation.valueField)}, labelField: ${JSON.stringify(label)}`
      const call = `onSearch: relationSearch(${JSON.stringify(target.path)}, { ${options} })`
      const inner = `${indent}  `
      entries.push(
        inner.length + call.length + 1 <= WIDTH
          ? call
          : `onSearch: relationSearch(${JSON.stringify(target.path)}, {\n${inner}  valueField: ${JSON.stringify(field.relation.valueField)},\n${inner}  labelField: ${JSON.stringify(label)},\n${inner}})`
      )
    }
    return `${property(field.key)}: ${literal(entries, indent)}`
  }

  for (const field of fields) {
    if (field.options) {
      field.optionsName = `${constant(Type)}_${constant(field.key)}`
      consts.push(renderOptions(field.optionsName, field.options))
    }
    if (field.relation?.resource) imports.add("relationSearch")
  }

  // A relation to nothing the schema declares is an IRI typed by hand.
  for (const field of fields) {
    if (field.relation && !field.relation.resource) {
      field.controller = undefined
      field.relation = undefined
    }
  }

  /* The interface: every property the API answers with. */
  const typed = resource.read.properties
  const requiredRead = new Set(resource.read.required ?? [])
  const iri = "@id" in typed
  const lines = []
  if (iri) lines.push(`  "@id": string`)
  for (const [key, raw] of Object.entries(typed)) {
    if (isReserved(key)) continue
    const optional = requiredRead.has(key) ? "" : "?"
    lines.push(`  ${property(key)}${optional}: ${tsType(resource.document, raw)}`)
  }

  /* Permissions. */
  const { ops } = resource
  const denied = ["create", "update", "delete"].filter((action) => !ops[action])
  let permissions
  if (!ops.list || !ops.read) {
    // Nothing to draw a list or a record with: say what is offered.
    const offered = ["list", "read", "create", "update", "delete"].filter(
      (action) => ops[action]
    )
    permissions = `[${offered.map((action) => JSON.stringify(action)).join(", ")}]`
  } else if (denied.length === 3) permissions = `"readonly"`
  else if (denied.length) {
    permissions = `{ ${denied.map((action) => `${action}: false`).join(", ")} }`
  }

  /* The title, the filters and the layouts. */
  const titleField = resource.titleField
  const filterFields = fields
    .filter(
      (field) =>
        resource.filters.some(
          (name) =>
            name.replace(/\[\]$/, "") === field.key || name.endsWith(`.${field.key}`)
        ) &&
        !field.relation &&
        (field.controller === undefined ||
          ["SelectInputController", "SwitchInputController"].includes(
            field.controller
          ))
    )
    .filter((field) => field.schema.type !== "array")
    .slice(0, 4)

  const status = fields.find(
    (field) =>
      STATUS_KEYS.test(field.key) && field.controller === "SelectInputController"
  )
  const layouts = ["layout.table()"]
  if (status)
    layouts.push(`layout.board({ groupBy: ${JSON.stringify(status.key)} })`)
  const layoutsInline = `layouts: [${layouts.join(", ")}],`

  const inputLines = fields.map((field) => `      ${renderInput(field, "      ")},`)
  const filterLines = filterFields.map(
    (field) => `          ${renderInput(field, "          ", { filter: true })},`
  )

  const formattedImports = [...imports]
    .filter((name) => name !== "relationSearch")
    .sort()
  const inlineImport = `import { ${formattedImports.join(", ")} } from "react-data-form"`
  const dataFormImport = !formattedImports.length
    ? ""
    : inlineImport.length <= WIDTH
      ? `${inlineImport}\n`
      : `import {\n${formattedImports.map((name) => `  ${name},`).join("\n")}\n} from "react-data-form"\n`

  const listBody = [
    filterLines.length
      ? `      filters: {\n        inputs: {\n${filterLines.join("\n")}\n        },\n      },`
      : undefined,
    layoutsInline.length + 6 <= WIDTH
      ? `      ${layoutsInline}`
      : `      layouts: [\n${layouts.map((entry) => `        ${entry},`).join("\n")}\n      ],`,
  ]
    .filter(Boolean)
    .join("\n")

  const body = [
    `  name: ${JSON.stringify(resource.name)},`,
    `  icon: Database,`,
    `  path: ${JSON.stringify(resource.path)},`,
    permissions ? `  permissions: ${permissions},` : undefined,
    titleField ? `  titleField: ${JSON.stringify(titleField)},` : undefined,
    fields.length
      ? `  form: {\n    inputs: {\n${inputLines.join("\n")}\n    },\n  },`
      : undefined,
    `  views: {\n    list: {\n${listBody}\n    },\n  },`,
  ]
    .filter(Boolean)
    .join("\n")

  return `import { Database } from "lucide-react"
${dataFormImport}import { createViewResource, layout } from "react-resource-view"
${imports.has("relationSearch") ? `import { relationSearch } from "./relationSearch"\n` : ""}
/**
 * ${resource.name} — written by \`react-resource-view generate resources\` from
 * ${resource.path} in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface ${Type} {
${lines.join("\n")}
}

${consts.length ? `${consts.join("\n\n")}\n\n` : ""}export const ${resource.exportName} = createViewResource<${Type}>(${JSON.stringify(resource.id)}, {
${body}
})
`
}

/** The helper every relation input searches its options with. */
export function renderRelationSearch() {
  return `import { createRepository, getCollectionItems } from "react-resource-view"
import type { ValueOptionInterface } from "react-data-form"

/**
 * The options of a relation input: the records of \`path\` whose
 * \`labelField\` matches what was typed, valued by \`valueField\` — the IRI
 * for API Platform, the key for a foreign key.
 *
 * Written by \`react-resource-view generate resources\`. The query filters on
 * \`labelField\`, which the API must accept as a filter of the collection.
 */
export function relationSearch(
  path: string,
  { valueField, labelField }: { valueField: string; labelField: string }
) {
  const repository = createRepository({ path })

  return async (query: string): Promise<ValueOptionInterface[]> => {
    const { data } = await repository.getCollection(
      query ? { [labelField]: query } : {}
    )

    return getCollectionItems(data).map((item) => ({
      value: item[valueField],
      label: String(item[labelField] ?? item[valueField]),
    }))
  }
}
`
}

/* -------------------------------------------------------------------------- */
/* Planning                                                                   */
/* -------------------------------------------------------------------------- */

/** Names, title field and type name of every resource, before any is written. */
function nameResources(resources) {
  for (const resource of resources) {
    const schemaType = pascal(cleanSchemaName(resource.schemaName))
    const fromId = pascal(singular(resource.id))
    resource.exportName = camel(resource.id)
    resource.fileName = `${resource.exportName}.ts`
    resource.name = humanize(resource.id)
    // PostgREST names its definitions after the table: `articles`, not `Article`.
    resource.typeName =
      schemaType && !/^(Body|Input|Create|Update|Read)/.test(schemaType)
        ? schemaType.toLowerCase() === pascal(resource.id).toLowerCase()
          ? fromId
          : schemaType
        : fromId
    if (!/^[A-Za-z]/.test(resource.exportName)) {
      resource.exportName = `resource${pascal(resource.id)}`
      resource.fileName = `${resource.exportName}.ts`
    }

    const keys = Object.keys(resource.read.properties ?? {})
    const text = (key) => {
      const schema = resolveSchema(resource.document, resource.read.properties[key])
      return (
        schema.type === "string" &&
        !schema.enum &&
        (!schema.format || ["text", "character varying"].includes(schema.format))
      )
    }
    resource.titleField = SEARCH_KEYS.find((key) => keys.includes(key) && text(key))
  }
}

/**
 * The files to write, from a parsed schema.
 *
 * `only` restricts the resources (by id, type or export name); relations still
 * look at all of them, so a generated `books` keeps its link to `authors`.
 */
export function planGeneration(document, { only } = {}) {
  const { resources: all, skipped } = readResources(document)
  nameResources(all)

  let chosen = all
  if (only?.length) {
    const wanted = only.map((name) => name.toLowerCase())
    const matches = (resource) =>
      [resource.id, resource.exportName, resource.typeName, singular(resource.id)]
        .map((name) => name.toLowerCase())
        .some((name) => wanted.includes(name))
    chosen = all.filter(matches)
    const unknown = wanted.filter(
      (name) =>
        !chosen.some((resource) =>
          [
            resource.id,
            resource.exportName,
            resource.typeName,
            singular(resource.id),
          ]
            .map((candidate) => candidate.toLowerCase())
            .includes(name)
        )
    )
    if (unknown.length) {
      return {
        error: `No resource named ${unknown.join(", ")} in the schema. It declares: ${
          all.map((resource) => resource.id).join(", ") || "none"
        }.`,
      }
    }
  }

  const files = {}
  for (const resource of chosen) {
    files[resource.fileName] = renderResource(resource, { resources: all })
  }
  if (Object.values(files).some((content) => content.includes("./relationSearch"))) {
    files["relationSearch.ts"] = renderRelationSearch()
  }

  return { files, resources: chosen, skipped }
}

/* -------------------------------------------------------------------------- */
/* The scope                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The scope's source with the resources added to its `resources` array and
 * imported, or `undefined` when its shape is not one this can edit.
 */
export function registerInScope(source, entries) {
  const array = /(resources:\s*\[)([^\]]*)(\])/.exec(source)
  if (!array) return undefined

  const present = new Set(array[2].match(/[A-Za-z_$][\w$]*/g) ?? [])
  const missing = entries.filter((entry) => !present.has(entry.name))
  if (!missing.length) return source

  const current = array[2].trim().replace(/,$/, "")
  const names = [current, ...missing.map((entry) => entry.name)]
    .filter(Boolean)
    .join(", ")
  let next = source.replace(array[0], `${array[1]}${names}${array[3]}`)

  const lines = missing
    .filter(
      (entry) => !new RegExp(`import\\s*\\{[^}]*\\b${entry.name}\\b`).test(next)
    )
    .map((entry) => `import { ${entry.name} } from "${entry.from}"`)
  if (lines.length) {
    const imports = [
      ...next.matchAll(/^import[\s\S]*?from\s+["'][^"']+["']\s*;?$/gm),
    ]
    const last = imports[imports.length - 1]
    const at = last ? last.index + last[0].length : 0
    next = `${next.slice(0, at)}${at ? "\n" : ""}${lines.join("\n")}${at ? "" : "\n"}${next.slice(at)}`
  }

  return next
}

/* -------------------------------------------------------------------------- */
/* The command                                                                */
/* -------------------------------------------------------------------------- */

export const GENERATE_USAGE = `react-resource-view generate resources — declare the resources of your API

Reads the OpenAPI schema (OpenAPI 3.x or Swagger 2.0, as JSON) and writes one
file per resource: its path, the form inputs of its properties (enums as
selects, IRIs and foreign keys as relations), the permissions its operations
allow, a table, and a board when it has a status. Registers them in the scope.

Usage
  npx react-resource-view generate resources [options]

Options
  -s, --schema <file|url>  The OpenAPI schema. Default: src/api-schema/openapi.json,
                           where \`api-schema\` (api-dumper) writes it.
      --only <names>       Only these resources, comma-separated (books,authors).
  -d, --dir <path>         Where to write the files. Default: src/resources.
      --scope <file>       The scope to register them in. Default: src/scope.ts,
                           when it exists.
  -f, --force              Overwrite files that already exist.
      --dry-run            List the files instead of writing them.
  -h, --help               Show this.

Examples
  npx react-resource-view generate resources
  npx react-resource-view generate resources --schema src/api-schema/openapi.json --only books,authors
`

/** The `generate resources` command line, as an object — `{ error }` rather than a throw. */
export function parseGenerateArgs(argv) {
  const options = {
    schema: undefined,
    only: undefined,
    dir: undefined,
    scope: undefined,
    force: false,
    dryRun: false,
    help: false,
  }

  const rest = [...argv]
  if (rest[0] === "resources") rest.shift()
  else if (rest[0] && !rest[0].startsWith("-")) {
    return {
      ...options,
      error: `Unknown generator "${rest[0]}" — the one there is, is \`resources\`.`,
    }
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
      case "--dry-run":
        options.dryRun = true
        break
      case "-s":
      case "--schema":
      case "--only":
      case "-d":
      case "--dir":
      case "--scope": {
        const next = rest.shift()
        if (next === undefined || next.startsWith("-")) {
          return { ...options, error: `${arg} needs a value.` }
        }
        if (arg === "-s" || arg === "--schema") options.schema = next
        else if (arg === "--only") {
          options.only = next
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        } else if (arg === "-d" || arg === "--dir") options.dir = next
        else options.scope = next
        break
      }
      default:
        return {
          ...options,
          error: arg.startsWith("-")
            ? `Unknown option: ${arg}`
            : `Unexpected argument: ${arg}`,
        }
    }
  }

  return options
}

/** The schema, from a file or a URL. */
async function loadSchema(source, cwd) {
  let text
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`${source} answered ${response.status}.`)
    text = await response.text()
  } else {
    const path = isAbsolute(source) ? source : resolve(cwd, source)
    if (!existsSync(path)) throw new Error(`${source} does not exist.`)
    text = await readFile(path, "utf8")
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `${source} is not JSON. Export the schema as JSON (api-dumper writes openapi.json), YAML is not read.`
    )
  }
}

/** How a file is imported from the scope: `@/…` when the project uses it. */
function importPath(scopeFile, scopeSource, target, root) {
  const bare = target.replace(/\.ts$/, "")
  const fromSrc = relative(join(root, "src"), bare).split(sep).join("/")
  if (!fromSrc.startsWith("..") && /from\s+["']@\//.test(scopeSource)) {
    return `@/${fromSrc}`
  }
  const path = relative(dirname(scopeFile), bare).split(sep).join("/")
  return path.startsWith(".") ? path : `./${path}`
}

export async function runGenerate(argv, { cwd = process.cwd(), log = console.log }) {
  const options = parseGenerateArgs(argv)

  if (options.error) {
    console.error(`${options.error}\n\n${GENERATE_USAGE}`)
    return 1
  }
  if (options.help) {
    log(GENERATE_USAGE)
    return 0
  }

  const schemaSource = options.schema ?? "src/api-schema/openapi.json"
  let document
  try {
    document = await loadSchema(schemaSource, cwd)
  } catch (error) {
    console.error(
      `${error.message}${options.schema ? "" : " Pass the schema with --schema <file|url>."}`
    )
    return 1
  }

  const plan = planGeneration(document, { only: options.only })
  if (plan.error) {
    console.error(plan.error)
    return 1
  }
  if (!plan.resources.length) {
    console.error(
      `No resource found in ${schemaSource}: it declares no collection path with a record schema.`
    )
    return 1
  }

  const directory = isAbsolute(options.dir ?? "")
    ? options.dir
    : resolve(cwd, options.dir ?? "src/resources")
  const where = relative(cwd, directory) || "."
  const targets = Object.keys(plan.files).map((name) => join(directory, name))

  if (options.dryRun) {
    log(targets.map((path) => relative(cwd, path)).join("\n"))
    return 0
  }

  const existing = targets.filter((path) => existsSync(path))
  if (existing.length && !options.force) {
    console.error(
      `Nothing written: ${existing
        .map((path) => relative(cwd, path))
        .join(
          ", "
        )} already ${existing.length > 1 ? "exist" : "exists"}. Pass --force to overwrite, or --only to leave them out.`
    )
    return 1
  }

  await mkdir(directory, { recursive: true })
  for (const [name, content] of Object.entries(plan.files)) {
    await writeFile(join(directory, name), content, "utf8")
  }

  log(`Wrote ${plan.resources.length} resource${plan.resources.length > 1 ? "s" : ""} to ${where}:
${plan.resources.map((resource) => `  ${resource.fileName}  ${resource.path}`).join("\n")}`)
  for (const entry of plan.skipped) {
    log(`Skipped ${entry.path} — ${entry.reason}.`)
  }

  const scopeFile = isAbsolute(options.scope ?? "")
    ? options.scope
    : resolve(cwd, options.scope ?? "src/scope.ts")
  const scopeLabel = relative(cwd, scopeFile)
  const entries = plan.resources.map((resource) => ({
    name: resource.exportName,
    from: "",
    file: join(directory, resource.fileName),
  }))
  const snippet = `${entries.map((entry) => entry.name).join(", ")}`

  if (!existsSync(scopeFile)) {
    log(`
No ${scopeLabel} to register them in. Add them to your scope's resources:

  resources: [${snippet}],`)
    return 0
  }

  const source = await readFile(scopeFile, "utf8")
  const registered = registerInScope(
    source,
    entries.map((entry) => ({
      name: entry.name,
      from: importPath(scopeFile, source, entry.file, cwd),
    }))
  )

  if (registered === undefined) {
    log(`
${scopeLabel} has no \`resources: [...]\` this could edit. Add them yourself:

  resources: [${snippet}],`)
    return 0
  }

  if (registered !== source) await writeFile(scopeFile, registered, "utf8")
  log(`
Registered in ${scopeLabel}.
Documentation: https://hermez.dev/react-resource-view/docs/resource-view/generate-resources`)
  return 0
}

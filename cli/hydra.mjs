/**
 * react-resource-view — `generate --hydra`: the resources of an API Platform
 * API, read from its Hydra documentation (`/docs.jsonld`).
 *
 * The documentation lists the classes and their properties; the entrypoint
 * (`/`) says which of them are collections and where. This file turns both into
 * the resources `generate.mjs` already knows how to write — the same shape
 * `readResources` gives for an OpenAPI schema — so the files that come out are
 * the same kind of files. Like the rest of the command line it has no
 * dependency: the documents are read as JSON.
 */
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"

const toArray = (value) =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]

const lowerFirst = (value) => value[0].toLowerCase() + value.slice(1)

/** The name of a class as a property's range spells it: `#Book`, `Book`. */
const classNameOf = (range) => String(range).replace(/^.*#/, "")

/** `xsd:dateTime` and `http://www.w3.org/2001/XMLSchema#dateTime` alike. */
const xsdTypeOf = (range) =>
  /^xsd:(.+)$/.exec(range)?.[1] ?? /XMLSchema#(.+)$/.exec(range)?.[1]

const XSD_SCHEMAS = {
  string: { type: "string" },
  normalizedString: { type: "string" },
  token: { type: "string" },
  integer: { type: "integer" },
  int: { type: "integer" },
  long: { type: "integer" },
  short: { type: "integer" },
  nonNegativeInteger: { type: "integer" },
  positiveInteger: { type: "integer" },
  decimal: { type: "number" },
  double: { type: "number" },
  float: { type: "number" },
  boolean: { type: "boolean" },
  dateTime: { type: "string", format: "date-time" },
  date: { type: "string", format: "date" },
  time: { type: "string", format: "time" },
  anyURI: { type: "string", format: "uri" },
}

const pluralize = (word) =>
  /(s|x|z|ch|sh)$/.test(word)
    ? `${word}es`
    : /[^aeiou]y$/.test(word)
      ? `${word.slice(0, -1)}ies`
      : `${word}s`

/** The path of a collection, whether the entrypoint wrote it relative or absolute. */
function pathOf(value) {
  try {
    return new URL(value, "http://hydra.invalid").pathname.replace(/\/+$/, "")
  } catch {
    return String(value).replace(/\/+$/, "")
  }
}

/**
 * The JSON schema of one property.
 *
 * A range that is a collection of the API is a relation — an IRI, the same
 * thing an OpenAPI schema spells `format: "iri-reference"` — and is an array
 * unless the property is capped at one value (`owl:maxCardinality`). A range
 * that is a class without a collection is embedded, which the form leaves out;
 * one with no range at all, or one this does not know, is typed as text.
 */
function propertySchema(supported, isResource, isClass) {
  const property = supported.property ?? {}
  const range = toArray(property.range)[0]
  const named = range === undefined ? undefined : classNameOf(range)

  if (named !== undefined && isResource(named)) {
    const iri = { type: "string", format: "iri-reference", "x-resource": named }
    const single = Number(property["owl:maxCardinality"]) === 1
    return single ? iri : { type: "array", items: iri }
  }

  if (range !== undefined) {
    const xsd = xsdTypeOf(range)
    if (xsd && XSD_SCHEMAS[xsd]) return { ...XSD_SCHEMAS[xsd] }
    if (!xsd && named !== undefined && isClass(named)) return { type: "object" }
  }

  return { type: "string" }
}

/**
 * The resources of a Hydra documentation.
 *
 * `entries` maps the entrypoint's keys to the paths they point at
 * (`{ book: "/books" }`); a class is a resource when its lower-cased name is
 * one of them. Returns `{ resources, skipped }` like `readResources`.
 */
export function readHydraResources(docs, entries = {}) {
  const classes = toArray(docs?.supportedClass).filter(
    (candidate) => candidate && typeof candidate.title === "string"
  )
  const skipped = []

  const chosen = []
  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith("@") || typeof value !== "string") continue
    const hydraClass = classes.find(
      (candidate) => lowerFirst(candidate.title) === key
    )
    if (!hydraClass) {
      skipped.push({
        path: pathOf(value),
        reason: `no class "${key}" in the documentation`,
      })
      continue
    }
    chosen.push({ hydraClass, path: pathOf(value) })
  }

  const resourceNames = new Set(chosen.map(({ hydraClass }) => hydraClass.title))
  const classNames = new Set(classes.map((candidate) => candidate.title))
  const isResource = (name) => resourceNames.has(name)
  const isClass = (name) => classNames.has(name)

  // `/books` and `/admin/books` would both be "books": the shortest path keeps
  // the short id, the others are told apart by their whole path.
  const taken = new Set()
  const resources = []
  for (const { hydraClass, path } of [...chosen].sort(
    (a, b) => a.path.split("/").length - b.path.split("/").length
  )) {
    const segments = path.split("/").filter(Boolean)
    const last = segments[segments.length - 1]
    if (!last) {
      skipped.push({ path: path || "/", reason: "no collection name" })
      continue
    }
    const id = taken.has(last) ? segments.join("-") : last
    taken.add(id)

    const methods = new Set(
      toArray(hydraClass.supportedOperation).map((operation) =>
        String(operation.method ?? "").toUpperCase()
      )
    )
    const ops = {
      list: true,
      create: methods.has("POST"),
      read: methods.has("GET"),
      update: methods.has("PUT") || methods.has("PATCH"),
      delete: methods.has("DELETE"),
    }

    const properties = toArray(hydraClass.supportedProperty).filter(
      (supported) => supported?.property
    )
    const build = (keep) => {
      const kept = properties.filter(keep)
      const shape = { "@id": { type: "string" } }
      for (const supported of kept) {
        const name = supported.property.label ?? supported.title
        if (!name || name === "@id" || name in shape) continue
        const schema = propertySchema(supported, isResource, isClass)
        if (supported.description) schema.description = supported.description
        shape[name] = schema
      }
      return {
        type: "object",
        properties: shape,
        required: kept
          .filter((supported) => supported.required === true)
          .map((supported) => supported.property.label ?? supported.title),
      }
    }

    const read = build((supported) => supported.readable !== false)
    const write =
      ops.create || ops.update
        ? build((supported) => supported.writeable !== false)
        : undefined

    resources.push({
      id,
      path,
      ops,
      schemaName: hydraClass.title,
      read,
      write,
      filters: [],
      document: {},
      source: "Hydra documentation",
    })
  }

  return { resources, skipped }
}

/** The text of a file or a URL, asking an API for JSON-LD. */
async function fetchJson(source, cwd) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: { Accept: "application/ld+json, application/json" },
    })
    if (!response.ok) throw new Error(`${source} answered ${response.status}.`)
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`${source} did not answer JSON-LD.`)
    }
  }

  const path = isAbsolute(source) ? source : resolve(cwd, source)
  if (!existsSync(path)) throw new Error(`${source} does not exist.`)
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    throw new Error(`${source} is not JSON.`)
  }
}

const isDocumentation = (document) => Array.isArray(document?.supportedClass)

/**
 * The documentation at `source` — the `/docs.jsonld` URL, the root of the API
 * (the documentation is then looked for at `/docs.jsonld`) or a file — and the
 * collections its entrypoint lists.
 *
 * `warnings` says what could not be read and what was guessed instead.
 */
export async function loadHydra(source, cwd) {
  const warnings = []
  let docs
  let docsUrl

  try {
    docs = await fetchJson(source, cwd)
    docsUrl = source
  } catch (error) {
    if (!/^https?:\/\//i.test(source)) throw error
    // The root of an API, or a path that is not the documentation.
    const guess = new URL(
      "docs.jsonld",
      source.endsWith("/") ? source : `${source}/`
    ).href
    try {
      docs = await fetchJson(guess, cwd)
      docsUrl = guess
    } catch {
      throw error
    }
  }

  if (!isDocumentation(docs) && /^https?:\/\//i.test(source)) {
    const guess = new URL(
      "docs.jsonld",
      source.endsWith("/") ? source : `${source}/`
    ).href
    docs = await fetchJson(guess, cwd)
    docsUrl = guess
  }

  if (!isDocumentation(docs)) {
    throw new Error(
      `${source} is not a Hydra documentation: it has no supportedClass. API Platform serves it at /docs.jsonld.`
    )
  }

  const entries = {}
  const remote = docsUrl && /^https?:\/\//i.test(docsUrl)
  if (remote) {
    try {
      const entrypoint = await fetchJson(
        new URL(docs.entrypoint ?? "/", docsUrl).href,
        cwd
      )
      for (const [key, value] of Object.entries(entrypoint)) {
        if (!key.startsWith("@") && typeof value === "string") entries[key] = value
      }
    } catch (error) {
      warnings.push(`The entrypoint could not be read (${error.message})`)
    }
  }

  if (!Object.keys(entries).length) {
    // No entrypoint: API Platform's own rule, the plural of the class name
    // under the entrypoint's path.
    const base = pathOf(docs.entrypoint ?? "/")
    for (const candidate of toArray(docs.supportedClass)) {
      const operations = toArray(candidate?.supportedOperation)
      if (!candidate?.title || !operations.length) continue
      if (
        ["Error", "ConstraintViolation", "ConstraintViolationList"].includes(
          candidate.title
        )
      ) {
        continue
      }
      entries[lowerFirst(candidate.title)] =
        `${base}/${pluralize(lowerFirst(candidate.title))}`
    }
    warnings.push("The collection paths are guessed from the class names.")
  }

  return { docs, entries, warnings }
}

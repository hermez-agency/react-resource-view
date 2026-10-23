import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import ts from "typescript"
import { run } from "./index.mjs"
import {
  parseGenerateArgs,
  planGeneration,
  readResources,
  registerInScope,
  resolveSchema,
  runGenerate,
} from "./generate.mjs"

/**
 * Three real shapes of API: API Platform (OpenAPI 3.1, JSON-LD, IRIs), FastAPI
 * (3.1, `anyOf` for nullable, enums by reference, foreign keys by name) and
 * Supabase (Swagger 2.0, one collection route, no item route). What is
 * generated from each is kept under `__fixtures__/generate/<name>/expected/`,
 * type-checked below against the library's own types.
 * `UPDATE_FIXTURES=1` writes `expected/` again.
 */
const FIXTURES = resolve(__dirname, "__fixtures__/generate")
const NAMES = ["api-platform", "fastapi", "supabase"]

const schemaOf = async (name: string) =>
  JSON.parse(await readFile(join(FIXTURES, name, "openapi.json"), "utf8"))

let workspace: string
const silent = () => {}

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "rrv-generate-"))
})

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true })
})

describe.each(NAMES)("generating from %s", (name) => {
  it("writes what the fixtures keep", async () => {
    const { files } = planGeneration(await schemaOf(name))
    const expected = join(FIXTURES, name, "expected")

    if (process.env.UPDATE_FIXTURES) {
      await rm(expected, { recursive: true, force: true })
      await mkdir(expected, { recursive: true })
      for (const [file, content] of Object.entries(files)) {
        await writeFile(join(expected, file), content as string, "utf8")
      }
    }

    expect((await readdir(expected)).sort()).toEqual(Object.keys(files).sort())
    for (const [file, content] of Object.entries(files)) {
      expect(content).toBe(await readFile(join(expected, file), "utf8"))
    }
  })
})

describe("what is generated compiles", () => {
  it("type-checks against the library on the three fixtures", () => {
    const root = resolve(__dirname, "..")
    const rootNames = NAMES.flatMap((name) =>
      [
        "books",
        "authors",
        "reviews",
        "items",
        "owners",
        "articles",
        "categories",
        "auditLog",
        "relationSearch",
      ]
        .map((file) => join(FIXTURES, name, "expected", `${file}.ts`))
        .filter((file) => existsSync(file))
    )

    const { config } = ts.readConfigFile(
      join(root, "tsconfig.json"),
      ts.sys.readFile
    )
    const options = ts.parseJsonConfigFileContent(
      {
        ...config,
        compilerOptions: {
          ...config.compilerOptions,
          baseUrl: root,
          paths: {
            "react-resource-view": ["src/index.ts"],
            "@/*": ["src/*"],
          },
        },
      },
      ts.sys,
      root
    ).options

    const program = ts.createProgram({ rootNames, options })
    const diagnostics = rootNames.flatMap((file) => [
      ...program.getSyntacticDiagnostics(program.getSourceFile(file)),
      ...program.getSemanticDiagnostics(program.getSourceFile(file)),
    ])

    expect(
      diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
    ).toEqual([])
    expect(rootNames.length).toBeGreaterThanOrEqual(9)
  }, 120_000)
})

describe("reading the schema", () => {
  it("reads API Platform: IRIs are relations, enums selects, a status a board", async () => {
    const { files } = planGeneration(await schemaOf("api-platform"))
    const books = files["books.ts"]

    expect(books).toContain('path: "/api/books"')
    expect(books).toContain("controller: SelectInputController")
    expect(books).toContain("controller: MultiSelectInputController")
    expect(books).toContain('relationSearch("/api/authors"')
    expect(books).toContain('layout.board({ groupBy: "status" })')
    // readOnly and JSON-LD keys are not inputs.
    expect(books).not.toMatch(/createdAt: \{/)
    expect(books).not.toMatch(/"@context"/)
    // authors have no status.
    expect(files["authors.ts"]).not.toContain("layout.board")
  })

  it("derives permissions from the operations exposed", async () => {
    const { files } = planGeneration(await schemaOf("api-platform"))

    // No POST, PUT or DELETE: read-only.
    expect(files["reviews.ts"]).toContain('permissions: "readonly"')
    // Everything exposed: nothing declared.
    expect(files["books.ts"]).not.toContain("permissions")

    const noCreate = await schemaOf("api-platform")
    delete noCreate.paths["/api/authors"].post
    const authors = planGeneration(noCreate).files["authors.ts"]
    expect(authors).toContain("permissions: { create: false }")

    const noDelete = await schemaOf("fastapi")
    delete noDelete.paths["/items/{item_id}"].delete
    delete noDelete.paths["/items/{item_id}"].put
    expect(planGeneration(noDelete).files["items.ts"]).toContain(
      "permissions: { update: false, delete: false }"
    )
  })

  it("reads FastAPI: nullable anyOf, enum by reference, foreign keys by name", async () => {
    const { files, resources } = planGeneration(await schemaOf("fastapi"))
    const items = files["items.ts"]

    expect(resources.map((resource: { id: string }) => resource.id)).toEqual([
      "items",
      "owners",
    ])
    expect(items).toContain('path: "/items"')
    expect(items).toContain("description?: string | null")
    expect(items).toContain('{ value: "doing", label: "Doing" }')
    expect(items).toContain('relationSearch("/owners"')
    expect(items).toContain("controller: DatePickerInputController")
    // The login form is an action, not a resource.
    expect(files["token.ts"]).toBeUndefined()
  })

  it("reads Supabase: Swagger 2.0, operations on the collection, foreign keys", async () => {
    const { files, resources } = planGeneration(await schemaOf("supabase"))

    expect(resources.map((resource: { id: string }) => resource.id)).toEqual([
      "articles",
      "categories",
      "audit_log",
    ])
    expect(files["articles.ts"]).toContain('relationSearch("/categories"')
    expect(files["articles.ts"]).toContain("export interface Article ")
    // PostgREST patches and deletes on the collection route.
    expect(files["articles.ts"]).not.toContain("permissions")
    expect(files["auditLog.ts"]).toContain('permissions: "readonly"')
  })

  it("keeps only the resources asked for, and says when one is unknown", async () => {
    const document = await schemaOf("api-platform")

    const plan = planGeneration(document, { only: ["Books"] })
    expect(Object.keys(plan.files).sort()).toEqual(["books.ts", "relationSearch.ts"])
    // A relation still finds its target among the resources left out.
    expect(plan.files["books.ts"]).toContain('relationSearch("/api/authors"')

    const unknown = planGeneration(document, { only: ["books", "shelves"] })
    expect(unknown.error).toContain("shelves")
    expect(unknown.error).toContain("books, authors, reviews")
  })

  it("follows references, merges allOf and reads both nullable spellings", () => {
    const document = {
      components: {
        schemas: {
          Base: { type: "object", properties: { a: { type: "string" } } },
          Child: {
            allOf: [
              { $ref: "#/components/schemas/Base" },
              {
                type: "object",
                required: ["b"],
                properties: { b: { type: "integer" } },
              },
            ],
          },
        },
      },
    }
    const child = resolveSchema(document, { $ref: "#/components/schemas/Child" })
    expect(Object.keys(child.properties)).toEqual(["a", "b"])
    expect(child.required).toEqual(["b"])
    expect(resolveSchema(document, { type: ["string", "null"] })).toMatchObject({
      type: "string",
      nullable: true,
    })
    expect(
      resolveSchema(document, { anyOf: [{ type: "integer" }, { type: "null" }] })
    ).toMatchObject({ type: "integer", nullable: true })
  })

  it("skips a path with no record schema instead of failing", () => {
    const { resources, skipped } = readResources({
      paths: { "/ping": { get: { responses: { "200": { description: "pong" } } } } },
    })
    expect(resources).toEqual([])
    expect(skipped).toEqual([{ path: "/ping", reason: "no record schema" }])
  })
})

describe("the command line", () => {
  it("reads the options", () => {
    expect(
      parseGenerateArgs([
        "resources",
        "--schema",
        "a.json",
        "--only",
        "books, authors",
        "-d",
        "src/r",
        "--scope",
        "src/s.ts",
        "--force",
        "--dry-run",
      ])
    ).toMatchObject({
      schema: "a.json",
      only: ["books", "authors"],
      dir: "src/r",
      scope: "src/s.ts",
      force: true,
      dryRun: true,
    })
    expect(parseGenerateArgs(["resources", "--only"]).error).toContain(
      "needs a value"
    )
    expect(parseGenerateArgs(["resources", "--nope"]).error).toContain(
      "Unknown option"
    )
    expect(parseGenerateArgs(["tables"]).error).toContain("resources")
  })

  it("is reachable from the command", async () => {
    const lines: string[] = []
    expect(
      await run(["help", "generate"], { log: (line: string) => lines.push(line) })
    ).toBe(0)
    expect(lines.join("\n")).toContain("generate resources")
  })
})

describe("writing the files", () => {
  const project = async () => {
    const cwd = await mkdtemp(join(workspace, "project-"))
    await mkdir(join(cwd, "src/api-schema"), { recursive: true })
    await writeFile(
      join(cwd, "src/api-schema/openapi.json"),
      await readFile(join(FIXTURES, "api-platform/openapi.json"), "utf8")
    )
    return cwd
  }

  it("writes one file per resource, reading the schema where api-schema puts it", async () => {
    const cwd = await project()

    expect(await runGenerate(["resources"], { cwd, log: silent })).toBe(0)
    expect((await readdir(join(cwd, "src/resources"))).sort()).toEqual([
      "authors.ts",
      "books.ts",
      "relationSearch.ts",
      "reviews.ts",
    ])
  })

  it("never overwrites a file without --force, and writes nothing then", async () => {
    const cwd = await project()
    await mkdir(join(cwd, "src/resources"), { recursive: true })
    await writeFile(join(cwd, "src/resources/books.ts"), "// mine\n")

    expect(await runGenerate(["resources"], { cwd, log: silent })).toBe(1)
    expect(await readFile(join(cwd, "src/resources/books.ts"), "utf8")).toBe(
      "// mine\n"
    )
    expect(existsSync(join(cwd, "src/resources/authors.ts"))).toBe(false)

    // --only leaves the existing one out…
    expect(
      await runGenerate(["resources", "--only", "authors"], { cwd, log: silent })
    ).toBe(0)
    expect(await readFile(join(cwd, "src/resources/books.ts"), "utf8")).toBe(
      "// mine\n"
    )

    // …and --force takes it.
    expect(await runGenerate(["resources", "--force"], { cwd, log: silent })).toBe(0)
    expect(await readFile(join(cwd, "src/resources/books.ts"), "utf8")).toContain(
      "createViewResource<Book>"
    )
  })

  it("lists the files with --dry-run and writes none", async () => {
    const cwd = await project()
    const lines: string[] = []

    expect(
      await runGenerate(["resources", "--dry-run"], {
        cwd,
        log: (line: string) => lines.push(line),
      })
    ).toBe(0)
    expect(lines.join("\n")).toContain("src/resources/books.ts")
    expect(existsSync(join(cwd, "src/resources"))).toBe(false)
  })

  it("registers the resources in the scope, once", async () => {
    const cwd = await project()
    await writeFile(
      join(cwd, "src/scope.ts"),
      `import { AdminLayout, type ScopeInterface } from "react-resource-view"
import { pages } from "@/resources/pages"

export const adminScope: ScopeInterface = {
  name: "admin",
  resources: [pages],
  menu: "auto",
}
`
    )

    await runGenerate(["resources"], { cwd, log: silent })
    await runGenerate(["resources", "--force"], { cwd, log: silent })
    const scope = await readFile(join(cwd, "src/scope.ts"), "utf8")

    expect(scope).toContain("resources: [pages, books, authors, reviews],")
    expect(scope.match(/import \{ books \}/g)).toHaveLength(1)
    expect(scope).toContain('import { books } from "@/resources/books"')
  })

  it("explains when the schema is missing, or is not JSON", async () => {
    const cwd = await mkdtemp(join(workspace, "empty-"))
    expect(await runGenerate(["resources"], { cwd, log: silent })).toBe(1)

    await writeFile(join(cwd, "api.yaml"), "openapi: 3.1.0")
    expect(
      await runGenerate(["resources", "--schema", "api.yaml"], { cwd, log: silent })
    ).toBe(1)
  })
})

describe("registerInScope", () => {
  it("leaves a scope it cannot read alone", () => {
    expect(registerInScope("export const scope = {}", [])).toBeUndefined()
  })

  it("adds to an empty list and imports relatively without an alias", () => {
    const next = registerInScope(
      `import x from "y"\nconst s = { resources: [] }\n`,
      [{ name: "books", from: "./resources/books" }]
    )
    expect(next).toContain("resources: [books]")
    expect(next).toContain('import { books } from "./resources/books"')
  })
})

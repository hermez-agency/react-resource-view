import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import semver from "semver"
import * as library from "@/index"
import {
  BACKEND_IDS,
  BACKENDS,
  defaultSchemaUrl,
  detectPackageManager,
  parseInitArgs,
  renderStarter,
  resolveBackend,
  runInit,
  toPackageName,
} from "./init.mjs"

/**
 * The starter is files, so what matters is that they say the right thing: the
 * dialect of the backend picked, the URL typed, the dump command that reads the
 * schema. Whether they compile and run is checked by building one per backend
 * against the packed library, which is too slow for a unit test.
 */

let workspace: string

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "rrv-init-"))
})

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true })
})

const silent = () => {}

describe("choosing a backend", () => {
  it("knows it by id, by number in the menu and by the names people type", () => {
    expect(resolveBackend("spring-boot")).toBe("spring-boot")
    expect(resolveBackend("Spring")).toBe("spring-boot")
    expect(resolveBackend("jsonld")).toBe("api-platform")
    expect(resolveBackend("1")).toBe(BACKEND_IDS[0])
    expect(resolveBackend(String(BACKEND_IDS.length + 1))).toBeUndefined()
    expect(resolveBackend("drf")).toBe("django")
    expect(resolveBackend("laravel")).toBeUndefined()
  })

  it("guesses where each backend publishes its OpenAPI schema", () => {
    expect(defaultSchemaUrl("api-platform", "https://localhost/")).toBe(
      "https://localhost/api/docs.jsonopenapi"
    )
    expect(defaultSchemaUrl("spring-boot", "http://localhost:8080")).toBe(
      "http://localhost:8080/v3/api-docs"
    )
    expect(defaultSchemaUrl("fastapi", "http://localhost:8000")).toBe(
      "http://localhost:8000/openapi.json"
    )
    expect(defaultSchemaUrl("django", "http://localhost:8000/")).toBe(
      "http://localhost:8000/api/schema/?format=json"
    )
    // Swagger 2.0: api-dumper cannot read it.
    expect(defaultSchemaUrl("supabase", "https://x.supabase.co")).toBeUndefined()
  })

  it("only imports dialects the package exports", () => {
    for (const id of BACKEND_IDS) {
      expect(typeof (library as Record<string, unknown>)[BACKENDS[id].dialect]).toBe(
        "function"
      )
    }
  })
})

describe("reading the command line", () => {
  it("reads the directory and every option", () => {
    const options = parseInitArgs([
      "my-admin",
      "-b",
      "spring",
      "-u",
      "http://localhost:8080",
      "--schema-url",
      "http://localhost:8080/v3/api-docs.yaml",
      "--pm",
      "pnpm",
      "-y",
    ])

    expect(options).toMatchObject({
      directory: "my-admin",
      backend: "spring-boot",
      apiUrl: "http://localhost:8080",
      schemaUrl: "http://localhost:8080/v3/api-docs.yaml",
      pm: "pnpm",
      yes: true,
    })
    expect(options).not.toHaveProperty("error")
  })

  it("says what is wrong rather than guessing", () => {
    expect(parseInitArgs(["-b", "laravel"]).error).toMatch(/not a backend/)
    expect(parseInitArgs(["-u", "localhost"]).error).toMatch(/not an http/)
    expect(parseInitArgs(["-b"]).error).toMatch(/needs a value/)
    expect(parseInitArgs(["--pm", "pip"]).error).toMatch(/--pm/)
    expect(parseInitArgs(["a", "b"]).error).toMatch(/Unexpected/)
  })

  it("accepts a schema read from a file", () => {
    expect(parseInitArgs(["-s", "openapi.yaml"]).error).toBeUndefined()
  })

  it("speaks the package manager that ran it", () => {
    expect(detectPackageManager("pnpm/10.33.2 npm/? node/v22")).toBe("pnpm")
    expect(detectPackageManager("yarn/4.0.0")).toBe("yarn")
    expect(detectPackageManager("")).toBe("npm")
  })

  it("names the package after the directory, the way npm accepts it", () => {
    expect(toPackageName("My Admin")).toBe("my-admin")
    expect(toPackageName("--")).toBe("my-admin")
  })
})

describe("the starter", () => {
  it("writes versions its peer dependencies accept, so npm install passes", async () => {
    const pkg = JSON.parse(
      await readFile(join(__dirname, "..", "package.json"), "utf8")
    )
    const files = renderStarter({
      name: "shop-admin",
      backend: "api-platform",
      apiUrl: "http://localhost:8000",
      pm: "npm",
    })
    const manifest = JSON.parse(files["package.json"])
    const written = { ...manifest.dependencies, ...manifest.devDependencies }

    for (const [name, range] of Object.entries<string>(pkg.peerDependencies)) {
      if (!(name in written)) continue
      const version = semver.minVersion(written[name])!
      expect(
        semver.satisfies(version, range),
        `${name}: ${written[name]} vs peer ${range}`
      ).toBe(true)
    }
    expect(written["react-data-form"]).toBe(pkg.peerDependencies["react-data-form"])
  })

  it("installs the current releases of its peers, not the first 0.x", async () => {
    const pkg = JSON.parse(
      await readFile(join(__dirname, "..", "package.json"), "utf8")
    )
    // In 0.x a caret pins the minor: `^0.1.0` resolved react-data-form 0.1.0
    // while 0.3.0 was out. react-mini-i18n keeps 0.1 too, the range
    // react-data-form 0.3.0 itself asks for, or npm stops on ERESOLVE.
    const current = {
      "react-data-form": "0.3.0",
      "react-mini-i18n": "0.2.0",
      "resource-registry": "0.1.0",
    }

    for (const [name, version] of Object.entries(current)) {
      const range = pkg.peerDependencies[name]
      expect(
        semver.satisfies(version, range),
        `${name}@${version} vs ${range}`
      ).toBe(true)
    }
    expect(semver.minVersion(pkg.peerDependencies["react-data-form"])!.version).toBe(
      current["react-data-form"]
    )
  })

  it("talks to Spring Boot with its dialect, and dumps /v3/api-docs", () => {
    const files = renderStarter({
      name: "shop-admin",
      backend: "spring-boot",
      apiUrl: "http://localhost:8080",
      pm: "pnpm",
    })
    const manifest = JSON.parse(files["package.json"])

    expect(files["src/setup.ts"]).toContain("dialect: springDialect()")
    expect(files[".env"]).toContain("VITE_API_URL=http://localhost:8080")
    expect(files["api-dumper.config.ts"]).toContain(
      'source: "http://localhost:8080/v3/api-docs"'
    )
    expect(manifest.name).toBe("shop-admin")
    expect(manifest.scripts["api-schema"]).toBe("api-dumper")
    expect(manifest.scripts["api-schema:check"]).toBe("api-dumper --check")
    expect(manifest.devDependencies).toHaveProperty("api-dumper")
    expect(files.Makefile).toContain("\tpnpm run api-schema\n")
    expect(files["README.md"]).toContain("http://localhost:8080/v3/api-docs")
  })

  it("talks to Django REST Framework with its dialect, and dumps drf-spectacular's schema", () => {
    const files = renderStarter({
      name: "blog-admin",
      backend: "django",
      apiUrl: "http://localhost:8000",
    })

    expect(files["src/setup.ts"]).toContain("dialect: djangoDialect()")
    expect(files["api-dumper.config.ts"]).toContain(
      'source: "http://localhost:8000/api/schema/?format=json"'
    )
    expect(files["src/resources/articles.ts"]).toContain('path: "/api/articles"')
    expect(JSON.parse(files["package.json"]).scripts["api-schema:check"]).toBe(
      "api-dumper --check"
    )
  })

  it("talks to json-server with its dialect, and offers no schema step since it publishes none", () => {
    const files = renderStarter({ name: "mock-admin", backend: "json-server" })
    const manifest = JSON.parse(files["package.json"])

    expect(resolveBackend("jsonserver")).toBe("json-server")
    expect(files["src/setup.ts"]).toContain("dialect: jsonServerDialect()")
    expect(files["src/resources/posts.ts"]).toContain('path: "/posts"')
    expect(files).not.toHaveProperty("api-dumper.config.ts")
    expect(manifest.scripts).not.toHaveProperty("api-schema")
    expect(manifest.devDependencies).not.toHaveProperty("api-dumper")
    expect(files["Makefile"]).not.toContain("api-schema")
  })

  it("configures the JSON-LD client on API Platform, and strips the CSV", () => {
    const files = renderStarter({ name: "back-office", backend: "api-platform" })

    expect(files["src/setup.ts"]).toContain("configureClient({")
    expect(JSON.parse(files["package.json"]).dependencies).toHaveProperty(
      "jsonld-api-client"
    )
    expect(files["api-dumper.config.ts"]).toContain('preset: "api-platform"')
    expect(files["api-dumper.config.ts"]).toContain('contentTypes: ["text/csv"]')
    expect(files["src/resources/books.ts"]).toContain('path: "/api/books"')
  })

  it("generates Supabase's types with its own CLI, since api-dumper reads no Swagger 2.0", () => {
    const files = renderStarter({ name: "crm", backend: "supabase" })
    const manifest = JSON.parse(files["package.json"])

    expect(files).not.toHaveProperty("api-dumper.config.ts")
    expect(manifest.devDependencies).not.toHaveProperty("api-dumper")
    expect(manifest.scripts["api-schema"]).toContain("supabase gen types typescript")
    expect(files[".env"]).toContain("VITE_SUPABASE_ANON_KEY=")
    expect(files["src/vite-env.d.ts"]).toContain("VITE_SUPABASE_ANON_KEY")
    expect(files["src/setup.ts"]).toContain("supabaseDialect({ apiKey:")
  })

  it("keeps the same files, whatever the backend, around one resource", () => {
    for (const backend of BACKEND_IDS) {
      const files = renderStarter({ name: "x", backend })
      const { sample } = BACKENDS[backend]

      expect(files).toHaveProperty(`src/resources/${sample.id}.ts`)
      expect(files["src/scope.ts"]).toContain(`resources: [${sample.id}]`)
      expect(files["src/main.tsx"]).toContain('import "@/setup"')
    }
  })
})

describe("running init", () => {
  it("writes the project, and tells the reader what to run next", async () => {
    const logged: string[] = []
    const code = await runInit(
      [
        "spring-admin",
        "-b",
        "spring-boot",
        "-u",
        "http://localhost:8080",
        "--pm",
        "npm",
        "-y",
      ],
      { cwd: workspace, log: (line: string) => logged.push(line) }
    )

    expect(code).toBe(0)
    const setup = await readFile(
      join(workspace, "spring-admin/src/setup.ts"),
      "utf8"
    )
    expect(setup).toContain("springDialect()")
    expect(logged.join("\n")).toContain("npm run api-schema")
  })

  it("asks for what the command line left out", async () => {
    const answers = ["asked-admin", "2", "http://localhost:9000", ""]
    const questions: string[] = []
    const code = await runInit([], {
      cwd: workspace,
      log: silent,
      ask: async (question: string, fallback: string) => {
        questions.push(question)
        return answers.shift() || fallback
      },
    })

    expect(code).toBe(0)
    expect(questions).toHaveLength(4)
    const config = await readFile(
      join(workspace, "asked-admin/api-dumper.config.ts"),
      "utf8"
    )
    // The second choice is Spring Boot, and an empty answer takes the guess.
    expect(config).toContain('source: "http://localhost:9000/v3/api-docs"')
  })

  it("refuses to write over a directory that has something in it", async () => {
    await writeFile(join(workspace, "spring-admin/notes.txt"), "mine", "utf8")
    const code = await runInit(["spring-admin", "-y"], {
      cwd: workspace,
      log: silent,
    })

    expect(code).toBe(1)
  })

  it("lists the files rather than writing them on --dry-run", async () => {
    const logged: string[] = []
    const code = await runInit(["dry", "-b", "fastapi", "-y", "--dry-run"], {
      cwd: workspace,
      log: (line: string) => logged.push(line),
    })

    expect(code).toBe(0)
    expect(logged.join("\n")).toContain(join("dry", "api-dumper.config.ts"))
    await expect(readFile(join(workspace, "dry/package.json"))).rejects.toThrow()
  })
})

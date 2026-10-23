import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { createViewResource } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import {
  parseCliArgs,
  renderViewVariant,
  resolveTarget,
  run,
  toCamelCase,
  toPascalCase,
  toSlug,
  USAGE,
} from "./index.mjs"

/**
 * The scaffolded file is the whole product of the command, so the test that
 * matters is not that it was written — it is that what was written runs. The
 * last block below generates a variant, imports it, and renders a resource
 * declared with it.
 */

/**
 * Inside the repository, so Vite resolves the package the way the site does.
 * The tests run from the repository root — `import.meta.url` is not a file URL
 * under jsdom, so the path is built from there rather than from this module.
 */
const HERE = join(process.cwd(), "cli")

let workspace: string

beforeAll(async () => {
  workspace = await mkdtemp(join(HERE, ".generated-"))
})

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true })
  localStorage.clear()
})

describe("naming a variant", () => {
  it("reads a name however it was typed", () => {
    for (const written of ["Kanban board", "kanban-board", "kanbanBoard"]) {
      expect(toPascalCase(written)).toBe("KanbanBoard")
      expect(toCamelCase(written)).toBe("kanbanBoard")
      expect(toSlug(written)).toBe("kanban-board")
    }
  })

  it("names the file after the layout it exports", () => {
    const target = resolveTarget({ name: "Heatmap", dir: "src/views", cwd: "/app" })

    expect(target.path).toBe("/app/src/views/heatmapLayout.tsx")
    expect(target.relativePath).toBe("src/views/heatmapLayout.tsx")
  })

  it("writes JavaScript when asked to", () => {
    const target = resolveTarget({
      name: "Heatmap",
      dir: "src/views",
      jsx: true,
      cwd: "/app",
    })

    expect(target.fileName).toBe("heatmapLayout.jsx")
  })
})

describe("the command line", () => {
  it("takes the name, the directory and the icon", () => {
    const options = parseCliArgs([
      "create-view-variant",
      "Heatmap",
      "--dir",
      "src/views",
      "-i",
      "Flame",
    ])

    expect(options).toMatchObject({
      command: "create-view-variant",
      name: "Heatmap",
      dir: "src/views",
      icon: "Flame",
    })
    expect(options.error).toBeUndefined()
  })

  it("refuses an icon that is not one", () => {
    expect(
      parseCliArgs(["create-view-variant", "Heatmap", "-i", "flame"]).error
    ).toContain("lucide-react")
  })

  it("refuses an option it does not know", () => {
    expect(parseCliArgs(["create-view-variant", "--wat"]).error).toContain("--wat")
  })

  it("refuses a name with nothing in it", () => {
    expect(parseCliArgs(["create-view-variant", "***"]).error).toContain(
      "cannot name"
    )
  })
})

describe("the generated file", () => {
  it("exports a layout, its components and its options", () => {
    const file = renderViewVariant({ name: "Kanban board", icon: "Columns3" })

    expect(file).toContain(`import { Columns3 } from "lucide-react"`)
    expect(file).toContain("export interface KanbanBoardOptions")
    expect(file).toContain("export function KanbanBoardList")
    expect(file).toContain("export function KanbanBoardRow")
    expect(file).toContain("export function KanbanBoardItem")
    expect(file).toContain("export default function kanbanBoardLayout")
    expect(file).toContain("layout.custom(")
    expect(file).toContain(`label: "Kanban board"`)
    // The id the reader will find in the URL.
    expect(file).toContain(`type: "kanban-board"`)
  })

  it("drops the types when the target is JavaScript", () => {
    const file = renderViewVariant({ name: "Heatmap", jsx: true })

    expect(file).not.toContain("interface")
    expect(file).not.toContain(": ListComponentPropsInterface")
    expect(file).toContain("export default function heatmapLayout")
  })
})

describe("running the command", () => {
  it("writes the file, and says how to declare it", async () => {
    const lines: string[] = []
    const code = await run(
      ["create-view-variant", "Heatmap", "--dir", ".", "--yes"],
      {
        cwd: workspace,
        log: (line: string) => lines.push(line),
      }
    )

    expect(code).toBe(0)
    const written = await readFile(join(workspace, "heatmapLayout.tsx"), "utf8")
    expect(written).toContain("export default function heatmapLayout")
    expect(lines.join("\n")).toContain("layouts: [")
  })

  it("does not overwrite a file it did not write, unless forced", async () => {
    const path = join(workspace, "existingLayout.tsx")
    await writeFile(path, "// mine\n", "utf8")

    const refused = await run(
      ["create-view-variant", "Existing", "--dir", ".", "--yes"],
      { cwd: workspace, log: () => {} }
    )
    expect(refused).toBe(1)
    expect(await readFile(path, "utf8")).toBe("// mine\n")

    const forced = await run(
      ["create-view-variant", "Existing", "--dir", ".", "--yes", "--force"],
      { cwd: workspace, log: () => {} }
    )
    expect(forced).toBe(0)
    expect(await readFile(path, "utf8")).toContain("existingLayout")
  })

  it("prints the file rather than writing it on a dry run", async () => {
    const lines: string[] = []
    const code = await run(
      ["create-view-variant", "Dry", "--dir", ".", "--yes", "--dry-run"],
      { cwd: workspace, log: (line: string) => lines.push(line) }
    )

    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("export default function dryLayout")
    await expect(
      readFile(join(workspace, "dryLayout.tsx"), "utf8")
    ).rejects.toThrow()
  })
})

describe("what the command produced", () => {
  interface Article {
    "@id": string
    "@type": string
    id: string
    title: string
  }

  const ARTICLES: Article[] = [
    {
      "@id": "/api/articles/1",
      "@type": "Article",
      id: "1",
      title: "First article",
    },
  ]

  it("renders a resource declared with it", async () => {
    const path = join(workspace, "spotlightLayout.tsx")
    await writeFile(path, renderViewVariant({ name: "Spotlight" }), "utf8")

    const spotlightLayout = (await import(/* @vite-ignore */ path)).default

    const resource = createViewResource<Article>("cli_articles", {
      name: "Articles",
      repository: {
        getCollection: async () => ({
          data: {
            "@id": "cli_articles",
            "@type": "Collection",
            member: ARTICLES,
            totalItems: ARTICLES.length,
          },
        }),
      },
      storage: "local",
      views: { list: { layouts: [spotlightLayout()] } },
    })

    render(
      <ResourceViewProvider
        viewResourceContextParams={{ scope: "cli", resourceId: "cli_articles" }}
        configuration={{ resources: [resource], defaultScope: "cli" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("First article")).toBeInTheDocument()
    })
    // The keys the API adds are not fields anyone asked to see.
    expect(screen.queryByText("@type")).toBeNull()
  })
})

describe("a word that is not a command", () => {
  it("is refused with the command it was probably meant to be", async () => {
    const errors: string[] = []
    const error = console.error
    console.error = (line: string) => errors.push(line)
    try {
      const code = await run(["migrat", "--yes"], { cwd: workspace, log: () => {} })

      expect(code).toBe(1)
      expect(errors.join("\n")).toContain(
        `Unknown command "migrat" — did you mean migrate?`
      )
    } finally {
      console.error = error
    }
    await expect(
      readFile(join(workspace, "migratLayout.tsx"), "utf8")
    ).rejects.toThrow()
  })

  it("is refused without a suggestion when nothing is close", () => {
    const { error } = parseCliArgs(["wombat"])

    expect(error).toContain(`Unknown command "wombat"`)
    expect(error).not.toContain("did you mean")
  })

  it("still reads a capitalised name as the layout's", () => {
    expect(parseCliArgs(["Heatmap"])).toMatchObject({
      command: "create-view-variant",
      name: "Heatmap",
    })
  })
})

describe("help and --version", () => {
  it("prints the usage on help, and succeeds", async () => {
    const lines: string[] = []
    const code = await run(["help"], {
      cwd: workspace,
      log: (line: string) => lines.push(line),
    })

    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("Commands")
    await expect(
      readFile(join(workspace, "helpLayout.tsx"), "utf8")
    ).rejects.toThrow()
  })

  it("prints a command's own usage on help <command>", async () => {
    const lines: string[] = []
    const code = await run(["help", "migrate"], {
      cwd: workspace,
      log: (line: string) => lines.push(line),
    })

    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("react-resource-view migrate —")
  })

  // Run as the real command: the version is read from the package.json next
  // to the file, which only a file URL — not jsdom's — can point at.
  it("prints the package's version", async () => {
    const { version } = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8")
    )

    for (const flag of ["--version", "-v"]) {
      const output = execFileSync(
        process.execPath,
        [join(HERE, "index.mjs"), flag],
        {
          cwd: workspace,
          encoding: "utf8",
        }
      )

      expect(output.trim()).toBe(version)
    }
  })

  it("files each option under the command it belongs to", () => {
    expect(USAGE).toContain("Options of create-view-variant")
    expect(USAGE).toContain("-v, --version")
  })
})

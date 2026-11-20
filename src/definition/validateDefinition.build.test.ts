import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { build, type Options } from "tsdown"
import { describe, expect, it } from "vitest"
import tsdownConfig from "../../tsdown.config"

/** The package's own build: one config, not a list. */
const config = tsdownConfig as Options

/**
 * The development checks are switched off by the *application's* bundler,
 * which replaces `process.env.NODE_ENV` when it builds for production. The
 * package build must leave that expression alone: compiled as a browser
 * library, it used to be replaced by `"development"` there and then, so every
 * check — and every error it throws — shipped to production in `dist/`.
 */
describe("the published build of the development checks", () => {
  it("leaves process.env.NODE_ENV for the application's bundler", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "rrv-build-"))
    try {
      await build({
        ...config,
        config: false,
        entry: {
          // Vitest runs from the package root, as `pnpm run build` does.
          validateDefinition: resolve("src/definition/validateDefinition.ts"),
        },
        outDir,
        dts: false,
        sourcemap: false,
        logLevel: "silent",
      })

      const files = await readdir(outDir)
      const code = (
        await Promise.all(
          files
            .filter((file) => file.endsWith(".js"))
            .map((file) => readFile(join(outDir, file), "utf8"))
        )
      ).join("\n")

      expect(code).toMatch(/function isDevelopment\(\)/)
      expect(code).toContain('process.env.NODE_ENV !== "production"')
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  }, 60_000)
})

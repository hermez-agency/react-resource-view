import { fileURLToPath } from "node:url"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

/**
 * The site's own tests, apart from `vite.config.ts`: the TanStack Start plugin
 * there prerenders routes and has nothing to do with mounting a component in
 * jsdom.
 *
 * These always run against the published library, whatever `RRV_SOURCE` says.
 * Pointing them at the working tree would need the library's own dependencies
 * — `@base-ui/utils` among them — to resolve the same React as the site, and
 * here neither `resolve.dedupe`, an alias, nor `deps.inline` reaches them the
 * way they do in the build. The site built against the working tree is checked
 * by prerendering it instead: see `website-against-worktree` in ci.yml.
 */
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  // backends.test.ts reads the CLI, one directory up, to compare its list.
  server: { fs: { allow: [".."] } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // Both libraries ship ESM that imports CSS; inlining them lets Vite handle
    // it, as `ssr.noExternal` does for the build.
    server: { deps: { inline: ["react-data-form", "react-resource-view"] } },
    css: false,
  },
})

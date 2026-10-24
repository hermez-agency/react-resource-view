import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import tailwindcss from "@tailwindcss/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import {
  dedupeList,
  REPO_ROOT,
  resolveAliases,
  resourceViewSourcePlugin,
  sourceMode,
  ssrNoExternal,
} from "./resourceViewSource.ts"

/**
 * The documentation site is a TanStack Start application: the prose is rendered
 * ahead of the reader, the demos are mounted in the browser.
 *
 * Start was picked over a generic SSR framework because `react-resource-view`
 * keeps its whole view context in the URL and ships a TanStack Router adapter.
 * Running the site on that router means the demos exercise the same navigation
 * port the documentation recommends, instead of a bespoke one written for the
 * site.
 *
 * The build prerenders every route to static HTML so the site can be served by
 * GitHub Pages, which has no server to render on request. `pnpm start` still
 * runs the same application with a live server — the two differ in *when* the
 * HTML is produced, not in what produces it.
 */

/**
 * Where the site is served from. GitHub Pages serves a project site under
 * /<repository>/, not at the domain root, so the base has to reach the router,
 * the asset URLs and the links the view package builds.
 */
const BASE = process.env.DOCS_BASE ?? "/"

/**
 * Which copy of `react-resource-view` the site runs on: npm by default, the
 * working tree when `RRV_SOURCE` asks for it. See resourceViewSource.ts.
 */
const MODE = sourceMode()

export default defineConfig({
  base: BASE,
  plugins: [
    ...resourceViewSourcePlugin(MODE),
    tanstackStart({
      router: { basepath: BASE },
      prerender: {
        enabled: true,
        // Every page is reachable from the sidebar, which is rendered on every
        // page — so crawling from the entry points below finds all of them.
        crawlLinks: true,
        // A page that fails to render must fail the build: a silently missing
        // route would be a 404 nobody notices until a reader hits it.
        failOnError: true,
        // llms.txt and the API reference are written after this build by
        // `generate-seo-files.ts` and typedoc: the footer links to them, but
        // the crawler would ask the app for them and get a 404.
        filter: ({ path }) => !/\.(txt|md)$|\/api\/?$/.test(path),
      },
      pages: [
        { path: "/" },
        { path: "/playground" },
        { path: "/playground/builder" },
      ],
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: resolveAliases(MODE),
    dedupe: dedupeList(MODE),
  },
  // In source mode the library is read from outside this project, so the dev
  // server has to be allowed to serve it.
  server: MODE === "npm" ? {} : { fs: { allow: [REPO_ROOT] } },
  ssr: {
    // Both libraries ship ESM that imports CSS and reaches for browser globals.
    // Bundling them for the server lets Vite apply the same transforms it
    // applies to the site's own code, instead of handing raw ESM to Node.
    noExternal: ssrNoExternal(MODE, [
      "react-data-form",
      "react-resource-view",
      "@base-ui/react",
      "framer-motion",
      "cmdk",
      "sonner",
      "react-day-picker",
      "react-easy-crop",
    ]),
  },
})

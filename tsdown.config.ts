import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "tanstack/index": "src/tanstack/index.tsx",
    "i18n/index": "src/i18n/index.ts",
  },
  format: ["esm"],
  // `@internal` declarations stay out of the published .d.ts.
  dts: { compilerOptions: { stripInternal: true } },
  sourcemap: true,
  clean: true,
  target: "es2022",
  // react/react-dom come from the host application; everything else
  // (base-ui, tiptap, lucide…) is declared in dependencies and externalised.
  external: ["react", "react-dom", "react/jsx-runtime", "react-mini-i18n", "jsonld-item", "resource-registry", "react-data-form", "@tanstack/react-router"],
  platform: "browser",
  // A browser build replaces `process.env.NODE_ENV` with "development" here,
  // which would freeze the development checks on in `dist/`. Left as it is, it
  // is replaced by the application's bundler, for the application's build.
  define: { "process.env.NODE_ENV": "process.env.NODE_ENV" },
  // Keeps the components usable on the client inside an RSC context.
  outputOptions: {
    banner: '"use client";',
  },
})

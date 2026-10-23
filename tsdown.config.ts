import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "tanstack/index": "src/tanstack/index.tsx",
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
  // Keeps the components usable on the client inside an RSC context.
  outputOptions: {
    banner: '"use client";',
  },
})

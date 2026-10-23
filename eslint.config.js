import js from "@eslint/js"
import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import reactHooks from "eslint-plugin-react-hooks"
import prettier from "eslint-config-prettier"

/**
 * Un texte écrit en dur dans le JSX d'une vue, ou un `aria-label` littéral.
 * Le texte d'un `<Trans>` est sa clé de traduction : il est permis.
 */
const noLiteralText = {
  meta: {
    type: "problem",
    messages: {
      text: "Texte écrit en dur dans une vue : passez-le par `Trans` ou `translate` avec une clé anglaise.",
      ariaLabel: "aria-label écrit en dur dans une vue : passez-le par `translate`.",
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (!/[A-Za-z\u00C0-\u024F]/.test(node.value)) return
        const parent = node.parent
        if (
          parent.type === "JSXElement" &&
          parent.openingElement.name.name === "Trans"
        )
          return
        context.report({ node, messageId: "text" })
      },
      'JSXAttribute[name.name="aria-label"] > Literal'(node) {
        context.report({ node, messageId: "ariaLabel" })
      },
    }
  },
}

export default [
  {
    // `website/` is a standalone project with its own toolchain and its own
    // dependencies, none of which are installed by this package. `.claude/`
    // holds agent skills restored from `skills-lock.json` — third-party code
    // this package neither writes nor ships. The fixtures of `migrate` are
    // declarations as a project writes them, 0.x ones included.
    ignores: [
      "dist/**",
      "cli/__fixtures__/**",
      "docs/dist/**",
      "website/**",
      ".claude/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  {
    // The command line is plain Node ESM, shipped as it is written: no
    // transform, no bundler, and therefore no browser globals either.
    files: ["cli/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        DOMParser: "readonly",
        FileReader: "readonly",
        File: "readonly",
        Blob: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLImageElement: "readonly",
        Image: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tseslint, "react-hooks": reactHooks },
    rules: {
      ...tseslint.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Le code s'appuie volontairement sur `any` pour les données de formulaire,
      // dont la forme n'est connue qu'à l'exécution.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
    },
  },
  {
    // Les vues n'écrivent aucun texte en dur : chaque libellé passe par `Trans`
    // ou `translate`, avec une clé anglaise que le dictionnaire traduit. Un
    // texte littéral ne se traduit pas et reste dans la langue du code.
    files: ["src/views/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    plugins: { "rrv-views": { rules: { "no-literal-text": noLiteralText } } },
    rules: {
      "rrv-views/no-literal-text": "error",
    },
  },
  prettier,
]

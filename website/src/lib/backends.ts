/**
 * The backends react-resource-view talks to, in the order the site shows them.
 *
 * One list for the landing page's backend picker, the backends feature card and
 * the starter page's commands, so none of them can name a backend the others
 * leave out. `id` is the `--backend` value of `npx react-resource-view init`
 * (`cli/init.mjs`), and `backends.test.ts` checks the two lists still match.
 */
export interface Backend {
  /** The `--backend` flag of `init`. */
  id: string
  /** The product's name, as its owner writes it. */
  name: string
  /** Where the API runs while developing — the `--api-url` of the example. */
  apiUrl: string
  /** Only when `init` cannot guess it from the backend. */
  schemaUrl?: string
  /** Not a product but a shape: any API that publishes an OpenAPI document. */
  generic?: boolean
  /** The section of the backends page that explains its dialect. */
  docs: { to: "/docs/resource-view/backends/"; hash: string }
}

export const BACKENDS: Backend[] = [
  {
    id: "api-platform",
    name: "API Platform",
    apiUrl: "https://localhost",
    docs: { to: "/docs/resource-view/backends/", hash: "dialects" },
  },
  {
    id: "spring-boot",
    name: "Spring Boot",
    apiUrl: "http://localhost:8080",
    docs: { to: "/docs/resource-view/backends/", hash: "spring" },
  },
  {
    id: "supabase",
    name: "Supabase",
    apiUrl: "https://abcdefghijklmnop.supabase.co",
    docs: { to: "/docs/resource-view/backends/", hash: "supabase" },
  },
  {
    id: "strapi",
    name: "Strapi",
    apiUrl: "http://localhost:1337",
    docs: { to: "/docs/resource-view/backends/", hash: "strapi" },
  },
  {
    id: "fastapi",
    name: "FastAPI",
    apiUrl: "http://localhost:8000",
    docs: { to: "/docs/resource-view/backends/", hash: "fastapi" },
  },
  {
    id: "django",
    name: "Django",
    apiUrl: "http://localhost:8000",
    docs: { to: "/docs/resource-view/backends/", hash: "django" },
  },
  {
    id: "json-server",
    name: "json-server",
    apiUrl: "http://localhost:3000",
    generic: true,
    docs: { to: "/docs/resource-view/backends/", hash: "rest" },
  },
  {
    id: "rest",
    name: "Any REST API (OpenAPI)",
    apiUrl: "http://localhost:3000",
    schemaUrl: "http://localhost:3000/docs/openapi.json",
    generic: true,
    docs: { to: "/docs/resource-view/backends/", hash: "custom" },
  },
]

export function backend(id: string): Backend {
  const found = BACKENDS.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Unknown backend: ${id}`)
  return found
}

/** The one command that starts a back office on that backend. */
export function starterCommand({ id, apiUrl, schemaUrl }: Backend): string {
  const schema = schemaUrl ? ` -s ${schemaUrl}` : ""
  return `npx react-resource-view init my-admin -b ${id} -u ${apiUrl}${schema}`
}

/** Its section of the starter page: the command, the setup, the backend side. */
export function starterSection({ id }: Backend): string {
  return `starter-${id}`
}

/** "API Platform, Spring Boot, Supabase, Strapi, FastAPI or Django" — the named ones. */
export function namedBackends(conjunction: "or" | "and" = "or"): string {
  const names = BACKENDS.filter(({ generic }) => !generic).map(({ name }) => name)
  return `${names.slice(0, -1).join(", ")} ${conjunction} ${names.at(-1)}`
}

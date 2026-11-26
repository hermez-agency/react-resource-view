/**
 * The words the documentation is written with.
 *
 * Each one is a concept of the library rather than of React or of HTTP, and
 * the documentation uses them long before it defines them. They are defined
 * once here: the Concepts page renders this list, and `<Term>` links a word
 * back to its entry — so an id that is not in this list fails to compile.
 */

export interface Concept {
  /** Anchor on the Concepts page. */
  id: string
  term: string
  /** Other names the documentation uses for the same thing. */
  aliases?: string[]
  /** One or two sentences. A run between backticks is rendered as code. */
  definition: string
  /** The page that documents it in full. */
  href: string
  linkLabel: string
}

export const CONCEPTS = [
  {
    id: "resource",
    term: "Resource",
    definition:
      "Something your API exposes as a collection — articles, users, orders — declared once with `createViewResource`. Every screen of the library is derived from that one declaration.",
    href: "/docs/resource-view/resources",
    linkLabel: "Declaring a resource",
  },
  {
    id: "view",
    term: "View",
    definition:
      "One of the five screens a resource gets: list, read, create, update and delete. The root of the declaration is what they all start from; `views.<action>` adjusts it for a single action, merged deeply.",
    href: "/docs/resource-view/resources#five-views",
    linkLabel: "Five views from one description",
  },
  {
    id: "view-variant",
    term: "Layout",
    aliases: ["view variant"],
    definition:
      "How a list is drawn — table, cards, board, split, calendar, timeline, feed or plain items, each a function of the `layout` namespace. A resource declares several in `views.list.layouts`, and the reader switches between them; the choice is kept in the URL.",
    href: "/docs/resource-view/layouts",
    linkLabel: "Choosing a layout",
  },
  {
    id: "form",
    term: "Form",
    definition:
      "The fields of a resource, described as data and rendered by react-data-form. The same description is the create and edit forms, the table's columns and the payload the API receives.",
    href: "/docs/resource-view/forms",
    linkLabel: "A form per action",
  },
  {
    id: "controller",
    term: "Controller",
    definition:
      "The component that renders and edits one field — a text input, a select, a date picker, a file upload. A field names its controller; writing your own takes two props.",
    href: "/docs/form/controllers",
    linkLabel: "Field controllers",
  },
  {
    id: "repository",
    term: "Repository",
    definition:
      "What reads and writes a resource's data. `createViewResource` picks one for you: an HTTP repository when the resource has a `path`, a localStorage one when it declares `storage: \"local\"` — or takes yours, given in `repository`.",
    href: "/docs/resource-view/resources#repository",
    linkLabel: "Where the data comes from",
  },
  {
    id: "dialect",
    term: "Dialect",
    definition:
      "How a given backend spells URLs, pages, filters, collections and validation errors. The repository speaks through it, so the same declaration runs against API Platform, Strapi, Supabase, FastAPI, Django or Spring Boot.",
    href: "/docs/resource-view/backends#dialects",
    linkLabel: "Backends & dialects",
  },
  {
    id: "port",
    term: "Port",
    definition:
      "What the library asks of the application hosting it instead of choosing for it: the router and the routing mode, the application's name and description through `configurePorts`, the API and its dialect through `configureApi`. Both are called once, at startup.",
    href: "/docs/resource-view/installation#router",
    linkLabel: "Installation",
  },
  {
    id: "scope",
    term: "Scope",
    definition:
      "An area of the application — a back office, a customer portal — that lists its own resources in `resources`, with its menu, layout and access rule. Its name is the first segment of every URL the views build.",
    href: "/docs/resource-view/scopes",
    linkLabel: "Scopes & menu",
  },
  {
    id: "registry",
    term: "Registry",
    definition:
      "The shared list where `createViewResource` records each resource under its id, so a view, a link or a sub-view can find a resource by name. It is a module-level singleton, which is why `resource-registry` is a peer dependency.",
    href: "/docs/resource-view/resources#basic",
    linkLabel: "The smallest declaration",
  },
  {
    id: "sub-view",
    term: "Sub-view",
    aliases: ["tab"],
    definition:
      "A view of another resource nested in a detail page, as a tab declared in `views.read.tabs` — an author's articles under the author. It is a full view: it fetches, filters, paginates and writes.",
    href: "/docs/resource-view/sub-views",
    linkLabel: "Sub-views & tabs",
  },
] as const satisfies readonly Concept[]

export type ConceptId = (typeof CONCEPTS)[number]["id"]

export const CONCEPTS_HREF = "/docs/resource-view/concepts"

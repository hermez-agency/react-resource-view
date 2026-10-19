import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import {
  Blocks,
  Boxes,
  Braces,
  CalendarRange,
  CircleCheckBig,
  Columns3,
  Compass,
  Filter,
  FileCodeCorner,
  Fingerprint,
  FolderTree,
  Group,
  History,
  KeyRound,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  LockKeyhole,
  Mail,
  Network,
  ListChecks,
  PanelLeft,
  PanelsTopLeft,
  PenLine,
  Plug,
  Rocket,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  SquarePen,
  SquareStack,
  Table2,
  Terminal,
  Wand2,
  Waypoints,
  Zap,
} from "lucide-react"

/** A single documentation page. */
export interface DocPage {
  /**
   * Route path, matching the file route that renders it.
   *
   * Typed against the generated route tree rather than as a plain string, so a
   * sidebar entry pointing at a page that does not exist fails to compile.
   */
  href: Extract<LinkProps["to"], string>
  title: string
  /** One line, shown under the title and in the search results. */
  summary: string
  icon: LucideIcon
}

/** A titled run of pages inside a section. */
export interface DocGroup {
  label: string
  pages: DocPage[]
}

/**
 * One of the two libraries.
 *
 * The sidebar is split along this axis and nothing else: a reader arrives
 * looking either for a form or for a resource view, and the two APIs barely
 * overlap. `accent` is the CSS variable the section is coloured with, so the
 * split is visible before a single label is read.
 */
export interface DocSection {
  id: "form" | "resource-view"
  /** npm package name. */
  pkg: string
  label: string
  tagline: string
  /** Theme variable name — see src/styles/app.css. */
  accent: "form" | "view"
  repository: string
  groups: DocGroup[]
}

export const FORM_SECTION: DocSection = {
  id: "form",
  pkg: "react-data-form",
  label: "Forms",
  tagline: "The form building block, usable on its own.",
  accent: "form",
  repository: "https://github.com/hermez-agency/react-data-form",
  groups: [
    {
      label: "Getting started",
      pages: [
        {
          href: "/docs/form/",
          title: "Introduction",
          summary: "What the library does, and what it deliberately does not.",
          icon: Sparkles,
        },
        {
          href: "/docs/form/installation/",
          title: "Installation",
          summary:
            "Install, wire Tailwind up, and understand why two dependencies are peers.",
          icon: Plug,
        },
        {
          href: "/docs/form/anatomy/",
          title: "Anatomy of a form",
          summary:
            "useForm, FormElement, and the round trip a value makes between them.",
          icon: Layers,
        },
      ],
    },
    {
      label: "Writing forms",
      pages: [
        {
          href: "/docs/form/fields/",
          title: "Fields",
          summary:
            "Every key of a field description, and what each one changes on screen.",
          icon: ListChecks,
        },
        {
          href: "/docs/form/controllers/",
          title: "Field controllers",
          summary: "The full catalogue — 34 controllers, each one running.",
          icon: Blocks,
        },
        {
          href: "/docs/form/validation/",
          title: "Validation & API errors",
          summary:
            "Client-side validators, and mapping an API Platform 422 back onto fields.",
          icon: CircleCheckBig,
        },
        {
          href: "/docs/form/groups/",
          title: "Groups",
          summary: "Splitting a long form into collapsible sections.",
          icon: Group,
        },
        {
          href: "/docs/form/steps/",
          title: "Multi-step forms",
          summary:
            "Turning the same description into a wizard, with per-step validation.",
          icon: SquareStack,
        },
        {
          href: "/docs/form/nested/",
          title: "Nested forms & arrays",
          summary: "Sub-forms, repeatable rows, and the page-builder controller.",
          icon: FolderTree,
        },
        {
          href: "/docs/form/asymmetric/",
          title: "Asymmetric forms",
          summary:
            "Page builders and résumés: a form whose shape its own content decides.",
          icon: LayoutTemplate,
        },
        {
          href: "/docs/form/email-builder/",
          title: "Email builder",
          summary:
            "The same field, an email palette, and a pure function that renders HTML Gmail and Outlook agree on.",
          icon: Mail,
        },
      ],
    },
    {
      label: "Going further",
      pages: [
        {
          href: "/docs/form/custom-controller/",
          title: "Writing a controller",
          summary:
            "Two props, no registration step: the extension point of the library.",
          icon: PenLine,
        },
        {
          href: "/docs/form/registry/",
          title: "The form registry",
          summary: "addForm, getForm, and why the registry has to be a singleton.",
          icon: Boxes,
        },
        {
          href: "/docs/form/configuration/",
          title: "Configuration & i18n",
          summary: "Ports, form-wide defaults, locales, currency and translation.",
          icon: Settings2,
        },
      ],
    },
  ],
}

export const VIEW_SECTION: DocSection = {
  id: "resource-view",
  pkg: "react-resource-view",
  label: "Resource views",
  tagline: "Declare a resource, get its whole CRUD surface.",
  accent: "view",
  repository: "https://github.com/hermez-agency/react-resource-view",
  groups: [
    {
      label: "Getting started",
      pages: [
        {
          href: "/docs/resource-view/quickstart/",
          title: "Quickstart",
          summary:
            "Five minutes from zero to a list on your API, then a filter and a second layout.",
          icon: Zap,
        },
        {
          href: "/docs/resource-view/",
          title: "Introduction",
          summary:
            "One declaration, five views — list, detail, create, edit, delete — and a URL that carries the state.",
          icon: Compass,
        },
        {
          href: "/docs/resource-view/concepts/",
          title: "Concepts",
          summary:
            "The vocabulary in one page — resource, view, dialect, port, scope… — and how the pieces fit together.",
          icon: Waypoints,
        },
        {
          href: "/docs/resource-view/installation/",
          title: "Installation",
          summary: "Install, style, and connect the package to your API.",
          icon: Plug,
        },
        {
          href: "/docs/resource-view/starter/",
          title: "Start a project",
          summary:
            "npx react-resource-view init: a back office on your API, its schema dumped into TypeScript.",
          icon: Rocket,
        },
        {
          href: "/docs/resource-view/resources/",
          title: "Declaring a resource",
          summary: "createViewResource, its views, and the repository behind them.",
          icon: PanelsTopLeft,
        },
        {
          href: "/docs/resource-view/forms/",
          title: "A form per action",
          summary:
            "One description for four screens — and a different form where creating is not editing.",
          icon: SquarePen,
        },
        {
          href: "/docs/resource-view/backends/",
          title: "Backends & dialects",
          summary:
            "One declaration against API Platform, Spring Boot, Strapi, Supabase, FastAPI or Django — and how to add another.",
          icon: Network,
        },
        {
          href: "/docs/resource-view/python/",
          title: "For Python developers",
          summary:
            "FastAPI and Django REST Framework side by side: the starter, the schema, types from your models, pagination, CORS and tokens.",
          icon: Braces,
        },
        {
          href: "/docs/resource-view/openapi-types/",
          title: "Types from OpenAPI",
          summary:
            "Export the schema your API publishes, and type the client and every resource from it.",
          icon: FileCodeCorner,
        },
      ],
    },
    {
      label: "Layouts",
      pages: [
        {
          href: "/docs/resource-view/layouts/",
          title: "Choosing a layout",
          summary: "Seven layouts over one resource, and how the reader switches.",
          icon: LayoutGrid,
        },
        {
          href: "/docs/resource-view/table/",
          title: "Table & cards",
          summary: "The two everyday layouts, column by column.",
          icon: Table2,
        },
        {
          href: "/docs/resource-view/split/",
          title: "Split & board",
          summary: "Master-detail, and a board grouped by a field.",
          icon: Columns3,
        },
        {
          href: "/docs/resource-view/calendar/",
          title: "Calendar & timeline",
          summary: "Laying a collection out over time.",
          icon: CalendarRange,
        },
        {
          href: "/docs/resource-view/custom-variant/",
          title: "Create your own layout",
          summary:
            "One command writes the eighth layout: a single file, yours to draw.",
          icon: Terminal,
        },
      ],
    },
    {
      label: "Behaviour",
      pages: [
        {
          href: "/docs/resource-view/filters/",
          title: "Filters",
          summary:
            "A filter form, defaults that survive the first request, and the URL.",
          icon: Filter,
        },
        {
          href: "/docs/resource-view/routing/",
          title: "Routing",
          summary:
            "The four primitives, the TanStack adapter, path mode and query mode.",
          icon: Route,
        },
        {
          href: "/docs/resource-view/scopes/",
          title: "Scopes & menu",
          summary:
            "Grouping resources per area of the application, and building its menu.",
          icon: Fingerprint,
        },
        {
          href: "/docs/resource-view/admin-layout/",
          title: "Admin layout",
          summary:
            "AdminLayout: a ready-made decoratorComponent — sidebar, top bar, a bottom nav on mobile, and full-width views.",
          icon: PanelLeft,
        },
        {
          href: "/docs/resource-view/permissions/",
          title: "Permissions & quotas",
          summary:
            "One permissions object, rules per record, and a creation quota with a fallback.",
          icon: KeyRound,
        },
        {
          href: "/docs/resource-view/authentication/",
          title: "Authentication",
          summary:
            "Better Auth end to end: an async scope authorization, sign-in, roles and sign-out.",
          icon: ShieldCheck,
        },
        {
          href: "/docs/resource-view/authentication-jwt/",
          title: "Authentication with JWT",
          summary:
            "API Platform and LexikJWT with react-jwt-session: a refresh token, protected scopes, roles and sign-out.",
          icon: LockKeyhole,
        },
        {
          href: "/docs/resource-view/sub-views/",
          title: "Sub-views & tabs",
          summary: "Nesting a resource inside another one's detail page.",
          icon: Wand2,
        },
      ],
    },
    {
      label: "Releases",
      pages: [
        {
          href: "/docs/resource-view/changelog/",
          title: "Changelog",
          summary: "What each release of react-resource-view added, fixed and changed.",
          icon: History,
        },
      ],
    },
  ],
}

export const SECTIONS: DocSection[] = [VIEW_SECTION, FORM_SECTION]

/** Every page, in sidebar order — the order prev/next walks. */
export const ALL_PAGES: DocPage[] = SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) => group.pages)
)

export function findSection(pathname: string): DocSection | undefined {
  return SECTIONS.find((section) => pathname.startsWith(`/docs/${section.id}`))
}

export function findPage(pathname: string): DocPage | undefined {
  return ALL_PAGES.find((page) => stripTrailingSlash(page.href) === stripTrailingSlash(pathname))
}

/** The pages either side of `pathname`, for the footer pager. */
export function findNeighbours(pathname: string): {
  previous?: DocPage
  next?: DocPage
} {
  const index = ALL_PAGES.findIndex(
    (page) => stripTrailingSlash(page.href) === stripTrailingSlash(pathname)
  )
  if (index === -1) return {}

  return { previous: ALL_PAGES[index - 1], next: ALL_PAGES[index + 1] }
}

/**
 * The same path, without its trailing slash.
 *
 * Static hosting serves a page as a directory index, so a reader arriving on
 * /docs/form is redirected to /docs/form/ and the router reports the path with
 * the slash — while every `href` in the navigation is written without one.
 * Comparing the two forms directly makes the server and the browser disagree
 * about which page is current, which is a hydration mismatch: everything that
 * compares a path against an `href` goes through here.
 */
export function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname
}

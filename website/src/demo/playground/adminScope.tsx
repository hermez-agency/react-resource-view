import { Link } from "@tanstack/react-router"
import { Blocks, BookOpen, Bug, Github, Newspaper, ShoppingBag } from "lucide-react"
import { ActionList } from "react-data-form"
import { createAdminLayout, type ScopeInterface } from "react-resource-view"
import { DeclarationButton } from "@/demo/playground/DeclarationButton"
import {
  commentsResource,
  companiesResource,
  newslettersResource,
  ordersResource,
  overviewResource,
  postsResource,
  productsResource,
  tasksResource,
  usersResource,
} from "@/demo/playground/resources"

/**
 * The one thing `AdminLayout` alone cannot offer: a way to the standalone
 * builder — the same three kits, on sample data, for whoever wants to try one
 * without opening a record. Rendered in the top bar via `createAdminLayout`'s
 * `topBarEnd`, so it survives every screen of the scope.
 *
 * A plain router `Link` rather than the package's own: it leaves the resource
 * context entirely, for a route this scope does not own.
 */
function BuilderLink() {
  return (
    <Link
      to="/playground/builder/"
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <Blocks className="size-4" />
      Builder demo
    </Link>
  )
}

/**
 * The back office of the playground: one area, nine resources, one menu.
 *
 * This is the whole administration. There is no screen written by hand
 * anywhere: the lists and their layouts, the filter bars, the forms and the
 * delete confirmations all come from the declarations in `resources/`, and
 * everything around them is `AdminLayout` — the package's ready-made admin
 * template, configured in a line and fed by the menu below. The overview is
 * the one exception, and it is a resource too, with a `components.view` of its
 * own instead of a list.
 *
 * The scope is loaded lazily by the playground, which is the point of a scope
 * being a module rather than a folder: a reader who only browses the
 * documentation never downloads any of it.
 */
export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Roastery admin",
  resources: [
    overviewResource,
    usersResource,
    companiesResource,
    postsResource,
    commentsResource,
    newslettersResource,
    productsResource,
    ordersResource,
    tasksResource,
  ],
  decoratorComponent: createAdminLayout({
    topBarEnd: (
      <>
        <DeclarationButton />
        <BuilderLink />
      </>
    ),
    // A "Need help?" block pinned at the bottom of the sidebar — on a phone, a
    // last entry of the bottom bar opening the same links in a drawer.
    // Absolute URLs, so each one opens in a new tab and the playground stays
    // where it was.
    footerMenuTitle: "Need help?",
    footerMenu: [
      {
        name: "Documentation",
        icon: BookOpen,
        href: "https://hermez.dev/react-resource-view/docs/resource-view/admin-layout",
      },
      {
        name: "GitHub",
        icon: Github,
        href: "https://github.com/hermez-agency/react-resource-view",
      },
      {
        name: "Report an issue",
        icon: Bug,
        href: "https://github.com/hermez-agency/react-resource-view/issues",
      },
    ],
  }),
  // Where the scope opens when the URL names it and nothing else.
  defaultViewResourceContextParams: {
    resourceId: overviewResource["@id"],
    resourceAction: ActionList.list,
  },
  // Data, rendered by the template: `AdminLayout` reads this menu for its
  // sidebar on desktop and for its bottom bar on narrow screens. Each entry is
  // built from its resource, so a label, an icon and a link are declared once.
  menu: [
    overviewResource,
    usersResource,
    companiesResource,
    tasksResource,
    {
      name: "Blog",
      icon: Newspaper,
      items: [
        postsResource,
        commentsResource,
        // The other thing the roastery writes: the email builder's records.
        newslettersResource,
      ],
    },
    {
      name: "Catalogue",
      icon: ShoppingBag,
      items: [productsResource, ordersResource],
    },
  ],
}

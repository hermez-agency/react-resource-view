import { useEffect } from "react"
import { ActionList } from "react-data-form"
import {
  createAdminLayout,
  CurrentResourceContext,
  createViewResource,
  ResourceViewProvider,
  ScopeInterface,
  setCurrentScope,
} from "react-resource-view"
import { setInStorage } from "ssr-safe-storage"
import { FileText, Newspaper, Users } from "lucide-react"
import { PageHeader, Section } from "../DocLayout"

const SCOPE = "admin-layout-demo"

interface DemoArticle {
  "@id": string
  "@type": string
  id: string
  title: string
  author: string
  published: boolean
}

function seed() {
  setInStorage("admin_layout_demo_articles", {
    "@id": "admin_layout_demo_articles",
    "@type": "Collection",
    member: [
      {
        "@id": "/api/articles/1",
        "@type": "Article",
        id: "1",
        title: "Point AdminLayout at a scope",
        author: "Ada",
        published: true,
      },
      {
        "@id": "/api/articles/2",
        "@type": "Article",
        id: "2",
        title: "Below md, the sidebar becomes a bottom bar",
        author: "Grace",
        published: false,
      },
    ],
    totalItems: 2,
  })

  setInStorage("admin_layout_demo_users", {
    "@id": "admin_layout_demo_users",
    "@type": "Collection",
    member: [
      {
        "@id": "/api/users/1",
        "@type": "User",
        id: "1",
        title: "Ada",
        author: "",
        published: true,
      },
    ],
    totalItems: 1,
  })
}

const articlesResource = createViewResource<DemoArticle>(
  "admin_layout_demo_articles",
  {
    name: "Articles",
    icon: Newspaper,
    storage: "local",
    titleField: "title",
    form: {
      inputs: {
        title: { label: "Title", required: true },
        author: { label: "Author" },
        published: { label: "Published" },
      },
    },
  }
)

const usersResource = createViewResource<DemoArticle>("admin_layout_demo_users", {
  name: "Users",
  icon: Users,
  storage: "local",
  form: { inputs: { title: { label: "Name", required: true } } },
})

const demoScope: ScopeInterface = {
  name: SCOPE,
  // Cmd+K / Ctrl+K opens the palette; `searchable` also looks records up.
  decoratorComponent: createAdminLayout({ commandPalette: { searchable: true } }),
  resources: [articlesResource, usersResource],
  // One entry per resource, named and iconed after it.
  menu: "auto",
  defaultViewResourceContextParams: {
    resourceId: articlesResource["@id"],
    resourceAction: ActionList.list,
  },
}

/**
 * `AdminLayout`, actually running — not a code sample. Bounded in a fixed
 * height so it sits inside the page rather than taking over the viewport, the
 * way `decoratorComponent` normally would; the sidebar still renders at its
 * usual `100svh`, clipped by the box around it rather than shrunk to fit.
 *
 * `configuration.scopes` sets the library's global "current scope" for the
 * duration this widget is mounted (`generateLink` falls back to it when a
 * link names no scope of its own) — every resource here is listed in the
 * scope's `resources`, which ties its links to it, and the effect below hands
 * the current scope back to `"docs"` on unmount, so the rest of the site is
 * unaffected.
 *
 * `CurrentResourceContext` is reset to `undefined` around it: without that,
 * the demo would inherit this very doc page as its `parentResource` — a
 * back button pointing nowhere useful, on a resource that has no parent.
 */
export function AdminLayoutLiveDemo() {
  useEffect(() => {
    seed()
    return () => setCurrentScope("docs")
  }, [])

  return (
    <div className="relative isolate h-[560px] overflow-hidden rounded-lg border border-border">
      <CurrentResourceContext value={undefined}>
        <ResourceViewProvider
          viewResourceContextParams={{ scope: SCOPE }}
          configuration={{
            scopes: { [SCOPE]: async () => demoScope },
            defaultScope: SCOPE,
          }}
        />
      </CurrentResourceContext>
    </div>
  )
}

const adminDemoResource = createViewResource("admin-layout-demo-page", {
  name: "Admin layout, running",
  icon: FileText,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Admin layout, running"
          intro="The two resources below, wrapped in AdminLayout — the sidebar, the top bar and the page header, reading a real menu rather than a description of one. Click inside it and press Ctrl+K (⌘K on a Mac) for the command palette."
        />

        <Section title="Running">
          <AdminLayoutLiveDemo />
        </Section>
      </>
    ),
  },
})

export default adminDemoResource

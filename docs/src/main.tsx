import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ActionList } from "react-data-form"
import { configurePorts, parseLink, ResourceViewProvider } from "react-resource-view"
import { DocLayout } from "./DocLayout"
import { overviewResource, resources } from "./pages"
import "./fonts"
import "./styles.css"

/**
 * The documentation site, built with the library it documents.
 *
 * Every page is a resource with a `components.view`, the sidebar is built from
 * those same resources, and moving between pages goes through the library's own
 * routing — so reading the docs exercises the thing being described.
 */

// GitHub Pages serves the site from /<repository>/, and has no server to answer
// a deep path, so the whole view context travels in the query string.
const basePath = import.meta.env.BASE_URL

configurePorts({
  routing: { mode: "query", param: "view", basePath },
  appName: "react-resource-view",
  description: "CRUD views for REST APIs — API Platform, Strapi, Supabase, FastAPI.",
  appUrl: typeof window !== "undefined" ? window.location.origin : "",
})

function Docs() {
  const params = parseLink(window.location.pathname + window.location.search)

  return (
    <ResourceViewProvider
      viewResourceContextParams={{
        resourceId: overviewResource["@id"] as string,
        resourceAction: ActionList.read,
        ...params,
        scope: "docs",
      }}
      configuration={{
        resources,
        // No `scopes`: a documentation site needs neither authorisation nor
        // code splitting, and going through them would suspend on first paint.
        decoratorComponent: DocLayout,
      }}
    />
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Docs />
  </StrictMode>
)

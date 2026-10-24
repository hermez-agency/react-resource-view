import { createViewResource } from "react-resource-view"
import { BookOpen } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"

/**
 * The landing page.
 *
 * Like every page here it is a resource with a `components.view`, which is the
 * same mechanism an application uses to render a custom screen inside the views.
 */
const overviewResource = createViewResource("overview", {
  name: "Overview",
  icon: BookOpen,
  components: {
    view: () => (
      <>
        <PageHeader
          title="react-resource-view"
          intro="CRUD views for REST APIs — API Platform, Strapi, Supabase, FastAPI. Declare a resource, and the package renders the list, the details, the forms and the delete confirmation — wired to your API and to the URL."
        />

        <Section
          title="Declare a resource"
          intro="You describe what a resource is; the package decides nothing about your stack."
        >
          <CodeBlock>{example}</CodeBlock>
          <p>
            That is enough for a filterable list, a detail view, create and edit
            forms bound to the API, and a delete confirmation — each reachable by its
            own URL, each offered unless <code>permissions</code> says otherwise.
          </p>
        </Section>

        <Section
          title="This site is built with it"
          intro="Every page you are reading is a resource, and the sidebar is the library's own menu."
        >
          <p>
            There is no separate documentation framework here. Each page calls{" "}
            <code>createViewResource</code> with a <code>components.view</code>, the
            scope lists them in its menu, and the routing you can read about on the
            next page decides what the URL looks like.
          </p>
          <CodeBlock>{selfDoc}</CodeBlock>
          <p>
            A screen with no data — a home, a help, a dashboard — is what{" "}
            <code>createPage</code> declares: a menu entry and a route to a
            component, with no create, read, edit or delete route and no request to
            the API.
          </p>
          <CodeBlock>{pageDoc}</CodeBlock>
        </Section>

        <Section title="Installation">
          <CodeBlock>{install}</CodeBlock>
          <p>
            <code>react-mini-i18n</code> and <code>resource-registry</code> own
            module-level singletons — a dictionary and a registry — so they are peer
            dependencies and must resolve to a single copy.
          </p>
        </Section>
      </>
    ),
  },
})

const example = `import { createViewResource, layout } from "react-resource-view"

const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      body: { label: "Body" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [layout.table({ fields: ["title", "published"] })],
    },
  },
})`

const selfDoc = `const overviewResource = createViewResource("overview", {
  name: "Overview",
  components: { view: () => <OverviewPage /> },
})`

const pageDoc = `const help = createPage("help", {
  name: "Help",
  icon: CircleHelp,
  component: HelpScreen,
})`

const install = `pnpm add react-resource-view react-data-form react-mini-i18n resource-registry`

export default overviewResource

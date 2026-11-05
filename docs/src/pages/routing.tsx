import { createViewResource, generateLink, parseLink } from "react-resource-view"
import { ActionList } from "react-data-form"
import { Route } from "lucide-react"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

/** Runs generateLink for real, so the page shows what the library outputs. */
function GeneratedLink({ params }: { params: Record<string, unknown> }) {
  return (
    <pre className="overflow-x-auto text-sm">
      <code>{generateLink(params)}</code>
    </pre>
  )
}

/** Reads the URL of this very page back into a context. */
function CurrentUrl() {
  const url =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : ""

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">This page's URL</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-2">
          <code>{url}</code>
        </pre>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Parsed back</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-2">
          <code>{JSON.stringify(parseLink(url), null, 2)}</code>
        </pre>
      </div>
    </div>
  )
}

const routingResource = createViewResource("routing", {
  name: "Routing",
  icon: Route,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Routing"
          intro="A view context — which resource, which action, which item — has to live somewhere in the URL. Two places are available, and the second is what makes this site possible."
        />

        <Section
          title="In the path, by default"
          intro="Legible, and what an application with its own server wants."
        >
          <CodeBlock>{pathMode}</CodeBlock>
        </Section>

        <Section
          title="In the query string"
          intro="A static host serves files. Ask it for /admin/articles/update/42 and it looks for that file, finds nothing, and answers 404."
        >
          <CodeBlock>{queryMode}</CodeBlock>
          <p>
            Same information, same parser, one request the host can actually serve.
            This site runs in that mode — which is why the links below are real
            output, generated as the page renders:
          </p>
          <LiveExample label="generateLink, right now">
            <GeneratedLink
              params={{
                scope: "docs",
                resourceId: "articles",
                resourceAction: ActionList.update,
                id: "42",
              }}
            />
          </LiveExample>
        </Section>

        <Section
          title="Reading is forgiving"
          intro="parseLink recognises a URL carrying the routing parameter whatever mode is configured, so a link copied out of a statically hosted page keeps working elsewhere."
        >
          <LiveExample label="Round-trip on this very page">
            <CurrentUrl />
          </LiveExample>
        </Section>

        <Section
          title="Reserved characters"
          intro="Filters and prefilled data are serialised into the query too."
        >
          <p>
            They go through <code>encodeURIComponent</code>, so a value holding{" "}
            <code>&amp;</code>, <code>=</code> or <code>#</code> survives the trip.
            Until 0.2.1 they used <code>encodeURI</code>, which leaves those
            untouched — an ampersand ended the parameter and the data arrived
            silently truncated.
          </p>
          <LiveExample label="defaultData holding an ampersand">
            <GeneratedLink
              params={{
                scope: "docs",
                resourceId: "articles",
                resourceAction: ActionList.create,
                defaultData: { title: "Tom & Jerry" },
              }}
            />
          </LiveExample>
        </Section>

        <Section
          title="Connecting a router"
          intro="The views navigate, but the package imports no router."
        >
          <CodeBlock>{adapter}</CodeBlock>
          <p>
            Importing <code>react-resource-view/tanstack</code> is what pulls
            TanStack Router in — the core never mentions it, so an application on
            React Router installs nothing extra. Left unconfigured, navigation falls
            back to full page loads through the History API, which is what this site
            uses.
          </p>
        </Section>
      </>
    ),
  },
})

const pathMode = `configurePorts({ routing: { mode: "path" } }) // the default

generateLink({ scope: "admin", resourceId: "articles",
               resourceAction: ActionList.update, id: "42" })
// → /admin/articles/update/42`

const queryMode = `configurePorts({
  routing: { mode: "query", param: "view", basePath: "/index.html" },
})

generateLink({ scope: "admin", resourceId: "articles",
               resourceAction: ActionList.update, id: "42" })
// → /index.html?view=admin/articles/update/42`

const adapter = `import { configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })`

export default routingResource

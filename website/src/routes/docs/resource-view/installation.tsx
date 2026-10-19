import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, Ol, P, Term, Ul } from "@/components/prose"
import { INSTALL_COMMAND } from "@/lib/install"
import { LATEST_VERSION } from "@/lib/changelog"

export const Route = createFileRoute("/docs/resource-view/installation")({
  head: () => ({
    meta: [
      { title: "Installing react-resource-view" },
      {
        name: "description",
        content:
          "Install the package, let Tailwind scan it, connect a router and point it at your API — API Platform, Spring Boot, Strapi, Supabase, FastAPI or Django.",
      },
    ],
  }),
  component: Installation,
})

const TAILWIND = `@import "tailwindcss";

@source "../node_modules/react-resource-view/dist";
@source "../node_modules/react-data-form/dist";

/* Only if your application has no shadcn theme of its own. */
@import "react-resource-view/styles.css";`

const ROUTER = `import { configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })`

const API = `import { configureApi, strapiDialect } from "react-resource-view"

configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
  // The default is jsonLdDialect(); strapiDialect() and supabaseDialect() ship too.
  dialect: strapiDialect(),
})`

const CLIENT = `import { configureClient } from "jsonld-api-client"

configureClient({
  baseUrl: "https://api.example.com",
  getAuthToken: () => (isLogged() ? getUserToken() : undefined),
  // Sent as X-Scope, when your API segments its responses.
  getScope: () => getCurrentScope(),
})`

const SMOKE = `import { ActionList } from "react-data-form"
import { createViewResource, ViewResourceContextProvider } from "react-resource-view"

const articles = createViewResource("articles", {
  name: "Articles",
  path: "/api/articles",
  form: { inputs: { title: { label: "Title" } } },
})

export function ArticlesPage() {
  return (
    <ViewResourceContextProvider resource={articles} resourceAction={ActionList.list} />
  )
}`

function Installation() {
  return (
    <DocArticle
      toc={[
        { id: "install", title: "Install" },
        { id: "versions", title: "Supported versions" },
        { id: "styles", title: "Styles" },
        { id: "router", title: "Connect a router" },
        { id: "api", title: "Point it at your API" },
        { id: "check", title: "Check it works" },
      ]}
    >
      <H2 id="install">Install</H2>

      <CodeBlock lang="bash">{INSTALL_COMMAND}</CodeBlock>

      <P>
        <C>react</C>, <C>react-data-form</C>, <C>react-mini-i18n</C> and{" "}
        <C>resource-registry</C> are peer dependencies. The last two own module-level
        singletons — a dictionary and a <Term id="registry">registry</Term> — so they
        have to resolve to a single copy. See{" "}
        <A href="/docs/form/installation">the same note on the forms side</A>.
      </P>

      <Callout kind="note" title="TanStack Router is optional">
        <P>
          The core never references it. Installing it is only needed if you import{" "}
          <C>react-resource-view/tanstack</C>, and an application on another router
          installs nothing extra.
        </P>
      </Callout>

      <Callout kind="tip" title="Upgrading from 0.x?">
        <P>
          1.0 rewrote how a resource is declared, and this documentation is written
          for it. <C>npx react-resource-view migrate src</C> rewrites your
          declarations, and{" "}
          <A href="https://github.com/hermez-agency/react-resource-view/blob/main/MIGRATION-1.0.md">
            the migration guide
          </A>{" "}
          lists every change, before and after.
        </P>
      </Callout>

      <H2 id="versions">Supported versions</H2>

      <P>
        The latest release is <C>{LATEST_VERSION}</C> — see{" "}
        <A href="/docs/resource-view/changelog">the changelog</A>. These are the ranges
        the package declares:
      </P>

      <Ul>
        <Li>
          <strong>React</strong> — 18.3 and 19 (<C>^18.3.0 || ^19.0.0</C>).
        </Li>
        <Li>
          <strong>TypeScript</strong> — written in strict mode and tested on 6.0; the
          types ship with the package.
        </Li>
        <Li>
          <strong>Tailwind CSS</strong> — 4 (<C>^4.0.0</C>), optional: it is only
          needed to generate the classes the components use.
        </Li>
        <Li>
          <strong>TanStack Router</strong> — 1.170 and later (<C>^1.170.0</C>),
          optional: only for <C>react-resource-view/tanstack</C>.
        </Li>
      </Ul>

      <H2 id="styles">Styles</H2>

      <CodeBlock lang="css" filename="app.css">
        {TAILWIND}
      </CodeBlock>

      <P>
        Both packages need the <C>@source</C> line — the <Term id="view">views</Term>{" "}
        render <Term id="form">form</Term> fields, so both sets of classes have to be
        generated. If your application already has a shadcn theme, leave the{" "}
        <C>@import</C> out and the components take your palette.
      </P>

      <H2 id="router">Connect a router</H2>

      <P>
        The views navigate and build links, but the package knows no router. It asks
        for four primitives, and ships an adapter for{" "}
        <A href="https://tanstack.com/router">TanStack Router</A>:
      </P>

      <CodeBlock>{ROUTER}</CodeBlock>

      <P>
        With any other router, supply the four yourself — it is about fifteen lines,
        and <A href="/docs/resource-view/routing">the routing page</A> walks through
        them.
      </P>

      <Callout kind="warning" title="Unconfigured, navigation is full page loads">
        <P>
          Left without a navigation <Term id="port">port</Term>, the views fall back
          to the History API and full reloads. Enough for a test or a story; not for
          production.
        </P>
      </Callout>

      <H2 id="api">Point it at your API</H2>

      <P>
        The API connection is configured separately — the views themselves never
        mention a URL. <C>configureApi</C> says where the API is and which{" "}
        <A href="/docs/resource-view/backends">dialect</A> it speaks:
      </P>

      <CodeBlock filename="setup.ts">{API}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "baseUrl",
            type: "string",
            default: "the current origin",
            description: "Root URL of the API.",
          },
          {
            name: "getAuthToken",
            type: "() => string | undefined",
            description: (
              <>
                Bearer token attached to every request. Return <C>undefined</C> when
                nobody is signed in.
              </>
            ),
          },
          {
            name: "getHeaders",
            type: "() => Record<string, string>",
            default: "{}",
            description:
              "Extra headers on every request — a tenant header, a Supabase apikey supplied outside the dialect.",
          },
          {
            name: "dialect",
            type: "ApiDialectInterface",
            default: "jsonLdDialect()",
            description: (
              <>
                How the API spells its URLs, its pages, its filters and its errors.
                See <A href="/docs/resource-view/backends">backends & dialects</A>.
              </>
            ),
          },
        ]}
      />

      <H3>On API Platform</H3>

      <P>
        The JSON-LD <Term id="dialect">dialect</Term> is the default, and it goes
        through the client of <C>jsonld-api-client</C> — middleware, scope header and{" "}
        <A href="/docs/resource-view/openapi-types">typed paths</A> included.
        Configuring that client is enough; <C>configureApi</C> falls back to its
        settings when it is given none of its own.
      </P>

      <CodeBlock filename="setup.ts">{CLIENT}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "baseUrl",
            type: "string",
            default: "the current origin",
            description: "Root URL of the API.",
          },
          {
            name: "getAuthToken",
            type: "() => string | undefined",
            description: (
              <>
                Bearer token attached to every request. Return <C>undefined</C> when
                nobody is signed in.
              </>
            ),
          },
          {
            name: "getScope",
            type: "() => string | undefined",
            description: (
              <>
                Value of the <C>X-Scope</C> header, for an API that segments its
                responses.
              </>
            ),
          },
          {
            name: "mercurePath",
            type: "string",
            description: (
              <>
                Path of the Mercure hub. A resource declaring <C>realtime: true</C>{" "}
                refetches when the hub says the collection changed.
              </>
            ),
          },
        ]}
      />

      <P>
        And the rest of the view configuration, which is about the application rather
        than the API:
      </P>

      <CodeBlock>{`configurePorts({
  appName: "My application",        // page title suffix
  description: "…",                 // page metadata
  appUrl: "https://app.example.com",// absolute links escaping an iframe
  ownsDocumentHead: true,           // false when your router owns <head>
  isDev: import.meta.env.DEV,       // development affordances
  dateLocale: fr,                   // calendar and timeline month names
})`}</CodeBlock>

      <Callout kind="danger" title="ownsDocumentHead on a server-rendered app">
        <P>
          Leave it true in a single-page application, where nothing else writes the
          head. Set it to false when your router declares metadata per route —
          otherwise both write it, the page ends up with two titles, and a crawler
          reads whichever came first.
        </P>
      </Callout>

      <H2 id="check">Check it works</H2>

      <CodeBlock filename="ArticlesPage.tsx">{SMOKE}</CodeBlock>

      <P>You should see a table with a create button and a filter bar. If not:</P>

      <Ul>
        <Li>
          <strong>“Form is needed for build a table”</strong> — the table's columns
          come from the resource&apos;s <C>form</C>. Give the resource a form.
        </Li>
        <Li>
          <strong>“Resource not found”</strong> — the provider was given a{" "}
          <C>resourceId</C> that is not in the registry. Pass the{" "}
          <Term id="resource">resource</Term> object, or register it through{" "}
          <A href="/docs/resource-view/scopes">a scope</A>.
        </Li>
        <Li>
          <strong>An empty list against a working API</strong> — the dialect and the
          API disagree on the envelope. Hydra answers <C>member</C> and{" "}
          <C>totalItems</C>, Strapi <C>{`{ data, meta }`}</C>, Supabase a bare array:
          check the one you configured matches the one that answered.
        </Li>
        <Li>
          <strong>Unstyled markup</strong> — a missing <C>@source</C> line.
        </Li>
      </Ul>

      <H3>Order of setup</H3>
      <Ol>
        <Li>
          <C>configureApi</C> — where the API is, and which dialect it speaks.
        </Li>
        <Li>
          <C>configurePorts</C> — router, metadata, locale.
        </Li>
        <Li>
          <C>createViewResource</C> — your resources, at module scope.
        </Li>
        <Li>Render a view.</Li>
      </Ol>
      <P>
        The first three are module-level singletons, so run them once, before the
        first render — in a file your entry point imports.
      </P>
    </DocArticle>
  )
}

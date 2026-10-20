import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, Li, P, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/form/registry")({
  head: () => ({
    meta: [
      { title: "The form registry — react-data-form" },
      {
        name: "description",
        content:
          "addForm and getForm store forms under an identifier, in the same registry resources use — which is why it has to be a singleton.",
      },
    ],
  }),
  component: Registry,
})

const ADD = `import { addForm, getForm } from "react-data-form"

addForm("block.hero", {
  name: "Hero",
  "@for": ["page-block"],
  inputs: {
    title: { label: "Title", required: true },
    subtitle: { label: "Subtitle" },
  },
})

// Later, anywhere in the application:
const hero = getForm({ type: "page-block" })`

const SHARED = `// ✅ Both halves write into the same registry.
import { addForm } from "react-data-form"
import { createResource } from "resource-registry"

// ❌ Keeping a copy of createResource in your own code gives you a second
//    registry, and searchMetaData stops connecting a resource to its form.`

const LISTING = `import { getForms, getFormLabel, getFormType } from "react-data-form"

// Every registered form
getForms()

// Only those tagged for the page builder
getForms(["page-block"]).map((form) => ({
  type: getFormType(form),   // the @for tag, or the @id
  label: getFormLabel(form), // name, or label.title, or the type
}))`

function Registry() {
  return (
    <DocArticle
      toc={[
        { id: "why", title: "What it is for" },
        { id: "api", title: "addForm and getForm" },
        { id: "listing", title: "Listing what is registered" },
        { id: "singleton", title: "One registry, or none at all" },
      ]}
    >
      <P>
        Most forms are written where they are used and never need a name. Some have
        to be found by something that does not know them at compile time — a page
        builder offering block types, or a resource view looking up the form for the
        type it just fetched. That is what the registry is for.
      </P>

      <H2 id="why">What it is for</H2>

      <Ul>
        <Li>
          <strong>The page builder.</strong>{" "}
          <A href="/docs/form/nested">
            <C>FormArrayInputController</C>
          </A>{" "}
          builds its palette by asking the registry for every form tagged with a
          given <C>@for</C>.
        </Li>
        <Li>
          <strong>Resource views.</strong>{" "}
          <A href="/docs/resource-view/resources">react-resource-view</A> stores
          resources in the very same registry, which is how a record's type resolves
          to the form that edits it.
        </Li>
        <Li>
          <strong>Forms that arrive at runtime.</strong> A description fetched from
          an API can be registered on arrival and used like any other.
        </Li>
      </Ul>

      <H2 id="api">addForm and getForm</H2>

      <CodeBlock filename="blocks.ts">{ADD}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "addForm(name, form)",
            type: '(string, FormInterface & { "@for"?: string[] }) => FormInterface',
            description: (
              <>
                Stores the form under <C>name</C>, stamping <C>@id</C> and{" "}
                <C>@type: \"form\"</C> on it.
              </>
            ),
          },
          {
            name: "getForm({ type })",
            type: "({ type: string }) => FormResourceItem | undefined",
            description: (
              <>
                Finds a form whose <C>@for</C> contains <C>type</C>.
              </>
            ),
          },
          {
            name: "getForms(fors?)",
            type: "(string[]?) => FormResourceItem[]",
            description:
              "Every registered form, or those matching one of the given tags.",
          },
          {
            name: "getFormType(form)",
            type: "(FormResourceItem) => string",
            description: (
              <>
                The tag to store on an item so <C>getForm</C> can find this form
                again — the first <C>@for</C>, falling back to the <C>@id</C>.
              </>
            ),
          },
          {
            name: "getFormLabel(form)",
            type: "(FormResourceItem) => string",
            description: "A human-readable name for palettes and block headers.",
          },
          {
            name: "upsertForm / updateForm",
            type: "utilities",
            description:
              "Merge a description into an existing one, for a form assembled from several sources.",
          },
        ]}
      />

      <Callout kind="note" title="@for is a tag, not a type">
        <P>
          Several forms can share a tag: that is what makes a palette a list rather
          than a single entry. <C>getForm</C> returns one of them; <C>getForms</C>{" "}
          returns all of them.
        </P>
      </Callout>

      <H2 id="listing">Listing what is registered</H2>

      <CodeBlock>{LISTING}</CodeBlock>

      <H2 id="singleton">One registry, or none at all</H2>

      <P>
        <C>addForm</C> and <C>createResource</C> write into the <em>same</em> store,
        which lives in{" "}
        <A href="https://github.com/hermez-agency/resource-registry">
          resource-registry
        </A>{" "}
        as a module-level singleton.
      </P>

      <CodeBlock>{SHARED}</CodeBlock>

      <Callout kind="danger" title="Two copies is the failure mode to know">
        <P>
          If <C>resource-registry</C> resolves twice in <C>node_modules</C>, you get
          two stores. Forms registered on one side become invisible from the other,
          and nothing errors — the palette is simply empty, and the lookup simply
          returns undefined.
        </P>
        <P>
          That is why it is a peer dependency, and why you should import{" "}
          <C>createResource</C> from it rather than re-exporting a copy.
        </P>
      </Callout>
    </DocArticle>
  )
}

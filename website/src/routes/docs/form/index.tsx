import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { FormDemo } from "@/components/FormDemo"
import { A, C, H2, Li, P, Ul } from "@/components/prose"
import { DatePickerInputController } from "react-data-form"

export const Route = createFileRoute("/docs/form/")({
  head: () => ({
    meta: [
      { title: "react-data-form — Introduction" },
      {
        name: "description",
        content:
          "A form is an object: fields, labels, an action. The library renders it, holds the state, validates and reports what the API sends back.",
      },
    ],
  }),
  component: FormIntroduction,
})

const FIRST_FORM = `import { DatePickerInputController, FormElement, useForm } from "react-data-form"

function ProfileForm() {
  const formContext = useForm({
    form: {
      label: { title: "My profile" },
      inputs: {
        firstName: { label: "First name", required: true },
        email: { type: "email", label: "Email" },
        birthDate: { label: "Born on", controller: DatePickerInputController },
      },
      onSubmit: (data) => api.patch("/me", data),
    },
  })

  return <FormElement {...formContext} />
}`

const NOT_JSX = `// Nothing about this is JSX, so it can be stored, transformed,
// merged with another description, or generated from an API schema.
const form = {
  inputs: {
    title: { label: "Title", required: true },
    status: { label: "Status", controller: SelectInputController, valueOptions },
  },
}`

function FormIntroduction() {
  return (
    <DocArticle
      toc={[
        { id: "first-form", title: "A first form" },
        { id: "why-data", title: "Why data, not JSX" },
        { id: "boundaries", title: "What it does not do" },
        { id: "next", title: "Where to go next" },
      ]}
    >
      <P>
        <C>react-data-form</C> takes an object describing a form — its fields, their
        labels, what happens on submit — and renders it. It holds the state, runs the
        validators, and puts the violations your API returns back on the fields that
        caused them.
      </P>

      <H2 id="first-form">A first form</H2>

      <P>
        Two imports and one object. <C>useForm</C> builds the form and owns its
        state; <C>FormElement</C> renders the whole thing — header, fields, errors
        and submit button.
      </P>

      <CodeBlock filename="ProfileForm.tsx">{FIRST_FORM}</CodeBlock>

      <Demo label="The form above, running">
        <FormDemo
          form={{
            label: { title: "My profile", submit: "Save" },
            inputs: {
              firstName: { label: "First name", required: true },
              email: { type: "email", label: "Email" },
              birthDate: {
                label: "Born on",
                controller: DatePickerInputController,
              },
            },
          }}
        />
      </Demo>

      <P>
        The payload beside the form is what <C>onSubmit</C> receives. That is the
        whole contract: a description goes in, a plain object comes out.
      </P>

      <H2 id="why-data">Why data, not JSX</H2>

      <P>
        A form written as JSX can only be read by React. A form written as data can
        be stored in a database, merged with another one, filtered by permission, or
        generated from an{" "}
        <A href="/docs/resource-view/openapi-types">OpenAPI schema</A> — and only
        then handed to React.
      </P>

      <CodeBlock>{NOT_JSX}</CodeBlock>

      <P>
        This is also what lets <A href="/docs/resource-view">react-resource-view</A>{" "}
        build a table, an edit screen and a filter bar from the same object: the
        description is the single source, and every screen is a reading of it.
      </P>

      <Callout kind="tip" title="One field, one controller">
        Every field is rendered by a <em>controller</em> — a component receiving{" "}
        <C>{"{ formInput, onChange }"}</C> and nothing else. 34 ship with the
        package, and writing your own takes about ten lines.
      </Callout>

      <H2 id="boundaries">What it does not do</H2>

      <P>
        The library is deliberately narrow. It has no opinion on where your data
        comes from or where it goes:
      </P>

      <Ul>
        <Li>
          <strong>No HTTP client.</strong> <C>onSubmit</C> receives an object; what
          you do with it is yours.
        </Li>
        <Li>
          <strong>No schema library.</strong> A field's <C>validator</C> is a
          function that throws. Zod errors are understood, but nothing forces you to
          use Zod.
        </Li>
        <Li>
          <strong>No router.</strong> A form is a component, not a page.
        </Li>
        <Li>
          <strong>No visual identity.</strong> The components use Tailwind classes
          backed by the shadcn theme variables, so they take your palette rather than
          imposing one.
        </Li>
      </Ul>

      <H2 id="next">Where to go next</H2>

      <div className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
        {[
          {
            to: "/docs/form/installation",
            title: "Installation",
            body: "Install, wire Tailwind, and understand the two peer dependencies.",
          },
          {
            to: "/docs/form/anatomy",
            title: "Anatomy of a form",
            body: "What useForm returns, and the round trip a value makes.",
          },
          {
            to: "/docs/form/controllers",
            title: "Field controllers",
            body: "The whole catalogue, each one running on the page.",
          },
          {
            to: "/docs/form/validation",
            title: "Validation",
            body: "Client-side validators and API Platform violations.",
          },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-xl border border-border p-4 no-underline transition-colors hover:border-form/50 hover:bg-muted/40"
          >
            <p className="flex items-center justify-between font-medium">
              {card.title}
              <ArrowRight className="size-4 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>
    </DocArticle>
  )
}

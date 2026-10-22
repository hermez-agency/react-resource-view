import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { A, C, H2, H3, Li, P, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/form/installation")({
  head: () => ({
    meta: [
      { title: "Installing react-data-form" },
      {
        name: "description",
        content:
          "Install the package, let Tailwind scan its compiled files, and understand why the translation dictionary and the resource registry are peer dependencies.",
      },
    ],
  }),
  component: Installation,
})

const INSTALL = `pnpm add react-data-form react-mini-i18n resource-registry`

const TAILWIND = `@import "tailwindcss";

/* Tailwind only generates the classes it can see, and the library's classes
   live in its compiled files. */
@source "../node_modules/react-data-form/dist";`

const THEME = `/* Only if your application has no shadcn theme of its own. */
@import "react-data-form/styles.css";`

const OWN_THEME = `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.52 0.19 273);
  --primary-foreground: oklch(0.99 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.891 0 0);
  --input: oklch(0.97 0 0);
  --ring: oklch(0.457 0 0);
  --radius: 0.75rem;
  /* …and the rest of the shadcn set. */
}`

const SMOKE_TEST = `import { FormElement, useForm } from "react-data-form"

export function SmokeTest() {
  const formContext = useForm({
    form: { inputs: { hello: { label: "Hello" } } },
  })

  return <FormElement {...formContext} />
}`

function Installation() {
  return (
    <DocArticle
      toc={[
        { id: "install", title: "Install" },
        { id: "styles", title: "Styles" },
        { id: "peers", title: "Why two peer dependencies" },
        { id: "entry-points", title: "Entry points" },
        { id: "check", title: "Check it works" },
      ]}
    >
      <H2 id="install">Install</H2>

      <CodeBlock lang="bash">{INSTALL}</CodeBlock>

      <P>
        <C>react</C> and <C>react-dom</C> — 18.3 or 19 —{" "}
        <A href="https://github.com/hermez-agency/react-mini-i18n">
          react-mini-i18n
        </A>{" "}
        and{" "}
        <A href="https://github.com/hermez-agency/resource-registry">
          resource-registry
        </A>{" "}
        are peer dependencies: your copies are the ones used.
      </P>

      <H2 id="styles">Styles</H2>

      <P>
        The components are written with{" "}
        <A href="https://tailwindcss.com">Tailwind CSS v4</A> classes backed by the
        shadcn theme variables. Two things have to be true for them to look like
        anything.
      </P>

      <H3>1. Tailwind has to see the library</H3>

      <CodeBlock lang="css" filename="app.css">
        {TAILWIND}
      </CodeBlock>

      <P>
        Without the <C>@source</C> line the markup renders with class names Tailwind
        never generated, and the form comes out unstyled.
      </P>

      <H3>2. The theme variables have to exist</H3>

      <P>
        If your application already has a shadcn theme, <strong>do not</strong>{" "}
        import the library's stylesheet — your variables are enough, and the
        components pick your palette up automatically. That is what this site does.
      </P>

      <CodeBlock lang="css">{THEME}</CodeBlock>

      <P>Otherwise, define the variables yourself and the library follows along:</P>

      <CodeBlock lang="css">{OWN_THEME}</CodeBlock>

      <H2 id="peers">Why two peer dependencies</H2>

      <P>
        <C>react-mini-i18n</C> and <C>resource-registry</C> each own a module-level
        singleton: a translation dictionary on one side, a resource registry on the
        other.
      </P>

      <Callout kind="danger" title="Two copies means two registries">
        <P>
          If both your application and the library resolved their own copy in{" "}
          <C>node_modules</C>, you would end up with two dictionaries and two
          registries. Half your translations would look ignored, and a form
          registered on one side would be invisible from the other.
        </P>
      </Callout>

      <P>
        Declaring them as peers is what forces a single copy. It also means you
        should import <C>createResource</C> from <C>resource-registry</C> directly
        rather than keeping a copy of it in your own code.
      </P>

      <H2 id="entry-points">Entry points</H2>

      <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Import</th>
              <th className="px-4 py-2.5 font-medium">Contents</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "react-data-form",
                "Core: useForm, FormElement, every field controller, configuration",
              ],
              [
                "react-data-form/group",
                "Splitting fields into collapsible sections",
              ],
              ["react-data-form/media", "Image editor: cropping and rotation"],
              ["react-data-form/step", "Multi-step forms with navigation"],
              ["react-data-form/styles.css", "The optional neutral theme"],
            ].map(([entry, contents]) => (
              <tr key={entry} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  <code className="font-mono text-[13px]">{entry}</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{contents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        The split is about weight, not taste: the media editor pulls in a cropping
        library and the WYSIWYG field pulls in an editor, so neither belongs in the
        entry point every application imports.
      </P>

      <H2 id="check">Check it works</H2>

      <CodeBlock filename="SmokeTest.tsx">{SMOKE_TEST}</CodeBlock>

      <P>You should see a labelled input and a submit button. If instead you see:</P>

      <Ul>
        <Li>
          <strong>unstyled markup</strong> — the <C>@source</C> line is missing or
          points at the wrong path;
        </Li>
        <Li>
          <strong>black on black</strong> — the theme variables are not defined;
        </Li>
        <Li>
          <strong>nothing at all</strong> — <C>FormElement</C> was given the form
          rather than the context; it takes what <C>useForm</C> returns, spread.
        </Li>
      </Ul>
    </DocArticle>
  )
}

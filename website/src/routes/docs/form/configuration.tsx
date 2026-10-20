import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, H3, Li, P, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/form/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration and i18n — react-data-form" },
      {
        name: "description",
        content:
          "configurePorts for locale, currency and components; setFormConfig for form-wide defaults; react-mini-i18n for labels.",
      },
    ],
  }),
  component: Configuration,
})

const PORTS = `import { configurePorts } from "react-data-form"
import { fr } from "date-fns/locale"

configurePorts({
  // How the date fields parse and format.
  dateLocale: fr,
  // What Intl uses for dates and amounts.
  intlLocale: "fr-FR",
  currency: "EUR",

  components: {
    // How an IRI is rendered once chosen in a dropdown.
    iriLabel: ({ iri }) => <ResourceName iri={iri} />,
    // Brand mark at the centre of the loader.
    logo: MyLogo,
  },
})`

const CONFIG = `import { setFormConfig } from "react-data-form"

setFormConfig({
  defaultForm: {
    label: {
      success: "Saved",
      error: "Some fields need another look",
    },
    components: {
      // Every form in the application, unless it says otherwise.
      formSubmitAction: MySubmitBar,
    },
  },
})`

const I18N = `import { setTranslation, Trans, translate } from "react-mini-i18n"

setTranslation({
  "First name": "Prénom",
  "Save": "Enregistrer",
})

// Labels go through it automatically; your own components can too.
<Trans>First name</Trans>
translate("Save")`

const SSR = `// A singleton is per-process, so configure once, at module scope, on both
// sides — a server render that skipped it would emit US dates the browser then
// disagrees with.
configurePorts({ intlLocale: "fr-FR", currency: "EUR" })`

function Configuration() {
  return (
    <DocArticle
      toc={[
        { id: "ports", title: "configurePorts" },
        { id: "form-config", title: "setFormConfig" },
        { id: "i18n", title: "Translation" },
        { id: "ssr", title: "Server rendering" },
      ]}
    >
      <P>
        The library assumes no backend, no router and no visual identity. Everything
        that would be an assumption goes through a port, injected once at startup —
        and every port has a default, so a form works with no configuration at all.
      </P>

      <H2 id="ports">configurePorts</H2>

      <CodeBlock filename="setup.ts">{PORTS}</CodeBlock>

      <PropsTable
        rows={[
          {
            name: "dateLocale",
            type: "Locale (date-fns)",
            default: "US English",
            description:
              "Parses and formats every date field, and decides the first day of the week.",
          },
          {
            name: "intlLocale",
            type: "string (BCP 47)",
            default: "the runtime's",
            description: "What Intl formats dates, times and amounts with.",
          },
          {
            name: "currency",
            type: "string (ISO 4217)",
            default: `"EUR"`,
            description: (
              <>
                How <C>PriceInputController</C> renders an amount. The stored value
                stays an integer of the smallest unit.
              </>
            ),
          },
          {
            name: "components.iriLabel",
            type: "FC<{ iri?, property? }>",
            default: "the raw identifier",
            description: (
              <>
                Turns <C>/api/authors/4</C> into a name in a dropdown. Configure it
                once and every choice field in the application reads.
              </>
            ),
          },
          {
            name: "components.logo",
            type: "FC",
            default: "nothing",
            description: "Brand mark shown at the centre of the loader.",
          },
        ]}
      />

      <Callout kind="tip" title="It merges">
        <P>
          Calling <C>configurePorts</C> twice merges rather than replaces, down to
          individual components — so a test can override one port without restating
          the rest.
        </P>
      </Callout>

      <H2 id="form-config">setFormConfig</H2>

      <P>
        Ports are about the environment; <C>setFormConfig</C> is about the forms
        themselves. It sets the description every form starts from, so a default
        applied here needs no repetition.
      </P>

      <CodeBlock filename="setup.ts">{CONFIG}</CodeBlock>

      <P>
        It deep-merges into the existing configuration, and the shipped defaults
        already name the standard components — replacing one leaves the others in
        place.
      </P>

      <H2 id="i18n">Translation</H2>

      <P>
        Every label, description and button caption passes through{" "}
        <A href="https://github.com/hermez-agency/react-mini-i18n">
          react-mini-i18n
        </A>
        , so your application and the library translate from one dictionary.
      </P>

      <CodeBlock>{I18N}</CodeBlock>

      <Ul>
        <Li>
          Keys are the source strings, so an untranslated label falls back to itself
          rather than to a missing-key marker.
        </Li>
        <Li>
          The dictionary is a module-level singleton, which is why the package is a
          peer dependency — see <A href="/docs/form/installation">Installation</A>.
        </Li>
      </Ul>

      <H2 id="ssr">Server rendering</H2>

      <P>
        Both the ports and the dictionary are process-level singletons, so a
        server-rendered application has to configure them on the server as well as in
        the browser. Do it at module scope, in a file both entry points import.
      </P>

      <CodeBlock>{SSR}</CodeBlock>

      <H3>This site does exactly that</H3>
      <P>
        It runs on TanStack Start, configures both libraries once from a module
        imported by the root route, and renders the prose on the server while
        mounting the live examples in the browser.
      </P>
    </DocArticle>
  )
}

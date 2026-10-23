import { createViewResource } from "react-resource-view"
import { Languages } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"

const i18nResource = createViewResource("i18n", {
  name: "i18n",
  icon: Languages,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Translations"
          intro="The library's messages are written in English and looked up by that English text. Its dictionary is yours to fill, and a test tells you which keys are still missing."
        />

        <Section
          title="The reference keys"
          intro="react-resource-view/i18n exports messages: one entry per message the library shows, each keyed on its English text."
        >
          <CodeBlock>{reference}</CodeBlock>
          <p>
            A key with no entry in your dictionary is shown in English, so an
            untranslated message does not fail: it just stays in the wrong language.
            Keep the <code>{"{{name}}"}</code> placeholders of a message when you
            translate it.
          </p>
        </Section>

        <Section
          title="Merging with your keys"
          intro="The library's translations and your own go in one dictionary, handed to react-mini-i18n."
        >
          <CodeBlock>{merge}</CodeBlock>
          <p>
            The library does not ship a translation: the <code>fr</code> above is
            yours, and so are the keys your application adds to it.
          </p>
        </Section>

        <Section
          title="Checking the dictionary"
          intro="missingKeys lists the keys a dictionary leaves untranslated: the ones without an entry, and the empty ones."
        >
          <CodeBlock>{check}</CodeBlock>
          <p>
            Run it in your test suite, so a release of the library that adds a
            message fails until the dictionary translates it.
          </p>
        </Section>
      </>
    ),
  },
})

const reference = `import { messages } from "react-resource-view/i18n"

messages["Saved"] // "Saved", the English reference
Object.keys(messages) // every key the library translates`

const merge = `import { setTranslation } from "react-mini-i18n"

// Your translations of the library's keys, then your own keys
const fr = {
  Saved: "Enregistré",
  Cancel: "Annuler",
  "Welcome back": "Bon retour",
}

setTranslation(fr)`

const check = `import { missingKeys } from "react-resource-view/i18n"
import { expect, it } from "vitest"
import { fr } from "./messages"

it("translates every message of the library", () => {
  expect(missingKeys(fr)).toEqual([])
})`

export default i18nResource

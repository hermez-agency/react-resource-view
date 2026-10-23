import { ActionList } from "react-data-form"
import { createViewResource, ViewResourceContextProvider } from "react-resource-view"
import { Settings } from "lucide-react"
import { localRepository } from "@/api/localRepository"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

const stored = localRepository({ path: "docs_settings" })

/**
 * The profile of the demo: one record, kept in the browser. `get` reads the
 * first (and only) one — a real API would answer `GET /api/settings/me`.
 */
export const profileSettingsResource = createViewResource("docs_settings", {
  name: "Settings",
  storage: "local",
  singleton: {
    get: async () => {
      const { data } = await stored.getCollection()
      return (data as { member?: object[] }).member?.[0]
    },
    defaultData: { language: "en", digest: "weekly" },
  },
  form: {
    inputs: {
      language: { label: "Language" },
      digest: { label: "E-mail digest" },
    },
  },
})

const settingsResource = createViewResource("settings", {
  name: "Settings",
  icon: Settings,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Settings"
          intro="A resource with a single record — settings, a profile, a private note. No list: the menu opens the record, and creates it when it does not exist yet."
        />

        <Section
          title="Declaring a singleton"
          intro="singleton names the record with an id, or fetches it with a function."
        >
          <CodeBlock>{declaration}</CodeBlock>
          <p>
            <code>get</code> receives the view context and resolves to the record, or
            to <code>undefined</code> / <code>null</code> when there is none. With{" "}
            <code>id</code>, the record is read at <code>{"{path}/{id}"}</code> and a
            404 means the same thing.
          </p>
        </Section>

        <Section
          title="What the menu does"
          intro="The entry of a singleton opens the record itself, not a list."
        >
          <ul>
            <li>
              <code>update</code> by default, <code>read</code> with{" "}
              <code>singleton: {'{ action: "read" }'}</code>. The URL carries no
              identifier: <code>/admin/settings/update</code>.
            </li>
            <li>
              If the record does not exist, the creation form is drawn instead,
              filled with <code>defaultData</code>.
            </li>
            <li>
              Saving stays on the page — <code>afterSave</code> defaults to{" "}
              <code>"stay"</code>. Once the record is created, the same page edits
              it.
            </li>
          </ul>
          <p>
            Saving an existing record goes through <code>updateItem</code>: when{" "}
            <code>get</code> reads a path of its own, give the resource a{" "}
            <code>repository.updateItem</code> that writes to that same path.
          </p>
          <LiveExample label="no record yet: the creation form, pre-filled">
            <ViewResourceContextProvider
              resource={profileSettingsResource}
              resourceAction={ActionList.update}
              scope="docs"
            />
          </LiveExample>
        </Section>
      </>
    ),
  },
})

const declaration = `// GET /api/settings/me — the record of the signed-in user
export const settings = createViewResource<Settings>("settings", {
  name: "Settings",
  path: "/api/settings",
  singleton: {
    get: () => api.get("/api/settings/me"),
    defaultData: { language: "en" }, // the creation form starts with it
  },
  repository: {
    updateItem: (item) => api.put("/api/settings/me", item),
  },
  form: { inputs: SETTINGS_FIELDS },
})

// Or by identifier: GET /api/profiles/me
createViewResource("profile", {
  path: "/api/profiles",
  singleton: { id: "me", action: "read" },
})

// The menu opens it directly
export const admin = { name: "admin", resources: [settings], menu: "auto" }`

export default settingsResource

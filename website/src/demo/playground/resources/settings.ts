import { Settings } from "lucide-react"
import { SelectInputController } from "react-data-form"
import { createViewResource } from "react-resource-view"
import { readAdminRows, SETTINGS_ID } from "@/demo/playground/adminData"

/** What the roastery's back office remembers about its reader. */
export interface RoasterySettings {
  "@id": string
  "@type": string
  id: string
  language: string
  digest: string
}

/**
 * One record, no list: the sidebar opens it directly. Nothing is seeded, so the
 * first visit draws the creation form — already filled in — and saving it turns
 * the same page into the editing form. A real API would answer
 * `GET /api/settings/me` in `get`.
 */
export const settingsResource = createViewResource<RoasterySettings>(SETTINGS_ID, {
  name: "Settings",
  icon: Settings,
  storage: "local",
  description: "Your preferences. A single record: there is no list to go through.",
  singleton: {
    get: async () => readAdminRows<RoasterySettings>(SETTINGS_ID)[0],
    defaultData: { language: "en", digest: "weekly" },
  },
  form: {
    inputs: {
      language: {
        label: "Language",
        controller: SelectInputController,
        valueOptions: [
          { value: "en", label: "English" },
          { value: "fr", label: "Français" },
        ],
      },
      digest: {
        label: "E-mail digest",
        controller: SelectInputController,
        valueOptions: [
          { value: "daily", label: "Every day" },
          { value: "weekly", label: "Every week" },
          { value: "never", label: "Never" },
        ],
      },
    },
  },
})

import { Database } from "lucide-react"
import { TextAreaInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"

/**
 * Parchments — written by `react-resource-view generate --hydra` from
 * /parchments in the Hydra documentation. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface Parchment {
  "@id": string
  title: string
  description: string
}

export const parchments = createViewResource<Parchment>("parchments", {
  name: "Parchments",
  icon: Database,
  path: "/parchments",
  permissions: { create: false },
  titleField: "title",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      description: { label: "Description", required: true, controller: TextAreaInputController },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

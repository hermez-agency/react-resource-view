import { Database } from "lucide-react"
import { DatePickerInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"

/**
 * Audit log — written by `react-resource-view generate resources` from
 * /audit_log in the OpenAPI schema. It is yours now: nothing rewrites it
 * unless the command is run again with --force.
 */
export interface AuditLog {
  id: number
  event?: string
  at?: string
}

export const auditLog = createViewResource<AuditLog>("audit_log", {
  name: "Audit log",
  icon: Database,
  path: "/audit_log",
  permissions: "readonly",
  form: {
    inputs: {
      event: { label: "Event" },
      at: { label: "At", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      layouts: [layout.table()],
    },
  },
})

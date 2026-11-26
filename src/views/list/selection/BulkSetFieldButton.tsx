import { useState } from "react"
import { toast } from "sonner"
import { Trans, translate } from "react-mini-i18n"
import { Button } from "@/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { columnsFromForm } from "@/definition/boardColumns"
import { useResourceMutation } from "@/hook/useResourceMutation"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { permissionResource } from "@/utils/permissionResource"
import type { SetFieldBulkAction } from "@/ResourceDefinition"
import type { RowInterface } from "@/ViewResource"

export function isSetFieldAction(action: unknown): action is SetFieldBulkAction {
  return typeof action === "object" && action !== null && "field" in action
}

/**
 * The `{ field }` bulk action: a popover listing the options of the field's
 * select input, and a PATCH per selected record once one is picked. Records
 * `permissions.update` refuses are left alone, and the outcome is said.
 */
export function BulkSetFieldButton({
  action,
  rows,
  onDone,
}: {
  action: SetFieldBulkAction
  rows: RowInterface[]
  onDone: () => void
}) {
  const currentResource = useCurrentViewResourceContext()
  const { resource } = currentResource
  const mutation = useResourceMutation(resource)
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const field = String(action.field)
  const options = columnsFromForm(currentResource.view.form, field)
  if (!options) return null

  const input = (
    currentResource.view.form?.inputs as Record<string, any> | undefined
  )?.[field]
  const label = action.label ?? input?.label ?? field

  const apply = async (value: unknown) => {
    setIsOpen(false)
    setIsRunning(true)
    const context = { viewResourceContext: currentResource.viewResource }
    const allowed = await Promise.all(
      rows.map((row) =>
        permissionResource(resource, "update", {
          item: row.data,
          context: currentResource.viewResource,
        })
      )
    )
    const editable = rows.filter((_, index) => allowed[index])
    let updated = 0
    let failed = rows.length - editable.length

    // One PATCH after the other, so the API sees them in the order shown.
    for (const row of editable) {
      try {
        await mutation.update(
          { ...row.data, [field]: value },
          { context, notify: false }
        )
        updated++
      } catch (e) {
        console.error(e)
        failed++
      }
    }

    setIsRunning(false)
    onDone()
    if (!failed) {
      toast.success(translate("Updated"), {
        description: translate("{{count}} records updated", {
          count: String(updated),
        }),
      })
    } else {
      toast.error(
        translate("{{updated}} updated, {{failed}} failed", {
          updated: String(updated),
          failed: String(failed),
        })
      )
    }
    currentResource.fetchData()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={<Button size="sm" variant="secondary" disabled={isRunning} />}
      >
        {action.icon && <action.icon />}
        <Trans params={{ field: String(label) }}>{"Set {{field}}…"}</Trans>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-56 gap-1 p-2">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => apply(option.value)}
          >
            <Trans>{option.label}</Trans>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

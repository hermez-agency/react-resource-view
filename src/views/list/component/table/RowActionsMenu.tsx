import { useState } from "react"
import { Ellipsis } from "lucide-react"
import { translate } from "react-mini-i18n"
import { Button } from "@/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import ResourceViewButton, { ResourceButtonProps } from "@/action/ResourceViewButton"
import { useRowActions } from "@/action/ListResourceViewButton"
import { useAllowedActions } from "@/utils/permissionResource"

/**
 * The actions of a row, behind one "…" button — for a phone, where the buttons
 * drawn side by side would take the width of the columns.
 *
 * Each action is still a link of its own, so the menu opens and closes the same
 * way on a keyboard, and a click on one of them closes it.
 */
export function RowActionsMenu({ data }: { data: ResourceButtonProps["data"] }) {
  const [open, setOpen] = useState(false)
  const actions = useAllowedActions(useRowActions(), data)

  if (!actions.length) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="icon"
            aria-label={translate("Actions")}
            data-slot="row-actions-trigger"
          />
        }
      >
        <Ellipsis />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto min-w-40 gap-1 p-2"
        onClick={() => setOpen(false)}
      >
        <div className="flex flex-col gap-1 [&>*]:w-full [&>*]:justify-start">
          {actions.map((action) => (
            <ResourceViewButton key={action} action={action} data={data} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

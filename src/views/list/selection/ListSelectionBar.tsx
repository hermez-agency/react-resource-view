import { ReactNode, useState } from "react"
import { toast } from "sonner"
import { Trans, translate } from "react-mini-i18n"
import { Trash2, X } from "lucide-react"
import { IdAbleInterface } from "jsonld-item"
import { Button } from "@/ui/button"
import { cn } from "@/ui/cn"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { removeRecord, useResourceMutation } from "@/hook/useResourceMutation"
import { permissionResource } from "@/utils/permissionResource"
import type { BulkActionInterface, RowInterface } from "@/ViewResource"
import {
  BulkSetFieldButton,
  isSetFieldAction,
} from "@/views/list/selection/BulkSetFieldButton"

export interface ListSelectionBarProps {
  /** Drawn after the count, before the bulk actions — the board's "Move to…". */
  children?: ReactNode
}

/**
 * The bar that comes up as soon as a record of the list is selected: how many
 * there are, the list's `bulkActions`, and a way out.
 */
export function ListSelectionBar({ children }: ListSelectionBarProps) {
  const currentResource = useCurrentViewResourceContext()
  const { selection } = useListViewContext()
  const bulkActions = currentResource.view.bulkActions ?? []
  const [isRunning, setIsRunning] = useState(false)
  // Handed to the bulk actions, so what they write is drawn at once too.
  const mutation = useResourceMutation(currentResource.resource)

  const count = selection?.selected.length ?? 0
  if (!selection || !count) return null

  const selectedRows = selection.rowsOf(selection.selected)

  const runAction = async (action: BulkActionInterface) => {
    setIsRunning(true)
    try {
      await action.onAction(
        selectedRows.map((row) => row.data),
        mutation
      )
      selection.clear()
    } catch (e) {
      console.error(e)
      toast(translate("An error occurred"))
    } finally {
      setIsRunning(false)
      currentResource.fetchData()
    }
  }

  return (
    <div
      role="toolbar"
      aria-label={translate("Selected records")}
      className={cn(
        "fixed inset-x-0 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-3xl border border-border bg-popover p-2 pl-4 text-sm text-popover-foreground shadow-lg",
        // Above a phone's bottom navigation — `AdminLayout` draws one there —
        // and within reach of the thumb; near the edge on a wider screen.
        "bottom-24 md:bottom-4"
      )}
    >
      <p className="font-medium tabular-nums" aria-live="polite">
        <Trans params={{ count: String(count) }}>{"{{count}} selected"}</Trans>
      </p>

      {children}

      {bulkActions.map((action) =>
        action === "delete" ? (
          <BulkDeleteButton
            key="delete"
            rows={selectedRows}
            disabled={isRunning}
            onDone={selection.clear}
          />
        ) : isSetFieldAction(action) ? (
          <BulkSetFieldButton
            key={`set:${String(action.field)}`}
            action={action}
            rows={selectedRows}
            onDone={selection.clear}
          />
        ) : (
          <Button
            key={action.label}
            size="sm"
            variant="secondary"
            disabled={isRunning}
            onClick={() => runAction(action)}
          >
            {action.icon && <action.icon />}
            <Trans>{action.label}</Trans>
          </Button>
        )
      )}

      <Button size="sm" variant="ghost" onClick={selection.clear}>
        <X />
        <Trans>Deselect all</Trans>
      </Button>
    </div>
  )
}

/**
 * The `"delete"` bulk action: a confirmation, then one deletion per record —
 * those `permissions.delete` refuses are left alone, and said so.
 */
function BulkDeleteButton({
  rows,
  disabled,
  onDone,
}: {
  rows: RowInterface[]
  disabled: boolean
  onDone: () => void
}) {
  const currentResource = useCurrentViewResourceContext()
  const { resource } = currentResource
  const [isOpen, setIsOpen] = useState(false)

  // A resource that deletes nothing offers no button to do it with.
  if (resource.permissions?.delete === false) return null

  const confirm = async () => {
    setIsOpen(false)
    const context = { viewResourceContext: currentResource.viewResource }
    const allowed = await Promise.all(
      rows.map((row) =>
        permissionResource(resource, "delete", {
          item: row.data,
          context: currentResource.viewResource,
        })
      )
    )
    const deleting = rows.filter((_, index) => allowed[index])
    const refused = rows.length - deleting.length

    const results = await Promise.allSettled(
      deleting.map((row) =>
        removeRecord(resource, row.data as IdAbleInterface, { context })
      )
    )
    results.forEach((result) => {
      if (result.status === "rejected") console.error(result.reason)
    })
    const rejected = results.filter((result) => result.status === "rejected").length
    const failed = rejected + refused
    const deleted = deleting.length - rejected

    onDone()
    if (!failed) {
      toast.success(translate("Deleted"), {
        description: translate("{{count}} records deleted", {
          count: String(deleted),
        }),
      })
    } else {
      toast.error(
        translate("{{deleted}} deleted, {{failed}} could not be deleted", {
          deleted: String(deleted),
          failed: String(failed),
        })
      )
    }
    currentResource.fetchData()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="sm"
        variant="destructive"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 />
        <Trans>Delete</Trans>
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans params={{ count: String(rows.length) }}>
              {"Delete {{count}} records?"}
            </Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>This cannot be undone.</Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirm}>
            <Trans>Delete</Trans>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

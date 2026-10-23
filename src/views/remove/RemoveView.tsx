import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { Trans, translate } from "react-mini-i18n"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/ui/button"
import { IdAbleInterface } from "jsonld-item"
import { CardContent, CardDescription, CardHeader } from "@/ui/card"
import { isOptimistic, removeRecord } from "@/hook/useResourceMutation"
import { useOverlay } from "@/action/overlayContext"
import { useNavigate } from "@/ports"
import { generateLink } from "@/routes/routes"
import { ActionList } from "react-data-form"
import { LoadError } from "@/components/LoadError"

export default function RemoveViewComponent() {
  const currentResourceContext = useCurrentViewResourceContext()
  const overlay = useOverlay()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState(false)

  // A record that could not be loaded is not confirmed as if it were there:
  // the question would ask about nothing, and "Continue" would send a DELETE
  // for it.
  if (currentResourceContext.error && !currentResourceContext.data) {
    return <LoadError />
  }
  if (!currentResourceContext.data) return null

  return (
    <CardContent>
      {/* No title of its own: the view is already named by whatever frames
          it — the dialog it opens in, or the heading an application draws
          above a screen — and a second "Delete?" under "Delete a user" says
          the same thing twice. What is left is the one thing the name does
          not carry: that there is no way back. */}
      <CardHeader>
        <CardDescription>
          <Trans>This cannot be undone.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent className={"flex gap-5 mt-5"}>
        {/* Not a dialog's own close button: that one needs a dialog around
            it, and on a page of its own there is none. A frame is closed
            through its overlay; a page goes back to the list. */}
        <Button
          variant="outline"
          onClick={() => {
            if (overlay) {
              overlay.close()
              return
            }
            navigate({
              to: generateLink({
                resourceId: currentResourceContext.resource?.["@id"] as string,
                resourceAction: ActionList.list,
                scope: currentResourceContext.resource?.scope,
              }),
            })
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="destructive"
          disabled={removing}
          onClick={async () => {
            setRemoving(true)
            const { resource } = currentResourceContext
            const removal = removeRecord(
              resource,
              currentResourceContext.data as IdAbleInterface,
              {
                context: {
                  viewResourceContext: currentResourceContext.viewResource,
                },
              }
            )
            // The row is already gone from the list: the confirmation has
            // nothing left to ask. If the API refuses, the row comes back and
            // the toast says why.
            const optimistic = isOptimistic(resource, "delete")
            if (optimistic) overlay?.close()
            try {
              await removal
              // Waited for: the frame goes once the API has said yes.
              if (!optimistic) overlay?.close()
              toast.success(translate("Deleted"), {
                description: translate("The item has been removed"),
              })
            } catch {
              // Still there: the confirmation stays, and can be tried again.
              setRemoving(false)
              toast.error(translate("The item could not be removed"))
            }
          }}
        >
          <Trans>Continue</Trans>
        </Button>
      </CardContent>
    </CardContent>
  )
}

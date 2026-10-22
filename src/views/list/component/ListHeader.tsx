import { Trans } from "react-mini-i18n"
import { ActionList } from "react-data-form"
import ResourceViewButton from "@/action/ResourceViewButton"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ChangeViewVariant from "@/views/list/component/ChangeViewOptionComponent"
import { ExportButton } from "@/views/list/component/ExportButton"

/**
 * The header of a list: what the collection is, and what can be done with it.
 *
 * One line holds the three answers a list owes its reader — which resource is
 * on screen, in which layout, and how to add to it — instead of the stack of
 * loose controls it used to be. The resource's `icon` is what makes it read as
 * a heading rather than a toolbar: the same mark the menu and the tabs already
 * use, so a reader arriving from the navigation lands on something they
 * recognise.
 *
 * The filters are deliberately left out: they are a row of their own, below,
 * and they scroll.
 */
export function ListHeader() {
  const currentResource = useCurrentViewResourceContext()
  const view = currentResource.view
  // The resource's icon, not the view's: a list with layout variants has the
  // icon of whichever variant is on screen — the table, the calendar — merged
  // into its view, and that is the icon of the layout, not of the collection.
  const Icon = currentResource.resource?.icon

  // A nested list — a sub-view tab, a resource embedded in another view — is
  // already introduced by whatever contains it, which writes its name and its
  // description. Saying it a second time here would only say it twice.
  const introduced = !currentResource.parentResource && Boolean(view?.title)

  return (
    <div
      data-slot="list-header"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border pb-4"
    >
      {introduced && (
        // `flex-1` next to `min-w-0`: what gives way when the line is full is
        // the text, not the controls. Without it a long description takes its
        // whole natural width and pushes whatever follows onto the line below
        // — which is how the create button ended up alone under the tabs.
        // Aligned on the title rather than centred on the block: a
        // description of two lines on a phone took the icon down to its
        // middle.
        <div
          data-slot="list-header-title"
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          {Icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="fc truncate text-base font-semibold tracking-tight">
              <Trans>{view.title}</Trans>
            </h2>
            {view.description && (
              <p className="fc text-sm text-muted-foreground">
                <Trans>{view.description}</Trans>
              </p>
            )}
          </div>
        </div>
      )}

      {/* The layout switcher and the actions are one bar, not three loose
          controls: when the width runs out it is the whole bar that goes to the
          next line, instead of the create button alone drifting under the tabs.
          `md:justify-end` keeps it on the side it was already on; on a phone it
          takes the full width and starts from the left, like the rest of the
          page. */}
      <div
        data-slot="list-header-controls"
        className="flex w-full flex-wrap items-center gap-2 md:ms-auto md:w-auto md:justify-end"
      >
        <ChangeViewVariant />
        <ExportButton />
        <ResourceViewButton action={ActionList.create} />
      </div>
    </div>
  )
}

export default ListHeader

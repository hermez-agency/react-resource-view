import { useEffect } from "react"
import { ActionList } from "react-data-form"
import { Trans } from "react-mini-i18n"
import { Link, useNavigate } from "@/ports"
import { useScopeContext } from "@/scope/Scope"
import { useIsActiveMenuEntry } from "@/admin/useIsActiveMenuEntry"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ResourceViewButton from "@/action/ResourceViewButton"
import { generateLinkByResource } from "@/routes/routes"
import { usePermission } from "@/utils/permissionResource"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { Button } from "@/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs"
import { ArrowLeft } from "lucide-react"

/**
 * What the page is about, read off the current view: the record on screen when
 * there is one — its name, the action and its identifier — and the view's own
 * name otherwise. Shared by the page header and the top bar's breadcrumb, so
 * the two never name the same page differently.
 */
export function useAdminPageTitle() {
  const currentResource = useCurrentViewResourceContext()
  const action = currentResource.resourceAction
  const viewName = currentResource.resource?.views?.[action]?.title
  // A record page only: a `read` with no id is a page of its own — a
  // documentation page, an overview — and its data is not a record.
  const record = currentResource.id
    ? (currentResource.data as RecordOfAny | undefined)
    : undefined
  const recordTitle = getRecordTitle(record, currentResource.view?.titleField)
  const recordId = record
    ? getIdFromObject(record, true, currentResource.resource)
    : undefined

  return { viewName, record, recordTitle, recordId }
}

/**
 * Page header of the admin layout, for every view but the list (which writes
 * its own, via `ListHeader`): a way back to the list, a title naming the record
 * on screen — "Ada Lovelace", under "Edit a user · #1" — and the actions that
 * still make sense from there. When the current page belongs to a menu entry
 * marked `subNavigation`, the tabs to its sibling pages follow.
 *
 * A view overrides the title with `components.title`, the actions with
 * `components.actions`, or the whole header with `components.navigation`.
 */
export function AdminHeader() {
  const currentResource = useCurrentViewResourceContext()
  const action = currentResource.resourceAction
  const resource = currentResource.resource
  const titleIsWrittenByTheView = action === ActionList.list
  const { viewName, record, recordTitle, recordId } = useAdminPageTitle()
  const navigate = useNavigate()

  const listLink = resource
    ? generateLinkByResource({ resource, resourceAction: ActionList.list })
    : undefined

  // The record on screen deleted from the header's own button: there is
  // nothing left to show here, so the page goes back to where it came from.
  useEffect(() => {
    if (!resource || !record || !listLink) return
    const id = getIdFromObject(record, false, resource)
    const sub = resource.onChange.subscribe((event) => {
      if (event.action !== ActionList.delete) return
      if (getIdFromObject(event.data, false, resource) !== id) return
      navigate({ to: listLink })
    })
    return () => sub.unsubscribe()
  }, [resource, record, listLink, navigate])

  const canList = usePermission(ActionList.list, undefined, resource)
  const components = currentResource.view?.components

  if (components?.navigation) {
    const Navigation = components.navigation
    return (
      <>
        <Navigation />
        <SubNavigation className="mb-5" />
      </>
    )
  }

  // A list writes its own title: all that is left here is the way back out of
  // a nested one.
  if (titleIsWrittenByTheView) {
    return (
      <header className="w-full">
        {currentResource.parentResource && <BackButton className="mb-5" />}
        <SubNavigation className="mb-5" />
      </header>
    )
  }

  // Back to the list for a record, or for a form creating one; a page with
  // no record behind it has no list to go back to.
  const backToList =
    !currentResource.parentResource &&
    listLink &&
    (record || action === ActionList.create) &&
    canList

  // A record's name is data, not a string of the interface: only the view's
  // own name goes through the translations.
  const title = recordTitle ?? (viewName && <Trans>{viewName}</Trans>)
  // The action is only worth a line of its own once the title is the record's
  // name; otherwise it already is the title.
  const subtitleAction = recordTitle ? viewName : undefined

  const Title = components?.title
  const Actions = components?.actions

  return (
    <header data-slot="admin-header" className="w-full">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-border pb-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {currentResource.parentResource && <BackButton />}

          <div className="min-w-0">
            {backToList && (
              <Link
                to={listLink}
                className="mb-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                <Trans>{resource.name}</Trans>
              </Link>
            )}

            {Title ? (
              <Title />
            ) : (
              <h2 className="fc truncate text-2xl font-semibold tracking-tight">
                {title}
              </h2>
            )}

            {(subtitleAction || recordId) && (
              <p className="fc mt-1 text-sm text-muted-foreground">
                {subtitleAction && <Trans>{subtitleAction}</Trans>}
                {subtitleAction && recordId && " · "}
                {recordId && `#${recordId}`}
              </p>
            )}
          </div>
        </div>

        {Actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <Actions />
          </div>
        ) : (
          record && <RecordActions record={record} />
        )}
      </div>

      <SubNavigation className="mt-5" />
    </header>
  )
}

/**
 * What can still be done to the record on screen, besides what the page is
 * already doing: edit it from its read page, delete it from either. Each
 * button checks the resource's permissions itself, and renders nothing when
 * the action is not allowed.
 */
function RecordActions({ record }: { record: RecordOfAny }) {
  const action = useCurrentViewResourceContext().resourceAction
  const actions = (
    {
      [ActionList.read]: [ActionList.update, ActionList.delete],
      [ActionList.update]: [ActionList.delete],
    } as Partial<Record<ActionList, ActionList[]>>
  )[action]

  if (!actions) return null

  return (
    <div
      data-slot="admin-header-actions"
      className="flex w-full flex-wrap items-center gap-2 md:w-auto"
    >
      {actions.map((recordAction) => (
        <ResourceViewButton key={recordAction} action={recordAction} data={record} />
      ))}
    </div>
  )
}

function BackButton({ className }: { className?: string }) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className={className}
      onClick={() => window.history.back()}
    >
      <ArrowLeft />
    </Button>
  )
}

function SubNavigation({ className }: { className: string }) {
  const menu = useScopeContext()?.scope?.menu ?? []
  const isActive = useIsActiveMenuEntry()

  const parent = menu.find((item) => item.items?.some(isActive))

  if (!parent?.subNavigation) return null

  const items = parent.items?.filter((item) => !item.hidden) ?? []
  if (items.length === 0) return null

  const activeValue = items.find(isActive)?.href ?? items[0]?.href

  return (
    <Tabs value={activeValue} className={className}>
      <TabsList variant="default">
        {items.map((item) => (
          <TabsTrigger
            key={item.name}
            value={item.href ?? item.name}
            render={
              <Link to={item.href || "/"}>
                {item.icon && <item.icon />}
                {item.name}
              </Link>
            }
          />
        ))}
      </TabsList>
    </Tabs>
  )
}

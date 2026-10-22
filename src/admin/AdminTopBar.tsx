import { ReactNode } from "react"
import { ActionList } from "react-data-form"
import { Trans } from "react-mini-i18n"
import { ChevronRight } from "lucide-react"
import { Link } from "@/ports"
import { SidebarTrigger } from "@/ui/sidebar"
import { useIsMobile } from "@/internal/browser/useIsMobile"
import { useScopeContext } from "@/scope/Scope"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useAdminPageTitle } from "@/admin/AdminHeader"
import { generateLinkByResource } from "@/routes/routes"
import { usePermission } from "@/utils/permissionResource"

/**
 * Top bar of the admin layout: the sidebar toggle (or the logo, in mobile,
 * where the sidebar is a drawer instead), the breadcrumb to the page on
 * screen, and whatever the host application wants at the other end — a search
 * field, notifications, a user menu.
 */
export function AdminTopBar({ logo, end }: { logo?: ReactNode; end?: ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      {isMobile ? logo : <SidebarTrigger className="-ml-1" />}
      <AdminBreadcrumb />
      {end && <div className="ml-auto flex shrink-0 items-center gap-1">{end}</div>}
    </header>
  )
}

/**
 * Where the page on screen sits: the scope's `label`, the resource, and the
 * record or the form — "Roastery admin › Users › Ada Lovelace". Built from the
 * current view alone, so every screen of a scope gets one without declaring
 * it. The resource links back to its list whenever it is not the page itself.
 */
export function AdminBreadcrumb() {
  const scopeLabel = useScopeContext()?.scope?.label
  const currentResource = useCurrentViewResourceContext()
  const resource = currentResource.resource
  const action = currentResource.resourceAction
  const { viewName, record, recordTitle, recordId } = useAdminPageTitle()
  const canList = usePermission(ActionList.list, undefined, resource)

  if (!resource) return null

  // The page below the resource: the record when there is one, the form when
  // it creates one. A list, or a page of its own, is the resource itself.
  // A record's name is data, not a string of the interface: it is not
  // translated.
  const page = record ? (
    (recordTitle ?? (recordId ? `#${recordId}` : <Trans>{viewName}</Trans>))
  ) : action === ActionList.create ? (
    <Trans>{viewName}</Trans>
  ) : undefined

  const linksToList =
    Boolean(page) &&
    !currentResource.parentResource &&
    canList

  const current = "block truncate font-medium text-foreground"

  return (
    // Cut at the room the bar gives it: its first steps never shrink, and
    // they ran under whatever the bar's end holds.
    <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {scopeLabel && (
          <li className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Trans>{scopeLabel}</Trans>
            <ChevronRight className="size-3.5" />
          </li>
        )}
        <li className={page ? "flex shrink-0 items-center gap-1.5" : "min-w-0"}>
          {linksToList ? (
            <Link
              to={generateLinkByResource({
                resource,
                resourceAction: ActionList.list,
              })}
              className="transition-colors hover:text-foreground"
            >
              <Trans>{resource.name}</Trans>
            </Link>
          ) : (
            <span
              className={page ? undefined : current}
              aria-current={page ? undefined : "page"}
            >
              <Trans>{resource.name}</Trans>
            </span>
          )}
          {page && <ChevronRight className="size-3.5" />}
        </li>
        {page && (
          <li className="min-w-0">
            <span className={current} aria-current="page">
              {page}
            </span>
          </li>
        )}
      </ol>
    </nav>
  )
}

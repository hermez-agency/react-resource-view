import { ReactNode } from "react"
import { buttonVariants } from "@/ui/button"
import { ActionList } from "react-data-form"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { usePermission } from "@/utils/permissionResource"
import { Trans } from "react-mini-i18n"
import { Link } from "@/ports"
import { Edit, Eye, Plus, Trash } from "lucide-react"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { ViewResourceContextParams } from "@/ViewResourceContext"
import { useQuota } from "@/hook/useQuota"
import type { Action } from "@/ResourceDefinition"
import { useViewLink } from "@/open/childViewRoute"
import { cn } from "@/ui/cn"

export interface ResourceButtonProps extends ViewResourceContextParams {
  /** `"update"`, or `ActionList.update`. */
  action: Action
  label?: string | ReactNode
  children?: ReactNode
}

const ACTION_ICONS = {
  [ActionList.create]: Plus,
  [ActionList.read]: Eye,
  [ActionList.list]: Eye,
  [ActionList.update]: Edit,
  [ActionList.delete]: Trash,
} as const

/**
 * A link to an action of a resource — styled as a button unless `children`
 * says what to draw.
 *
 * Where the view opens is the view's own `open`: on its page, or in a frame
 * over the routed view and written into its URL. The button decides nothing
 * else — the route draws the frame, and closes it once the record is saved.
 */
export default function ResourceViewButton({
  action,
  data,
  resource: resource,
  label,
  id,
  children,
  defaultData,
}: ResourceButtonProps) {
  const currentResourceContext = useCurrentViewResourceContext()
  const currentAction = (action ??
    currentResourceContext.resourceAction) as ActionList

  const currentResource = resource ?? currentResourceContext.resource
  const view = currentResource?.views?.[currentAction]

  // A quota only applies to creation. Its `get` may count synchronously — the
  // rows already loaded — or ask the API. The resource's own quota wins;
  // failing that, the one injected at runtime through the context is used.
  const quotaConfig =
    currentAction === ActionList.create
      ? (currentResource.quota ?? currentResourceContext?.quota)
      : undefined
  const { quota, isReached } = useQuota(quotaConfig, currentResourceContext)

  const currentId = id ?? (data ? getIdFromObject(data) : undefined)
  // Inherit defaultData from the context — typically set by a sub-resource's
  // onInitViewResource — so the created item is tied to its parent.
  const currentDefaultData = defaultData ?? currentResourceContext?.defaultData

  const link = useViewLink({
    resource: currentResource,
    action: currentAction,
    id: currentId,
    defaultData: currentDefaultData,
  })

  // Asked about the record the button acts on, when there is one.
  const isAllowed = usePermission(
    currentAction,
    currentAction === ActionList.create ? undefined : data,
    currentResource
  )

  if (!isAllowed) return null

  // The quota is reached: render the configured fallback, or simply hide the
  // button when there is none.
  if (isReached && quota) {
    const Fallback = quotaConfig?.fallback
    return Fallback ? <Fallback quota={quota} /> : null
  }

  const Icon = ACTION_ICONS[currentAction]

  if (children) {
    return (
      <Link to={link.to} onClick={link.onOpen}>
        {children}
      </Link>
    )
  }

  return (
    <Link
      to={link.to}
      onClick={link.onOpen}
      className={cn(
        buttonVariants({ variant: "secondary", size: "lg" }),
        // `grow` rather than `w-full` on a phone: the button takes what is
        // left of its line beside the layout switcher, instead of a line of
        // its own under it — and, its name not fitting there, goes to the
        // next line whole rather than being squeezed under it.
        "fc min-w-0 grow md:grow-0"
      )}
    >
      {Icon && <Icon />}
      <Trans className="fc">{label ?? view?.buttonLabel ?? currentAction}</Trans>
    </Link>
  )
}

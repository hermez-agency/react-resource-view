import { createContext, MouseEvent, use, useLayoutEffect } from "react"
import { ActionList } from "react-data-form"
import { decodeIri, encodeIri, generateLink } from "@/routes/routes"
import { rememberChildViewOpener } from "@/components/childViewOpener"
import getIdFromObject from "@/internal/id/getIdFromObject"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { BUILT_IN_OPEN, type OpenFrame } from "@/open/open"
import type { ViewResource } from "@/ViewResource"
import type { ViewResourceContextParams } from "@/ViewResourceContext"

/**
 * The view the URL points at, as the views drawn inside it see it: what a view
 * opened over it is written under, and the view opened, if there is one.
 *
 * Set by the outermost view context — the routed one. A list drawn in a tab,
 * a form drawn in a dialog: everything inside it opens its views under the
 * same URL.
 */
export interface ChildViewRouteInterface {
  /** The routed view, with its filter and its layout on screen. */
  parentParams: ViewResourceContextParams
  /** The view opened over it, read from the URL. */
  child?: ViewResourceContextParams
  /**
   * Called by a list of `resourceId` whose layout draws the views opened
   * inline: the routed view leaves them to it. Returns the release.
   */
  claimInline: (resourceId: string) => () => void
}

export const ChildViewRouteContext =
  /* @__PURE__ */ createContext<ChildViewRouteInterface | null>(null)

export function useChildViewRoute(): ChildViewRouteInterface | null {
  return use(ChildViewRouteContext)
}

export interface ViewLinkParams {
  resource: ViewResource
  action: ActionList | `${ActionList}`
  id?: string
  /** What a record created from the link starts with. */
  defaultData?: Record<string, any>
}

export interface ViewLinkInterface {
  /** Where the view is: its page, or the routed view with the view over it. */
  to: string
  frame: OpenFrame
  /** To call on the click that follows the link: the focus comes back to it. */
  onOpen: (event: MouseEvent<HTMLElement>) => void
}

/**
 * The link opening `action` of a resource, wherever it is drawn — a row's
 * button, a board's card. A view opened in a frame is written under the
 * routed view: the same URL whichever control opened it.
 */
export function useViewLink(params: ViewLinkParams): ViewLinkInterface {
  return useViewLinkBuilder()(params)
}

/**
 * The same links, for a control that only knows what to open at the moment of
 * the click — a calendar's day — and so cannot call {@link useViewLink} for it.
 */
export function useViewLinkBuilder(): (params: ViewLinkParams) => ViewLinkInterface {
  const route = useChildViewRoute()

  return ({ resource, action, id, defaultData }) => {
    const frame = resource.views?.[action as ActionList]?.open ?? BUILT_IN_OPEN.page
    const isCreate = action === ActionList.create
    const data = isCreate ? defaultData : undefined

    if (frame.placement === "page") {
      return {
        to: generateLink({
          resourceId: resource["@id"],
          resourceAction: action as ActionList,
          id,
          scope: resource.scope,
          defaultData: data,
        }),
        frame,
        onOpen: () => {},
      }
    }

    const childViewResource: ViewResourceContextParams = {
      resource,
      resourceAction: action as ActionList,
      id,
      defaultData: data,
    }
    // Outside any routed view — a button an application draws on a page of its
    // own — the view opens over the resource's list.
    const parentParams = route?.parentParams ?? {
      resource,
      resourceAction: ActionList.list,
      scope: resource.scope,
    }

    return {
      to: generateLink({ ...parentParams, childViewResource }),
      frame,
      onOpen: (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        if (event.button !== 0) return
        // Under the id the URL holds, which the frame reads it back with.
        const urlId = id === undefined ? undefined : decodeIri(encodeIri(id))
        rememberChildViewOpener(event.currentTarget, resource["@id"], urlId)
      },
    }
  }
}

/** Whether the view in the URL is the record of `data`, of `resource`. */
export function isChildRecord(
  child: ViewResourceContextParams | undefined,
  resource: ViewResource | undefined,
  data: unknown
): boolean {
  if (!child?.id || !resource) return false
  const childResourceId = child.resource?.["@id"] ?? child.resourceId
  if (childResourceId !== resource["@id"] && childResourceId !== resource.alias) {
    return false
  }
  const id = getIdFromObject(data as object, true, resource)

  return id !== undefined && String(id) === String(child.id)
}

/**
 * The view opened inline under this record, if the URL holds one and the
 * layout on screen draws it.
 */
export function useInlineChildView(
  data: unknown
): ViewResourceContextParams | undefined {
  const route = useChildViewRoute()
  const { resource, layout } = useCurrentViewResourceContext() ?? {}
  const child = route?.child
  if (!child || !layout?.supports?.includes("inline")) return undefined
  if (!isChildRecord(child, resource, data)) return undefined
  const action = (child.resourceAction ?? ActionList.read) as ActionList
  if (resource?.views?.[action]?.open.placement !== "inline") return undefined

  return child
}

/**
 * Tells the routed view that this list draws the views opened inline under
 * its rows — as long as its layout on screen does.
 */
export function useInlineClaim(): void {
  const route = useChildViewRoute()
  const { resource, layout } = useCurrentViewResourceContext() ?? {}
  const claim = route?.claimInline
  const supported = !!layout?.supports?.includes("inline")
  const resourceId = resource?.["@id"]

  // Before the frame is painted: the routed view would otherwise draw the
  // fallback dialog for one frame.
  useLayoutEffect(() => {
    if (!claim || !supported || !resourceId) return
    return claim(resourceId)
  }, [claim, supported, resourceId])
}

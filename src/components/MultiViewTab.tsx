import { FC } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Trans, translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ViewResourceContextProvider from "@/provider/ViewResourceContextProvider"
import { useNavigate } from "@/ports"
import { encodeIri, generateLink } from "@/routes/routes"
import { findResource } from "@/utils/findResource"
import { ActionList } from "react-data-form"
import { IconType } from "@/ViewResource"
import type { TabContext, TabDefinition } from "@/ResourceDefinition"
import {
  ViewResourceContext,
  ViewResourceContextParams,
} from "@/ViewResourceContext"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { ScrollArea } from "@/ui/scroll-area"
import { cn } from "@/ui/cn"
import { useMediaQuery } from "@/internal/browser/useMediaQuery"

interface ResolvedSubView {
  slug: string
  name: string
  description?: string
  icon?: IconType
  viewComponent?: FC
  /** Set when the tab points at a resource. */
  viewResourceParams?: ViewResourceContextParams
}

/** A tab's `filter` or `defaultData`, given the record the tabs are under. */
function fromParent<T extends object>(
  value: T | ((context: TabContext) => T) | undefined,
  parent: ViewResourceContext | undefined
): T | undefined {
  if (typeof value !== "function") return value
  if (!parent) return undefined

  return value({ item: parent.data ?? {}, parent })
}

/**
 * Normalises one tab: resolves its resource, given as the resource or its
 * identifier, derives its slug, name and icon, and prepares the params of a
 * nested ViewResourceContextProvider — narrowed to the parent record by the
 * tab's `filter` and `defaultData`.
 */
function resolveTab(tab: TabDefinition): ResolvedSubView | undefined {
  const { id, label, description, icon, component, action, filter, defaultData } =
    tab

  const resource =
    typeof tab.resource === "string"
      ? findResource({ resourceId: tab.resource })
      : tab.resource
  const slug = id ?? (resource ? encodeIri(resource["@id"]) : undefined)

  if (!slug) {
    console.warn("Tab skipped: neither an id nor a resolvable resource", tab)
    return undefined
  }

  return {
    slug,
    name: label ?? resource?.name ?? slug,
    description,
    icon: icon ?? resource?.icon,
    viewComponent: component,
    viewResourceParams: resource
      ? {
          resource,
          resourceAction: action ?? ActionList.list,
          onInitViewResource: (view, parent) => {
            const parentFilter = fromParent(filter, parent)
            const parentData = fromParent(defaultData, parent)

            return {
              ...view,
              filter: parentFilter ? { ...view.filter, ...parentFilter } : view.filter,
              defaultData: parentData ?? view.defaultData,
            }
          },
        }
      : undefined,
  }
}

export function MultiViewTab() {
  const currentResource = useCurrentViewResourceContext()
  const navigate = useNavigate()
  // A menu down the side is a desktop shape: on a phone the column would eat
  // the width the sub-view itself needs, so the bar comes back there — and it
  // scrolls sideways rather than wrapping onto three lines.
  const isWideScreen = useMediaQuery("(min-width: 768px)")
  const subViews = currentResource.view?.tabs
  const orientation =
    subViews?.orientation === "vertical" && isWideScreen ? "vertical" : "horizontal"
  const subViewList = (subViews?.items ?? [])
    .map(resolveTab)
    .filter((subView): subView is ResolvedSubView => subView !== undefined)

  if (!subViews || subViewList.length === 0) {
    return null
  }

  // Tabs derive their filters from the parent record, so they wait for it to
  // load before mounting.
  if (currentResource.id && !currentResource.data) {
    return null
  }

  const page =
    subViewList.find((subView) => subView.slug === currentResource.subResource)
      ?.slug ?? subViewList[0].slug

  function goToNextPage(subResource: string) {
    const link = generateLink({
      id: currentResource.id,
      resourceAction: currentResource.resourceAction,
      resourceId: currentResource.resource["@id"],
      scope: currentResource.scope,
      subResource,
    })
    const currentScrollY = window.scrollY
    currentResource.setViewResource((current) => ({
      ...current,
      subResource: subResource,
    }))
    // The navigate port may resolve synchronously depending on the router.
    void Promise.resolve(
      navigate({ to: link, replace: true, resetScroll: false })
    ).then(() => {
      // Keep the reading position instead of jumping to the top
      requestAnimationFrame(() => {
        window.scrollTo({ top: currentScrollY, behavior: "instant" })
      })
    })
  }

  const triggers = subViewList.map((subView) => (
    <TabsTrigger
      key={subView.slug + "-tabs"}
      value={subView.slug}
      className={cn(
        `shrink-0
         min-w-max
         h-9 md:h-10
         px-3 md:px-4
         rounded-md
         bg-muted
         data-[state=active]:shadow data-[state=active]:text-accent-foreground
         hover:bg-accent/60
         transition-colors
         flex items-center gap-2`,
        // Down a column a tab is a menu entry: the whole width, and the
        // labels lined up under one another rather than each centred.
        orientation === "vertical" && "w-full justify-start"
      )}
      aria-label={subView.name}
      title={subView.name}
    >
      {subView.icon && <subView.icon className="h-4 w-4 shrink-0" />}
      <span>
        <Trans className="fc">{subView.name}</Trans>
      </span>
    </TabsTrigger>
  ))

  return (
    // Layout responsive: mobile = pile (leftCol puis tabs), desktop = 2 colonnes si leftCol existe
    //
    // `minmax(0, 1fr)` rather than `1fr`: a bare `1fr` track is at least as
    // wide as its content, and the bar below is `w-max` — so next to a side
    // column the track grew to the width of every tab and pushed the page
    // sideways, instead of leaving the bar to scroll inside it.
    <div
      className={
        "flex flex-col md:grid md:gap-6 " +
        (subViews.aside
          ? "md:grid-cols-[280px_minmax(0,1fr)]"
          : "md:grid-cols-[minmax(0,1fr)]")
      }
    >
      {subViews.aside && (
        <aside
          className="
            w-full
            md:sticky md:top-20 md:self-start md:h-[calc(100vh-6rem)] md:overflow-auto
            mb-4 md:mb-0
          "
        >
          <subViews.aside />
        </aside>
      )}
      <Tabs
        value={page}
        onValueChange={(newPage) => goToNextPage(newPage)}
        orientation={orientation}
        // `min-w-0` because a grid item is as wide as its content at least: beside
        // the left column the `1fr` track grew to the whole row of tabs, and the
        // page scrolled sideways instead of the bar.
        className={
          orientation === "vertical"
            ? "w-full min-w-0 flex flex-row items-start gap-6"
            : "w-full min-w-0 flex flex-col"
        }
      >
        {orientation === "vertical" ? (
          // The menu keeps its own column and follows the reader down a long
          // sub-view, exactly as the left column of the page does.
          <TabsList
            aria-label={translate("Sub-views")}
            className="
              sticky top-20 self-start
              w-56 shrink-0
              border-none rounded-xl
              flex flex-col items-stretch justify-start
              gap-1
              h-auto
            "
          >
            {triggers}
          </TabsList>
        ) : (
          // The bar stays one line and scrolls sideways rather than wrapping:
          // a record with eight sub-views used to push its content down by
          // three rows of buttons on a phone, and the labels were cut to
          // twelve characters to limit the damage.
          //
          // Held by a wrapper of its own: the scroll area's root sets
          // `position: relative` inline, which beat a `sticky` class — the bar
          // never stuck, and its `top` pushed it 4rem below the side column.
          <div
            className="
              sticky top-16 z-30
              bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60
            "
          >
            <ScrollArea orientation="horizontal">
              <TabsList
                aria-label={translate("Sub-views")}
                className="
                  w-max min-w-full
                  border-none md:border
                  gap-1 md:gap-2
                  flex-nowrap flex
                  h-auto
                "
              >
                {triggers}
              </TabsList>
            </ScrollArea>
          </div>
        )}
        {subViewList.map((subView) => (
          <TabsContent
            value={subView.slug}
            key={subView.slug + "-content"}
            className={orientation === "vertical" ? "min-w-0" : "mt-4"}
          >
            <CardHeader className="rounded-md p-4 bg-muted/50">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                {subView.icon && <subView.icon className="h-4 w-4 md:h-5 md:w-5" />}
                <Trans>{subView.name}</Trans>
              </CardTitle>
              {subView.description && (
                <CardDescription className="text-sm md:text-base">
                  <Trans>{subView.description}</Trans>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="mt-4 md:mt-6 p-0 md:p-2">
              {subView.viewComponent ? (
                <subView.viewComponent />
              ) : (
                subView.viewResourceParams && (
                  <ViewResourceContextProvider
                    // Remonter la sous-vue quand l'item parent change pour
                    // narrow it again: its filters come from the parent
                    key={subView.slug + "-" + (currentResource.id ?? "")}
                    {...subView.viewResourceParams}
                  />
                )
              )}
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

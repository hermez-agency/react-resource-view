import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { Trans } from "react-mini-i18n"
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs"
import { setUrlParam } from "@/internal/url/setUrlParam"

export default function ChangeViewOptionComponent() {
  const currentResource = useCurrentViewResourceContext()
  const layouts = currentResource.view.layouts
  if (layouts.length < 2) return <></>

  return (
    <>
      <Tabs
        // Controlled: the highlighted tab is the layout actually on screen,
        // never a selection the context did not keep.
        value={currentResource.viewVariant}
        onValueChange={(viewName) => {
          const viewVariant = String(viewName)
          currentResource.setViewResource((current) => ({
            ...current,
            viewVariant,
          }))
          // Like the filter: a list nested in another view does not own the URL.
          if (!currentResource.parentResource) setUrlParam("variant", viewVariant)
        }}
      >
        <TabsList>
          {layouts.map((layout) => (
            <TabsTrigger key={"tab-view-" + layout.id} value={layout.id}>
              {layout.icon ? (
                <div className={"flex justify-center items-center gap-2"}>
                  <layout.icon className={"text-xl"} />
                  <Trans className={"fc"}>{layout.label}</Trans>
                </div>
              ) : (
                <Trans>{layout.label}</Trans>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </>
  )
}

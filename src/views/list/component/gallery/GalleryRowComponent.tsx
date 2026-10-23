import { RowComponentPropsInterface } from "@/ViewResource"
import { useLayout } from "@/layout/useLayout"
import type { GalleryLayoutOptions } from "@/layout/layout"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { DefaultItemComponent } from "@/views/list/component/DefaultItemComponent"

/** What sits under a gallery card's picture: the title, then the `fields`. */
export function GalleryRowComponent({ row }: RowComponentPropsInterface) {
  const { imageField, titleField } = useLayout<GalleryLayoutOptions>().options
  const layoutFields = useLayout().fields
  const view = useCurrentViewResourceContext().view
  const data = row?.data ?? {}

  const titleKey = titleField ?? view?.titleField
  const title = getRecordTitle(data, titleKey)
  const fields = (layoutFields ?? []).filter(
    (name) => name !== imageField && name !== titleKey
  )

  return (
    <div className="flex flex-col gap-1">
      {title && <div className="font-semibold text-foreground">{title}</div>}
      {fields.map((name) =>
        data[name] == null || data[name] === "" ? null : (
          <div key={name} className="text-sm text-muted-foreground">
            <DefaultItemComponent formInput={{ name, value: data[name] }} />
          </div>
        )
      )}
    </div>
  )
}

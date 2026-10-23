import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import ItemRender from "@/views/list/ItemRender"
import { ItemComponentPropsInterface } from "@/ViewResource"

export function DumpItemComponent({ formInput }: ItemComponentPropsInterface) {
  const { resource } = useCurrentViewResourceContext()
  if (!formInput) return null

  return <>{ItemRender(formInput.value, resource)}</>
}

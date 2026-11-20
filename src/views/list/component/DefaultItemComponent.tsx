import { Trans } from "react-mini-i18n"
import { ItemComponentPropsInterface } from "@/ViewResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useFieldVisible } from "@/views/list/fields/Field"

/**
 * One field of a record, drawn by the layout's `item` component — or nothing
 * while the reader hides it ("Shown fields"), whatever the layout.
 */
export function DefaultItemComponent({ formInput }: ItemComponentPropsInterface) {
  const view = useCurrentViewResourceContext().view
  const visible = useFieldVisible(
    typeof formInput?.name === "string" ? formInput.name : undefined
  )
  const Item = view.components.item
  if (!visible) return null
  if (!Item) {
    return <Trans>Item Component is not defined</Trans>
  }

  return <Item formInput={formInput} />
}

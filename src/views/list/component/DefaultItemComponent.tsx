import { Trans } from "react-mini-i18n"
import { ItemComponentPropsInterface } from "@/ViewResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"

export function DefaultItemComponent({ formInput }: ItemComponentPropsInterface) {
  const view = useCurrentViewResourceContext().view
  const Item = view.components.item
  if (!Item) {
    return <Trans>Item Component is not defined</Trans>
  }

  return <Item formInput={formInput} />
}

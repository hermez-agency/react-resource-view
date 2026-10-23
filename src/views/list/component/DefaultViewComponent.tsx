import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { ActionList } from "react-data-form"
import { Trans } from "react-mini-i18n"
import ListView from "@/views/list/component/ListView"
import EditView from "@/views/update/EditView"
import { ReadView } from "@/views/read/ReadView"
import RemoveViewComponent from "@/views/remove/RemoveView"

export function DefaultViewComponent() {
  const currentResource = useCurrentViewResourceContext()

  if (currentResource.resourceAction === ActionList.list) return <ListView />
  if (currentResource.resourceAction === ActionList.update) return <EditView />
  if (currentResource.resourceAction === ActionList.create) return <EditView />
  if (currentResource.resourceAction === ActionList.read) return <ReadView />
  if (currentResource.resourceAction === ActionList.delete)
    return <RemoveViewComponent />

  return <Trans>Action Resource is not defined</Trans>
}

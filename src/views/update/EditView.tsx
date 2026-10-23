import { ActionList, FormElement } from "react-data-form"
import getIdFromObject from "@/internal/id/getIdFromObject"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { cn } from "@/ui/cn"
import useFormByResource from "@/hook/useFormByResource"
import { useEffect, useRef } from "react"
import { LoadError } from "@/components/LoadError"

export default function EditView() {
  const currentResource = useCurrentViewResourceContext()

  // The provider is already loading the record: the form is drawn once it has
  // it, rather than asking the API for it a second time.
  const waitsForRecord =
    (!!currentResource.id || !!currentResource.resource.singleton) &&
    !currentResource.defaultData &&
    !currentResource.data &&
    currentResource.isLoading
  if (waitsForRecord) return null

  return <EditForm />
}

function EditForm() {
  const currentResource = useCurrentViewResourceContext()
  const initialData =
    currentResource.defaultData ?? currentResource.data ?? undefined
  const formContext = useFormByResource({
    currentResource: currentResource,
    data: initialData,
    onUpdated: (saved) => {
      // The record of a singleton now exists: the page that offered to create
      // it is the one that edits it.
      const { resource, resourceAction, setViewResource } = currentResource
      if (!resource.singleton || resourceAction !== ActionList.create) return
      setViewResource((current) => ({
        ...current,
        resourceAction: ActionList.update,
        view: resource.views[ActionList.update],
        id: getIdFromObject(saved, false, resource),
        data: saved,
        defaultData: undefined,
      }))
    },
  })

  // `useForm` hands back a new object on every render: the effect reads the
  // latest one rather than depending on it.
  const formContextRef = useRef(formContext)
  formContextRef.current = formContext
  const appliedDataRef = useRef(initialData)

  useEffect(() => {
    if (!formContextRef.current.ready) return
    if (!currentResource.data) return
    if (currentResource.data === appliedDataRef.current) return
    appliedDataRef.current = currentResource.data
    formContextRef.current.updateData(currentResource.data, true)
  }, [currentResource.data])

  // A record that could not be loaded is not drawn as an empty form, which
  // could be saved over it.
  if (currentResource.error && !currentResource.data) return <LoadError />

  return (
    <div
      className={cn("pb-5 max-w-150", currentResource.view?.className)}
      role={"edit-view"}
    >
      <FormElement {...formContext} key={formContext.form?.id ?? "form-element"} />
    </div>
  )
}

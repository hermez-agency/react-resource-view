import { useForm, FormContextOutput } from "react-data-form"
import { ApiJsonLdError } from "jsonld-api-client"
import { addErrorFromViolations } from "react-data-form"
import { normalizeApiError } from "@/api/apiRequestError"
import { resolveDialect } from "@/api/apiConfig"
import getFormByCurrentResourceContext from "@/views/update/getFormByCurrentResourceContext"
import { FormBuiltInterface, FormInterface } from "react-data-form"
import { ActionList } from "react-data-form"
import { toast } from "sonner"
import {
  ViewResourceContext,
  ViewResourceContextParams,
} from "@/ViewResourceContext"
import { deepCopy } from "@/internal/object/deepCopy"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { generateLink } from "@/routes/routes"
import { useNavigate } from "@/ports"
import { resolveViewResourceContext } from "@/utils/resolveViewResourceContext"
import { findResource } from "@/utils/findResource"
import { ViewResource } from "@/ViewResource"
import { translate } from "react-mini-i18n"
import { createRecord, updateRecord } from "@/hook/useResourceMutation"
import { useOverlay } from "@/action/overlayContext"

export interface formByResourceInputsInterface<DataProps extends object = object> {
  currentResource: ViewResourceContextParams
  onSubmit?: (data: DataProps) => DataProps
  onUpdated?: (data: DataProps) => void
  onChange?: (data: DataProps, form: FormInterface<DataProps>) => void
  data?: Partial<DataProps>
  form?: FormInterface
}

export default function useFormByResource<DataMain extends object = object>({
  currentResource,
  data,
  form,
  onSubmit,
  onChange,
  onUpdated,
}: formByResourceInputsInterface<DataMain>): FormContextOutput<DataMain> {
  const router = useNavigate()
  const id = currentResource?.id
  const action =
    currentResource.resourceAction ?? (id ? ActionList.update : ActionList.create)
  const view =
    currentResource.view ?? resolveViewResourceContext(currentResource).view
  /**
   * A form drawn in a frame — a dialog, a drawer, an accordion — has nowhere
   * to send anyone.
   *
   * After a creation the form moves on to the new record's edit screen, so a
   * full-page "New user" does not sit there claiming to be empty. In a frame
   * that same navigation leaves the page the form is drawn on: the list
   * underneath disappears, its filters and its page with it, and what the
   * user gets for filling in three fields is a screen they never asked for.
   * Closing is going back to the URL the frame was opened from instead.
   */
  const overlay = useOverlay()
  const opensOverThePage = overlay !== null
  const afterSave = view?.afterSave ?? (opensOverThePage ? "close" : "stay")
  const resource = findResource({
    resourceId: currentResource.resourceId as string,
    resource: currentResource.resource,
  }) as ViewResource

  const currentForm = deepCopy(
    form ??
      (getFormByCurrentResourceContext({
        ...currentResource,
        resourceAction: currentResource.resourceAction ?? action,
      }) as FormBuiltInterface)
  )

  if (!currentForm) {
    throw Error("Form not found")
  }

  if (action === ActionList.read) {
    currentForm.action = ActionList.read
  }

  const formContext = useForm<DataMain>({
    form: currentForm,
    onChange,
    asyncData: async () => {
      const currentData = data ?? currentResource.data ?? undefined

      if (action === ActionList.create || data) return currentData as DataMain

      const fetcher = currentResource.resource?.getItem

      if (fetcher) {
        const response = await fetcher(
          { id: id as string },
          { viewResourceContext: currentResource as ViewResourceContext }
        )

        return response.data as DataMain
      }

      throw new Error("Data is unreachable")
    },
    onSubmit: async (data) => {
      const newData = onSubmit ? onSubmit(data) : data
      const newDataWithId = {
        ...{ id: id as string },
        ...newData,
      }

      const idInObjet = getIdFromObject(
        formContext.form.originalData,
        false,
        resource
      )
      if (idInObjet) {
        newDataWithId.id = idInObjet
      }

      // The view context goes with the write, so the resource's hooks know
      // which screen it comes from.
      const context = { viewResourceContext: currentResource as ViewResourceContext }

      try {
        // The lists of the resource show the record as saved at once; the
        // form itself stays until the API answers, so a refusal can still be
        // pinned on the fields it is about.
        const response =
          action === ActionList.create && !idInObjet
            ? await createRecord(resource, newDataWithId, { context })
            : await updateRecord(resource, newDataWithId, { context })
        toast.success(formContext.form?.label?.success, {
          description: translate("Your changes have been saved"),
        })

        if (typeof response === "undefined") {
          throw new Error("Data Unfetchable")
        }

        onUpdated?.(response.data as DataMain)

        if (typeof afterSave === "object") {
          router({ to: afterSave.redirect(response.data) })

          return response.data
        }

        if (afterSave === "reload") {
          formContext.updateData(response.data)
        }

        // Closing a form drawn in a frame closes the frame; on its own page,
        // it goes back to the list.
        if (afterSave === "close" && overlay) {
          overlay.close()

          return response.data
        }

        if (afterSave === "close") {
          router({
            to: generateLink({
              resourceId: resource?.["@id"] as string,
              resourceAction: ActionList.list,
              scope: resource?.scope,
            }),
          })

          return response.data
        }

        if (
          action === ActionList.create &&
          afterSave === "stay" &&
          !opensOverThePage &&
          // A singleton has no page of its own per record: it stays where it is.
          !resource?.singleton
        ) {
          router({
            to: generateLink({
              id: getIdFromObject(response.data, false, resource) as string,
              resourceId: resource?.["@id"] as string,
              resourceAction: ActionList.update,
              // Without it the link is built in whatever scope is current
              // rather than the resource's own, and a back office creating a
              // record walks out of its own area.
              scope: resource?.scope,
            }),
          })

          return response.data
        }

        return response.data
      } catch (error) {
        // Whatever the backend called it — Hydra violations, a Strapi
        // `error.details.errors`, a PostgREST message — the dialect reads it
        // into the one shape the form knows how to show.
        const apiError = normalizeApiError(error, resolveDialect(resource))

        if (apiError) {
          // With no field violations — a 400 such as "slot no longer
          // available" — the API's detail is the only explanation to show.
          toast.error(formContext.form.label.error, {
            description: apiError.violations?.length
              ? undefined
              : (apiError.detail ?? undefined),
          })

          const formWithError = addErrorFromViolations(
            formContext.form as FormBuiltInterface,
            apiError as ApiJsonLdError
          )

          formContext.updateForm(formWithError)

          return data
        }

        // Not an API failure — a network outage, a bug. Nothing to pin on a
        // field, and nothing gained by dressing it up as a validation message;
        // but the row drawn before the answer has gone back, and that needs
        // saying.
        console.error(error)
        toast.error(formContext.form.label.error)
      }

      return data
    },
  })

  return formContext
}

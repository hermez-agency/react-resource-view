import {
  ActionList,
  getFormInputsFromForm,
  InputControllerProvider,
  useFormContext,
  type FormInterface,
} from "react-data-form"
import { Settings2 } from "lucide-react"

/**
 * The outline column of a builder screen: the record's own fields, folded away,
 * and under them the blocks it is assembled from.
 *
 * A post is a title, an author, a category — and a document. Drawn as one flat
 * form they are the same thing, so six fields of metadata pushed the blocks
 * below the fold on the screen the reader came to build a page on. Here they
 * are a `Settings` fold, open while the post is being created, closed once it
 * exists and the writing is what is left to do.
 *
 * Both components below are the ones `FormInterface.components` already names:
 * no rendering is taken away from the library, it is asked for a different
 * arrangement of the very inputs it built.
 */

/** The field holding the document, told apart from the record's own fields. */
const BLOCKS = "blocks"

export function BuilderFormInputs() {
  const form = useFormContext().form
  const inputs = getFormInputsFromForm(form)
  const blocks = inputs.filter((input) => input.name === BLOCKS)
  const fields = inputs.filter((input) => input.name !== BLOCKS)
  // A generated input draws nothing — an `@id` is not a field — so a form whose
  // only real input is the document must not grow an empty fold.
  const hasFields = fields.some((input) => !input.generatedValue)
  const open = form.action === ActionList.create

  const render = (input: (typeof inputs)[number]) => (
    <InputControllerProvider
      key={`${input.id}${input.name}${form.version}`}
      formInput={input}
    />
  )

  return (
    <>
      {hasFields ? (
        <details
          open={open}
          className="group mb-3 rounded-xl border border-border bg-card px-3.5 py-2.5"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Settings2 className="size-4 text-muted-foreground" />
            Settings
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {fields.filter((input) => !input.generatedValue).length} fields
            </span>
          </summary>
          <div className="mt-1 mb-1">{fields.map(render)}</div>
        </details>
      ) : (
        fields.map(render)
      )}

      {blocks.map(render)}
    </>
  )
}

/**
 * Saving, as a bar under the outline rather than a full-width primary button.
 *
 * The one the library draws is the widest, loudest thing on the screen, and it
 * is not what the screen is for: the eye should land on the document.
 */
export function BuilderSubmitAction() {
  const formContext = useFormContext()
  const form = formContext.form

  if (form.action === ActionList.read || form.saveOnChange) return null

  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-3 border-t border-border bg-background/85 py-3 backdrop-blur">
      <button
        type="button"
        disabled={form.loading}
        onClick={() => formContext.onSubmit()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {form.label?.submit ?? "Save"}
      </button>
    </div>
  )
}

/** The same two components, as the `components` block of a form description. */
export const BUILDER_FORM_COMPONENTS: FormInterface["components"] = {
  formInputs: BuilderFormInputs,
  formSubmitAction: BuilderSubmitAction,
}

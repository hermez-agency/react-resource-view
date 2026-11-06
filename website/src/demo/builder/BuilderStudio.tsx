import { useState } from "react"
import { FormElement, useForm } from "react-data-form"
import { RotateCcw } from "lucide-react"
import type { BuilderBlock } from "@/demo/builder/blocks"
import { BuilderCanvas } from "@/demo/builder/BuilderCanvas"
import { BuilderShell } from "@/demo/builder/BuilderShell"
import type { BuilderKit } from "@/demo/builder/kits"

/**
 * The builder itself: the description on the left, what it produces on the
 * right, both live.
 *
 * Everything the reader edits goes through one field. `useForm`'s `onChange`
 * fires on every keystroke and hands back the whole payload, so the preview is
 * not wired to the form — it is a function of the array the form holds, which
 * is all an application would have to store.
 */
export function BuilderStudio({
  kit,
  sample = kit.sample,
  onSave,
}: {
  kit: BuilderKit
  /** What it opens on — a documentation page starts from fewer blocks. */
  sample?: BuilderBlock[]
  /**
   * Called with the current blocks when the kit's submit button ("Publish",
   * "Export"...) is pressed and the form validates. Without it — the
   * documentation demos, `/playground/builder` — that button validates and
   * goes nowhere, same as before this prop existed. A kit with fields beside
   * its blocks — the email's envelope — gets them as the second argument.
   */
  onSave?: (blocks: BuilderBlock[], fields: Record<string, unknown>) => void
}) {
  // Remounting is how the sample is restored: the array field keeps its own
  // state, so putting the blocks back means building the form again.
  const [generation, setGeneration] = useState(0)

  return (
    <Studio
      key={`${kit.id}-${generation}`}
      kit={kit}
      sample={sample}
      onReset={() => setGeneration((value) => value + 1)}
      onSave={onSave}
    />
  )
}

function Studio({
  kit,
  sample,
  onReset,
  onSave,
}: {
  kit: BuilderKit
  sample: BuilderBlock[]
  onReset: () => void
  onSave?: (blocks: BuilderBlock[], fields: Record<string, unknown>) => void
}) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(sample)
  const [fields, setFields] = useState(kit.fields)

  const formContext = useForm({
    form: kit.form,
    data: { ...kit.fields, blocks: sample },
    // The second argument is the updated form; its data is the payload as it
    // stands after the keystroke, which is what the preview draws.
    onChange: (_, form) => {
      const { blocks: next, ...rest } = form.data ?? {}
      setBlocks((next as BuilderBlock[]) ?? [])
      if (kit.fields) setFields(rest)
    },
    onSubmit:
      onSave &&
      ((data) => {
        const { blocks: saved, ...rest } = data
        onSave((saved as BuilderBlock[]) ?? [], rest)
      }),
  })

  // Called on every render, and the kit never changes under a mounted studio:
  // the studio is keyed on it.
  const outputs = (kit.useOutputs ?? noOutputs)(blocks, fields)

  return (
    <BuilderShell
      eyebrow={kit.label}
      title={kit.tagline}
      actions={
        <>
          {outputs.actions}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </>
      }
      outline={<FormElement {...formContext} />}
      canvas={
        <BuilderCanvas
          blocks={blocks}
          fields={fields}
          preview={kit.preview}
          medium={kit.medium}
          sources={outputs.sources}
          payload={kit.fields ? { ...fields, blocks } : blocks}
          toolbarEnd={
            outputs.toolbarEnd ?? (
              <span className="text-xs text-muted-foreground">
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </span>
            )
          }
        />
      }
    />
  )
}

function noOutputs(): ReturnType<NonNullable<BuilderKit["useOutputs"]>> {
  return {}
}

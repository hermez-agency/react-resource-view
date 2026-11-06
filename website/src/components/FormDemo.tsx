import { useState } from "react"
import { FormElement, useForm, type FormInterface } from "react-data-form"
import { cn } from "@/lib/cn"

export interface FormDemoProps {
  form: FormInterface
  /** Initial values, as an API would hand them over. */
  data?: Record<string, unknown>
  /** Shows what `onSubmit` received, next to the form. */
  showPayload?: boolean
  className?: string
}

/**
 * A form running inside a documentation page.
 *
 * The submitted payload is shown beside it on purpose: the interesting part of
 * a data-driven form is not that it renders, it is what comes out the other
 * end — and that is the part a screenshot cannot show.
 */
export function FormDemo({
  form,
  data,
  showPayload = true,
  className,
}: FormDemoProps) {
  const [payload, setPayload] = useState<unknown>()

  const formContext = useForm({
    form,
    data,
    onSubmit: (submitted) => setPayload(submitted),
  })

  return (
    <div
      className={cn(
        "grid gap-6",
        showPayload && "lg:grid-cols-[minmax(0,1fr)_18rem]",
        className
      )}
    >
      <FormElement {...formContext} />

      {showPayload && (
        <aside className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            onSubmit received
          </p>
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-code-bg p-3 font-mono text-[11px] leading-relaxed">
            {payload
              ? JSON.stringify(payload, null, 2)
              : "// submit the form to see the payload"}
          </pre>
        </aside>
      )}
    </div>
  )
}

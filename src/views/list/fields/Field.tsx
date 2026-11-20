import { ReactNode, use } from "react"
import {
  FieldVisibilityContext,
  type FieldVisibilityContextInterface,
} from "@/views/list/fields/FieldVisibilityProvider"

/**
 * Which fields the list on screen shows, and what changes them — what the
 * "Shown fields" menu reads and writes. `null` outside a list.
 */
export function useFieldVisibility(): FieldVisibilityContextInterface | null {
  return use(FieldVisibilityContext)
}

/**
 * Whether the reader shows a field of the records in the list on screen —
 * `price`, or a nested one, `user.name`. Hiding `user` hides `user.name`.
 * Outside a list, and for a field without a name, always `true`.
 *
 * ```tsx
 * function TaskCard({ row }: RowComponentPropsInterface) {
 *   const showPrice = useFieldVisible("price")
 *   return <div className={showPrice ? "grid-cols-2" : ""}>…</div>
 * }
 * ```
 */
export function useFieldVisible(name: string | undefined): boolean {
  const context = use(FieldVisibilityContext)
  if (!context || !name) return true

  return context.isVisible(name)
}

export interface FieldProps {
  /** The data key drawn inside: `price`, `user.name`. */
  name: string
  children?: ReactNode
}

/**
 * Draws its children only while the reader shows the field `name` — the one
 * thing a list component of one's own needs to follow the "Shown fields"
 * menu, in every layout:
 *
 * ```tsx
 * <Field name="user.name">
 *   <span>{row.data.user.name}</span>
 * </Field>
 * ```
 */
export function Field({ name, children }: FieldProps) {
  return useFieldVisible(name) ? <>{children}</> : null
}

import getIdFromObject from "@/internal/id/getIdFromObject"
import type { RowInterface } from "@/ViewResource"

/**
 * The React key of a row: the identity of its record, so a row whose values
 * change — even optimistically — keeps its DOM node, its focus and its local
 * state. A record drawn before the API created it has no id yet: drafts come
 * first in the list, so their position is stable until they are confirmed.
 */
export function rowKey(
  row: RowInterface,
  index: number,
  resource?: Parameters<typeof getIdFromObject>[2]
): string {
  const id =
    row.pending === "create" ? undefined : getIdFromObject(row.data, false, resource)

  return id === undefined || id === "" ? `draft-${index}` : `row-${id}`
}

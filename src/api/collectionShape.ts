import { CollectionPageInterface } from "@/api/apiDialectInterface"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

/**
 * The envelope every repository of this package hands back for a list.
 *
 * It is deliberately a superset: `items` and `totalItems` are the names the
 * views read, while `member`, `@id` and `@type` keep it a valid JSON-LD
 * collection, so code written against the JSON-LD shape — a custom list
 * component, a test fixture — keeps reading it.
 */
export interface ResourceCollectionInterface<T = RecordOfAny> {
  "@id": string
  "@type": string
  items: T[]
  member: T[]
  totalItems?: number
}

/** Builds that envelope from the rows a dialect read. */
export function createResourceCollection<T = RecordOfAny>({
  id,
  items,
  totalItems,
}: {
  id: string
  items: T[]
  totalItems?: number
}): ResourceCollectionInterface<T> {
  return {
    "@id": id,
    "@type": "Collection",
    items,
    member: items,
    totalItems,
  }
}

/**
 * Recognises a payload this package already normalized, so reading a
 * collection twice is the same as reading it once — the repository normalizes
 * on the way in, and the views read again on every render. `readCollectionPage`
 * does it before any dialect, so a dialect only ever reads what its API sent.
 *
 * `member` is what tells the envelope from a raw `{ items }` body such as
 * `fastapi-pagination`'s, which is the dialect's to read.
 */
export function readNormalizedCollection(
  payload: unknown
): CollectionPageInterface | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const candidate = payload as RecordOfAny
  if (!Array.isArray(candidate.items) || !Array.isArray(candidate.member)) {
    return undefined
  }
  return {
    items: candidate.items as RecordOfAny[],
    totalItems: candidate.totalItems as number | undefined,
  }
}

import { CollectionPageInterface } from "@/api/apiDialectInterface"
import { ApiDialectInterface } from "@/api/apiDialectInterface"
import { resolveDialect } from "@/api/apiConfig"
import { readNormalizedCollection } from "@/api/collectionShape"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

interface DialectHolder {
  dialect?: ApiDialectInterface
}

/**
 * Reads a list response, whatever envelope it came in.
 *
 * The views call this rather than reaching into `member` themselves, so a
 * Strapi `{ data, meta }` and a Supabase array read the same as a Hydra
 * collection. A resource speaking its own dialect is honoured over the
 * configured one. The envelope the repository already normalized is read here,
 * so a dialect only reads what its own API sends.
 */
export function readCollectionPage(
  payload: unknown,
  resource?: DialectHolder | null
): CollectionPageInterface {
  if (!payload) return { items: [] }
  const normalized = readNormalizedCollection(payload)
  if (normalized) return normalized
  return resolveDialect(resource).readCollection(payload)
}

/** The rows of a list response. */
export function getCollectionItems<T = RecordOfAny>(
  payload: unknown,
  resource?: DialectHolder | null
): T[] {
  return readCollectionPage(payload, resource).items as T[]
}

/**
 * How many rows match the list's filters across every page, or `undefined`
 * when the API does not say — in which case the pagination stays hidden rather
 * than inventing a page count.
 */
export function getCollectionTotal(
  payload: unknown,
  resource?: DialectHolder | null
): number | undefined {
  return readCollectionPage(payload, resource).totalItems
}

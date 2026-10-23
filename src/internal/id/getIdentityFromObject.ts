import { IdAbleInterface } from "jsonld-item"
import { ApiDialectInterface } from "@/api/apiDialectInterface"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

/**
 * The fields a record is identified by, and none of the others — what a
 * partial update needs to find the record again without writing the rest of it.
 *
 * A field is kept when the dialect reads the record's identifier from it
 * alone: the IRI and the `id` of a JSON-LD item, Strapi's `documentId`, a
 * Supabase primary key. Every repository then finds the record by the field it
 * keys on — the local one matches an `@id`, a REST one builds its URL from the
 * short form.
 */
export default function getIdentityFromObject(
  object: IdAbleInterface,
  resource?: { dialect?: ApiDialectInterface; idField?: string } | null
): RecordOfAny {
  const record = object as RecordOfAny
  const identifier = getIdFromObject(record, true, resource)
  if (identifier === undefined) return {}

  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => {
      if (value === undefined || value === null) return false
      const read = getIdFromObject({ [key]: value }, true, resource)
      return read !== undefined && String(read) === String(identifier)
    })
  )
}

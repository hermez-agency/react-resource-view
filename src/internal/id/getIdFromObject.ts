import { IdAbleInterface } from "jsonld-item"
import { ApiDialectInterface } from "@/api/apiDialectInterface"
import { resolveDialect } from "@/api/apiConfig"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

/**
 * The identity of a record, as its API spells it.
 *
 * A resource declaring an `idField` is identified by that field alone, in
 * either form. `forceId` asks for the short form a URL segment takes — the number behind a
 * JSON-LD IRI, Strapi's `documentId`, a Supabase primary key — rather than the
 * identity the rest of the application refers to the record by.
 */
export default function getIdFromObject(
  object: IdAbleInterface,
  forceId: boolean = false,
  resource?: { dialect?: ApiDialectInterface; idField?: string } | null
): string | undefined {
  const dialect = resolveDialect(resource)
  const record = object as RecordOfAny

  const declared = resource?.idField ? record?.[resource.idField] : undefined
  if (declared !== undefined && declared !== null) return String(declared)

  return forceId ? dialect.getIdentifier(record) : dialect.getId(record)
}

import { isAbsoluteUrl } from "@/api/queryString"

/**
 * Whether an identifier can only designate a record of this resource.
 *
 * The identifier of a view comes from its URL, and the repositories take an
 * IRI for the URL to call: `/books/update/%2Fapi%2Fusers%2F1` would read — and
 * save — a user. An identifier holding a slash is taken only as an IRI one
 * segment under the resource's own path; an absolute URL never, since the
 * request would carry the credentials to whatever host it names. A resource
 * without a path calls no URL built from its identifiers — local storage
 * matches the `@id` as it stands — so any IRI is its own.
 */
export function isIdOfResource(
  id: string | number | null | undefined,
  resource: { path?: string } | undefined
): boolean {
  if (id === undefined || id === null) return true
  const value = String(id)
  if (isAbsoluteUrl(value) || value.startsWith("//")) return false
  if (!/[/\\]/.test(value)) return true

  if (!resource?.path) return true
  const path = resource.path.replace(/\/+$/, "")
  if (!value.startsWith(`${path}/`)) return false
  const segment = value.slice(path.length + 1)

  return segment !== "" && !/[/\\]/.test(segment) && !/^\.\.?$/.test(segment)
}

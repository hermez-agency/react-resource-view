import { isDevelopment } from "@/definition/validateDefinition"

/**
 * Serialises an object for transport in a query parameter.
 *
 * `encodeURIComponent` rather than `encodeURI`: the latter leaves `&`, `=` and
 * `#` untouched, so a value containing any of them — "Tom & Jerry" — would end
 * the parameter early and lose everything after it.
 */
export const encodeQuery = (data: Record<string, any>): string => {
  return encodeURIComponent(JSON.stringify(data))
}

/**
 * Reads back what {@link encodeQuery} wrote.
 *
 * `decodeURIComponent` also reads the output of the earlier `encodeURI`
 * encoding, so links generated before the fix keep working.
 *
 * A parameter that does not decode — a link cut short by a mail client or a
 * chat, or edited by hand — gives `undefined` and a warning in development,
 * rather than an error that takes the whole application down.
 */
export const decodeQuery = (url: string): Record<string, any> | undefined => {
  try {
    return JSON.parse(decodeURIComponent(url))
  } catch {
    if (isDevelopment()) {
      console.warn(`Ignoring a malformed URL parameter: ${url}`)
    }
    return undefined
  }
}

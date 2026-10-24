import { translate } from "react-mini-i18n"
import type { ApiErrorPayloadInterface } from "@/api/apiDialectInterface"

/**
 * What to tell about a failed write besides its title: the API's own words
 * when it gave some, else its status, else — for a request that never got an
 * answer, a `TypeError` from `fetch` — that the server could not be reached.
 * Same rules as `LoadErrorMessage`. `undefined` for a bug, which has nothing
 * to tell a user.
 */
export function describeWriteError(
  error: unknown,
  apiError: ApiErrorPayloadInterface | undefined
): string | undefined {
  if (!apiError) {
    return error instanceof TypeError
      ? translate("The server could not be reached.")
      : undefined
  }

  if (apiError.detail) return apiError.detail
  if (!apiError.status) return undefined

  return `${apiError.status} — ${translate("The server answered with an error.")}`
}

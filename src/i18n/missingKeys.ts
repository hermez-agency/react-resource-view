import { messages } from "./messages"

/**
 * The keys of `messages` that `dictionary` leaves untranslated: the ones it
 * has no entry for, or an empty entry — the library reads both as missing.
 *
 * ```ts
 * expect(missingKeys(fr)).toEqual([])
 * ```
 */
export function missingKeys(
  dictionary: Readonly<Record<string, string | null | undefined>>
): string[] {
  return Object.keys(messages).filter((key) => !dictionary[key])
}

import { isMediaFile } from "@/media/mediaFile"

/**
 * The URL a card's cover is drawn from, whatever the image field holds: an URL,
 * a data URL, a media object (`{ url, name }`) or a list of them, of which the
 * first is the cover. Nothing when the record has no image.
 */
export function coverImageOf(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined
  if (Array.isArray(value)) return coverImageOf(value[0])
  if (isMediaFile(value)) return value.url || undefined
  return undefined
}

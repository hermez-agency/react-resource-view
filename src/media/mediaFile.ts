import { translate } from "react-mini-i18n"

/**
 * A file kept in a record: what the document list of a form stores, one entry
 * per file.
 *
 * `url` is whatever the store returned — a data URL by default, so the file
 * travels inside the record with no server behind it; an URL of the API once a
 * `store` uploads it instead.
 */
export interface MediaFile {
  name: string
  /** The MIME type, `application/pdf`. Empty when the browser did not know it. */
  type: string
  /** In bytes. */
  size: number
  url: string
}

/**
 * Where a picked file goes, and what the record keeps of it: the string it
 * resolves to. The default reads the file into a data URL; an application
 * uploading its files returns the URL its API answered with.
 *
 * ```ts
 * const upload: MediaStore = async (file) => {
 *   const body = new FormData()
 *   body.append("file", file)
 *   const response = await fetch("/api/media", { method: "POST", body })
 *   return (await response.json()).url
 * }
 * ```
 */
export type MediaStore = (file: File) => Promise<string>

/** The default store: the file itself, as a base64 data URL. */
export const storeAsDataUrl: MediaStore = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export function isMediaFile(value: unknown): value is MediaFile {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MediaFile).url === "string" &&
    typeof (value as MediaFile).name === "string"
  )
}

/** A list every entry of which is a {@link MediaFile} — and that has one. */
export function isMediaFileList(value: unknown): value is MediaFile[] {
  return Array.isArray(value) && value.length > 0 && value.every(isMediaFile)
}

/** An image held in a data URL: what an image input stores by default. */
export function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/")
}

/** The MIME type of a file, falling back on the one its data URL declares. */
export function mimeTypeOf(file: Pick<MediaFile, "type" | "url">): string {
  if (file.type) return file.type
  return /^data:([^;,]+)/.exec(file.url)?.[1] ?? ""
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/")
}

/**
 * Whether a file matches an `accept` list, spelled the way the attribute of an
 * `<input type="file">` is: a MIME type (`application/pdf`), a family
 * (`image/*`) or an extension (`.docx`). No list accepts everything.
 */
export function acceptsFile(
  file: { name: string; type: string },
  accept?: string[]
): boolean {
  if (!accept?.length) return true
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  return accept.some((rule) => {
    const pattern = rule.trim().toLowerCase()
    if (pattern.startsWith(".")) return name.endsWith(pattern)
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1))
    return type === pattern
  })
}

const UNITS = ["B", "KB", "MB", "GB"]

/** `1536` → `1.5 KB`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ""
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024
    unit++
  }
  const rounded =
    unit === 0 || size >= 10 ? Math.round(size) : Math.round(size * 10) / 10

  return `${rounded} ${UNITS[unit]}`
}

/** What a picked file is checked against before it is stored. */
export interface MediaFileRules {
  accept?: string[]
  /** In bytes. */
  maxSize?: number
}

/**
 * Why a file cannot be taken, already translated — or nothing when it can.
 * The messages go through `react-mini-i18n`, keyed on their English text.
 */
export function checkMediaFile(
  file: { name: string; type: string; size: number },
  { accept, maxSize }: MediaFileRules
): string | undefined {
  if (!acceptsFile(file, accept)) {
    return translate("{{name}} is not an accepted file type ({{accept}}).", {
      name: file.name,
      accept: accept?.join(", ") ?? "",
    })
  }
  if (maxSize !== undefined && file.size > maxSize) {
    return translate("{{name}} is too large: {{max}} maximum.", {
      name: file.name,
      max: formatFileSize(maxSize),
    })
  }

  return undefined
}

/**
 * A data URL turned back into a file — what a cropped image is, before it goes
 * through the store like any other.
 */
export function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, data = ""] = dataUrl.split(",")
  const type = /^data:([^;,]+)/.exec(header)?.[1] ?? "application/octet-stream"
  const binary = header.includes(";base64") ? atob(data) : decodeURIComponent(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], name, { type })
}

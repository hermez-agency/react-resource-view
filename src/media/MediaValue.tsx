import type { ComponentType } from "react"
import { translate } from "react-mini-i18n"
import {
  FileArchive,
  FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { cn } from "@/ui/cn"
import {
  isImageType,
  isMediaFile,
  mimeTypeOf,
  type MediaFile,
} from "@/media/mediaFile"

/** The icon a file is shown with when it is not an image to preview. */
export function mediaFileIcon(type: string): ComponentType<{ className?: string }> {
  if (isImageType(type)) return FileImage
  if (
    type === "application/pdf" ||
    type.startsWith("text/") ||
    type.includes("word")
  )
    return FileText
  if (type.includes("sheet") || type.includes("excel") || type === "text/csv")
    return FileSpreadsheet
  if (type.includes("zip") || type.includes("compressed") || type.includes("tar"))
    return FileArchive
  return FileIcon
}

export interface MediaThumbnailProps {
  file: MediaFile
  className?: string
}

/** A file at a glance: the image itself when it is one, its icon otherwise. */
export function MediaThumbnail({ file, className }: MediaThumbnailProps) {
  const type = mimeTypeOf(file)
  const Icon = mediaFileIcon(type)

  return (
    <span
      data-slot="media-thumbnail"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground",
        className
      )}
    >
      {isImageType(type) ? (
        <img src={file.url} alt="" className="size-full object-cover" />
      ) : (
        <Icon className="size-5" />
      )}
    </span>
  )
}

/** How many files a table cell lists before it says how many more there are. */
const COMPACT_FILES = 2

export interface MediaValueProps {
  /** An image URL, a {@link MediaFile}, or a list of them. */
  value: unknown
  /** One line, for a table cell: smaller thumbnails, the names cut short. */
  compact?: boolean
  className?: string
}

/**
 * What a media field reads as outside its form: a thumbnail for an image, an
 * icon and a name — a link that downloads it — for a document.
 *
 * The media controllers draw it on a detail page and in a table cell, and the
 * lists' default rendering draws it for any value that is an image data URL or
 * a list of files, so a card shows the logo rather than a page of base64.
 */
export function MediaValue({ value, compact = false, className }: MediaValueProps) {
  if (typeof value === "string" && value) {
    return (
      <img
        data-slot="media-value"
        src={value}
        alt=""
        className={cn(
          "shrink-0 rounded-xl border border-border bg-muted object-cover",
          compact ? "size-8" : "size-20",
          className
        )}
      />
    )
  }

  const files = (Array.isArray(value) ? value : [value]).filter(isMediaFile)
  if (!files.length) {
    return <span className="text-muted-foreground">—</span>
  }
  // A cell stays one or two lines high: the first files, and how many more.
  const shown = compact ? files.slice(0, COMPACT_FILES) : files
  const more = files.length - shown.length

  return (
    <ul
      data-slot="media-value"
      className={cn(
        compact ? "flex flex-wrap gap-1.5" : "flex flex-col gap-2",
        className
      )}
    >
      {shown.map((file, index) => (
        <li key={file.url.slice(-24) + index} className="min-w-0">
          <a
            href={file.url}
            download={file.name}
            title={translate("Download {{name}}", { name: file.name })}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg text-sm hover:text-primary",
              compact && "max-w-40"
            )}
          >
            <MediaThumbnail
              file={file}
              className={compact ? "size-6 rounded-md [&_svg]:size-3.5" : "size-8"}
            />
            <span className="truncate">{file.name}</span>
          </a>
        </li>
      ))}
      {more > 0 && (
        <li className="self-center text-xs text-muted-foreground">
          {translate("+{{count}} more", { count: more })}
        </li>
      )}
    </ul>
  )
}

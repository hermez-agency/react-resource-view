import {
  createContext,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FC,
  type ReactNode,
} from "react"
import { Trans, translate } from "react-mini-i18n"
import { Crop, Download, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react"
import type { FormInputInterface } from "react-data-form"
import { Button, buttonVariants } from "@/ui/button"
import { cn } from "@/ui/cn"
import {
  checkMediaFile,
  formatFileSize,
  mimeTypeOf,
  storeAsDataUrl,
  type MediaFile,
  type MediaStore,
} from "@/media/mediaFile"
import { MediaThumbnail } from "@/media/MediaValue"

/* -------------------------------------------------------------------------- */
/* What can be swapped                                                        */
/* -------------------------------------------------------------------------- */

/** What the zone files are dropped on is given. */
export interface MediaDropzoneProps {
  /** Opens the browser's file picker. */
  open: () => void
  /** A file is being dragged over the zone. */
  isDragging: boolean
  /** Whether several files can be picked at once. */
  multiple: boolean
  /** A file is being stored: the zone takes nothing else meanwhile. */
  busy: boolean
  /** What is accepted, already translated: "PNG, JPG · 2 MB max". */
  hint: string
}

/** What the preview of the image input is given. */
export interface MediaImagePreviewProps {
  src: string
  /** On a detail page: the image, without its buttons. */
  readonly: boolean
  busy: boolean
  /** Picks another file in its place. */
  onReplace: () => void
  onRemove: () => void
  /** Opens the crop dialog — only when cropping is on and the image can be read. */
  onCrop?: () => void
}

/** What one entry of the file list is given. */
export interface MediaFileItemProps {
  file: MediaFile
  readonly: boolean
  onRemove: () => void
}

/**
 * The parts of a media input drawn by a component of the application rather
 * than the library's. Each one is optional; the others keep their default.
 */
export interface MediaInputComponents {
  dropzone?: FC<MediaDropzoneProps>
  imagePreview?: FC<MediaImagePreviewProps>
  fileItem?: FC<MediaFileItemProps>
}

/** What both media inputs accept, on the input or once on the factory. */
export interface MediaInputOptions {
  /**
   * The files taken, spelled as the `accept` attribute of a file input is:
   * MIME types (`application/pdf`), families (`image/*`) or extensions
   * (`.docx`). Everything, by default.
   */
  accept?: string[]
  /** The largest file taken, in bytes. */
  maxSize?: number
  /** Whether files can be dropped on the zone, rather than only picked. Defaults to `true`. */
  dragAndDrop?: boolean
  /**
   * What a picked file becomes in the record. The default reads it into a
   * base64 data URL; pass one that uploads it and resolves to the URL the API
   * answered with, and the record keeps that URL instead.
   */
  store?: MediaStore
  components?: MediaInputComponents
}

/** The `components` of a media input: the input's own decorator, plus the parts above. */
export type MediaFormInputComponents = FormInputInterface["components"] &
  MediaInputComponents

/**
 * Tells the media inputs they are drawn in a table cell, where a drop zone has
 * no room: they show their value, as on a detail page. Set by the table.
 */
export const MediaCompactContext = createContext(false)

/** Whether a media input should only show its value — and at which size. */
export function useMediaDisplay(formInput: FormInputInterface) {
  const compact = useContext(MediaCompactContext)

  return { readonly: compact || !!formInput.readonly, compact }
}

/** The options of the factory, under those of the input, components merged. */
export function mergeMediaOptions<Options extends MediaInputOptions>(
  defaults: Options,
  input: Partial<Options> & { components?: object }
): Options {
  return {
    ...defaults,
    ...input,
    components: { ...defaults.components, ...input.components },
  }
}

/* -------------------------------------------------------------------------- */
/* Picking, checking and storing                                              */
/* -------------------------------------------------------------------------- */

const ACCEPT_LABELS: Record<string, string> = {
  "image/*": "Images",
  "application/pdf": "PDF",
}

/** `["image/png", ".docx", "application/pdf"]` → `PNG, DOCX, PDF`. */
export function describeAccept(accept?: string[]): string {
  return (accept ?? [])
    .map((rule) => {
      if (ACCEPT_LABELS[rule]) return translate(ACCEPT_LABELS[rule])
      if (rule.startsWith(".")) return rule.slice(1).toUpperCase()
      const subtype = rule.split("/")[1] ?? rule
      return subtype === "*" ? rule : subtype.split(/[.+-]/).pop()!.toUpperCase()
    })
    .join(", ")
}

function hintFor({ accept, maxSize }: MediaInputOptions, maxFiles?: number): string {
  const parts = [
    describeAccept(accept),
    maxSize !== undefined
      ? translate("{{size}} max", { size: formatFileSize(maxSize) })
      : "",
    maxFiles !== undefined
      ? translate("{{count}} files max", { count: maxFiles })
      : "",
  ]

  return parts.filter(Boolean).join(" · ")
}

export interface UseMediaPickerOptions extends MediaInputOptions {
  multiple: boolean
  /** How many more files can be taken; nothing for no limit. */
  room?: number
  maxFiles?: number
  /** Receives the files that passed the checks. */
  onFiles: (files: File[]) => Promise<void> | void
}

/**
 * The machinery both inputs share: the hidden file input, the drag state, the
 * checks against `accept`, `maxSize` and `maxFiles`, and the errors they leave.
 */
export function useMediaPicker({
  multiple,
  room,
  maxFiles,
  onFiles,
  ...options
}: UseMediaPickerOptions) {
  const input = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const take = async (picked: File[]) => {
    const found: string[] = []
    let files = picked.filter((file) => {
      const error = checkMediaFile(file, options)
      if (error) found.push(error)
      return !error
    })
    if (!multiple) files = files.slice(0, 1)
    if (room !== undefined && files.length > room) {
      found.push(
        translate("Only {{count}} files can be attached.", {
          count: maxFiles ?? room,
        })
      )
      files = files.slice(0, Math.max(0, room))
    }
    setErrors(found)
    if (!files.length) return

    setBusy(true)
    try {
      await onFiles(files)
    } catch (error) {
      console.error(error)
      setErrors([...found, translate("The file could not be saved.")])
    } finally {
      setBusy(false)
    }
  }

  const dragAndDrop = options.dragAndDrop ?? true
  const dropHandlers = dragAndDrop
    ? {
        onDragOver: (event: DragEvent) => {
          event.preventDefault()
          setIsDragging(true)
        },
        onDragLeave: (event: DragEvent) => {
          event.preventDefault()
          setIsDragging(false)
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault()
          setIsDragging(false)
          if (!busy) void take(Array.from(event.dataTransfer.files ?? []))
        },
      }
    : {}

  const open = () => input.current?.click()

  const fileInput = (
    <input
      ref={input}
      type="file"
      hidden
      multiple={multiple}
      accept={options.accept?.join(",")}
      data-slot="media-file-input"
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        void take(Array.from(event.target.files ?? []))
        // The same file picked twice in a row is a change too.
        event.target.value = ""
      }}
    />
  )

  return {
    open,
    take,
    busy,
    errors,
    isDragging,
    dropHandlers,
    fileInput,
    hint: hintFor(options, maxFiles),
  }
}

/** Reads a file into a {@link MediaFile}, through the store. */
export async function toMediaFile(
  file: File,
  store: MediaStore = storeAsDataUrl
): Promise<MediaFile> {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: await store(file),
  }
}

/* -------------------------------------------------------------------------- */
/* The default parts                                                          */
/* -------------------------------------------------------------------------- */

/** The default drop zone: a dashed frame that opens the picker on a click. */
export function MediaDropzone({
  open,
  isDragging,
  multiple,
  busy,
  hint,
}: MediaDropzoneProps) {
  return (
    <button
      type="button"
      data-slot="media-dropzone"
      data-dragging={isDragging || undefined}
      onClick={open}
      disabled={busy}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-input px-4 py-6 text-center transition-colors",
        "hover:border-primary/60 hover:bg-primary/5 focus-visible:border-ring focus-visible:outline-none disabled:opacity-60",
        isDragging && "border-primary bg-primary/10"
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {multiple ? <Upload className="size-5" /> : <ImagePlus className="size-5" />}
      </span>
      <span className="text-sm font-medium">
        {busy ? (
          <Trans>Saving…</Trans>
        ) : multiple ? (
          <Trans>Drop files here, or click to browse</Trans>
        ) : (
          <Trans>Drop an image here, or click to browse</Trans>
        )}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  )
}

/** The default preview of the image input: the image, and what can be done to it. */
export function MediaImagePreview({
  src,
  readonly,
  busy,
  onReplace,
  onRemove,
  onCrop,
}: MediaImagePreviewProps) {
  return (
    <div
      data-slot="media-image-preview"
      className="flex flex-wrap items-center gap-4"
    >
      <img
        src={src}
        alt=""
        className="size-24 shrink-0 rounded-2xl border border-border bg-muted object-cover"
      />
      {!readonly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplace}
            disabled={busy}
          >
            <RefreshCw />
            <Trans>Replace</Trans>
          </Button>
          {onCrop && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCrop}
              disabled={busy}
            >
              <Crop />
              <Trans>Crop</Trans>
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            disabled={busy}
          >
            <Trash2 />
            <Trans>Remove</Trans>
          </Button>
        </div>
      )}
    </div>
  )
}

/** The default entry of the file list: what the file is, a download, a delete. */
export function MediaFileItem({ file, readonly, onRemove }: MediaFileItemProps) {
  const type = mimeTypeOf(file)

  return (
    <div
      data-slot="media-file-item"
      className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 pr-2"
    >
      <MediaThumbnail file={file} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[describeAccept(type ? [type] : []), formatFileSize(file.size)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <a
        href={file.url}
        download={file.name}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        aria-label={translate("Download {{name}}", { name: file.name })}
      >
        <Download />
      </a>
      {!readonly && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={translate("Remove {{name}}", { name: file.name })}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  )
}

/** The errors a pick left, under the input. */
export function MediaErrors({ errors }: { errors: string[] }): ReactNode {
  if (!errors.length) return null

  return (
    <ul role="alert" data-slot="media-errors" className="text-sm text-destructive">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  )
}

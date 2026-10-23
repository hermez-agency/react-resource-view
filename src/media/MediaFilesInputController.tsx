import { useRef, type FC } from "react"
import type { FormInputInterface, InputControllerInterface } from "react-data-form"
import {
  MediaDropzone,
  MediaErrors,
  MediaFileItem,
  mergeMediaOptions,
  toMediaFile,
  useMediaDisplay,
  useMediaPicker,
  type MediaFormInputComponents,
  type MediaInputOptions,
} from "@/media/mediaInput"
import { MediaValue } from "@/media/MediaValue"
import { isMediaFile, type MediaFile } from "@/media/mediaFile"

/** What the file list accepts besides the options both media inputs share. */
export interface MediaFilesInputOptions extends MediaInputOptions {
  /** How many files the list holds at most. No limit by default. */
  maxFiles?: number
}

/**
 * An input holding a list of files — the documents attached to a record. Its
 * value is an array of {@link MediaFile}: name, type, size and the URL the
 * store gave, a data URL by default.
 */
export interface MediaFilesFormInputInterface
  extends FormInputInterface, Omit<MediaFilesInputOptions, "components"> {
  value?: MediaFile[] | null
  components?: MediaFormInputComponents
}

/**
 * Builds the file list controller with defaults of its own, which every input
 * using it inherits and can still override.
 *
 * ```ts
 * const DocumentsController = mediaFilesInputControllerFactory({
 *   store: upload,
 *   components: { fileItem: DocumentRow },
 * })
 * ```
 */
export function mediaFilesInputControllerFactory(
  defaults: MediaFilesInputOptions = {}
): FC<InputControllerInterface<MediaFilesFormInputInterface>> {
  return function MediaFilesInputController({ formInput, onChange }) {
    const options = mergeMediaOptions<MediaFilesInputOptions>(defaults, formInput)
    const { readonly, compact } = useMediaDisplay(formInput)
    const files = Array.isArray(formInput.value)
      ? formInput.value.filter(isMediaFile)
      : []

    // Storing is asynchronous: by the time an upload answers, the list may
    // have lost an entry. Adding goes to the list as it is then, not as it was
    // when the files were picked.
    const latest = useRef(files)
    latest.current = files
    const change = (next: MediaFile[]) => onChange({ ...formInput, value: next })

    const room =
      options.maxFiles !== undefined
        ? Math.max(0, options.maxFiles - files.length)
        : undefined

    const picker = useMediaPicker({
      ...options,
      multiple: true,
      room,
      onFiles: async (picked) => {
        const stored = await Promise.all(
          picked.map((file) => toMediaFile(file, options.store))
        )
        change([...latest.current, ...stored])
      },
    })

    if (readonly) return <MediaValue value={files} compact={compact} />

    const Dropzone = options.components?.dropzone ?? MediaDropzone
    const Item = options.components?.fileItem ?? MediaFileItem

    return (
      <div
        data-slot="media-files-input"
        className="flex flex-col gap-2"
        {...picker.dropHandlers}
      >
        {picker.fileInput}
        {files.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {files.map((file, index) => (
              <li key={file.url.slice(-24) + index} className="min-w-0">
                <Item
                  file={file}
                  readonly={false}
                  onRemove={() =>
                    change(latest.current.filter((_, other) => other !== index))
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {room !== 0 && (
          <Dropzone
            open={picker.open}
            isDragging={picker.isDragging}
            multiple
            busy={picker.busy}
            hint={picker.hint}
          />
        )}
        <MediaErrors errors={picker.errors} />
      </div>
    )
  }
}

/** The file list, with the library's defaults: base64, every file type. */
export const MediaFilesInputController = mediaFilesInputControllerFactory()

/**
 * A file list, ready to drop into a form.
 *
 * ```ts
 * documents: createMediaFilesInput({
 *   label: "Documents",
 *   accept: ["application/pdf", "image/*"],
 *   maxSize: 2 * 1024 * 1024,
 *   maxFiles: 10,
 * })
 * ```
 */
export function createMediaFilesInput(
  props: Omit<MediaFilesFormInputInterface, "controller"> = {}
): MediaFilesFormInputInterface {
  return { ...props, controller: MediaFilesInputController as any }
}

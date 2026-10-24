import { useState, type FC } from "react"
import type { FormInputInterface, InputControllerInterface } from "react-data-form"
import { ImageCropDialog } from "@/media/ImageCropDialog"
import {
  MediaDropzone,
  MediaErrors,
  MediaImagePreview,
  mergeMediaOptions,
  useMediaDisplay,
  useMediaPicker,
  type MediaFormInputComponents,
  type MediaInputOptions,
} from "@/media/mediaInput"
import { MediaValue } from "@/media/MediaValue"
import { dataUrlToFile, storeAsDataUrl } from "@/media/mediaFile"

/** What the image input accepts besides the options both media inputs share. */
export interface MediaImageInputOptions extends MediaInputOptions {
  /**
   * Opens a crop dialog on every new image, and adds a "Crop" button to the
   * one kept. `{ aspect: 16 / 9 }` for a frame other than a square.
   */
  crop?: boolean | { aspect?: number }
}

/**
 * An input holding one image — a logo, an avatar, a cover. Its value is a
 * string: a data URL by default, or whatever the `store` resolved to.
 */
export interface MediaImageFormInputInterface
  extends FormInputInterface, Omit<MediaImageInputOptions, "components"> {
  value?: string | null
  components?: MediaFormInputComponents
}

/**
 * Builds the image controller with defaults of its own — a `store` that
 * uploads, a drop zone of the application — that every input using it
 * inherits. An input still overrides any of them.
 *
 * ```ts
 * const LogoController = mediaImageInputControllerFactory({ store: upload })
 * ```
 */
export function mediaImageInputControllerFactory(
  defaults: MediaImageInputOptions = {}
): FC<InputControllerInterface<MediaImageFormInputInterface>> {
  return function MediaImageInputController({ formInput, onChange }) {
    const options = mergeMediaOptions<MediaImageInputOptions>(defaults, formInput)
    const { readonly, compact } = useMediaDisplay(formInput)
    const store = options.store ?? storeAsDataUrl
    const crop = options.crop
    const aspect = typeof crop === "object" ? crop.aspect : undefined
    // The image waiting in the crop dialog, and the name it will be stored under.
    const [cropping, setCropping] = useState<{ src: string; name: string }>()

    const value = formInput.value || undefined
    const change = (next: string | null) => onChange({ ...formInput, value: next })

    const picker = useMediaPicker({
      ...options,
      accept: options.accept ?? ["image/*"],
      multiple: false,
      onFiles: async ([file]) => {
        if (crop) {
          setCropping({ src: await storeAsDataUrl(file), name: file.name })
          return
        }
        change(await store(file))
      },
    })

    if (readonly) {
      return <MediaValue value={value} compact={compact} />
    }

    const Dropzone = options.components?.dropzone ?? MediaDropzone
    const Preview = options.components?.imagePreview ?? MediaImagePreview
    // Cropping draws the image on a canvas, which only an image read from the
    // file itself allows: one served by another origin would taint it.
    const canCrop = !!crop && !!value?.startsWith("data:image/")

    return (
      <div
        data-slot="media-image-input"
        className="flex flex-col gap-2"
        {...picker.dropHandlers}
      >
        {picker.fileInput}
        {value ? (
          <Preview
            src={value}
            readonly={false}
            busy={picker.busy}
            onReplace={picker.open}
            onRemove={() => change(null)}
            onCrop={
              canCrop ? () => setCropping({ src: value, name: "image" }) : undefined
            }
          />
        ) : (
          <Dropzone
            open={picker.open}
            isDragging={picker.isDragging}
            multiple={false}
            busy={picker.busy}
            hint={picker.hint}
          />
        )}
        <MediaErrors errors={picker.errors} />

        {cropping && (
          <ImageCropDialog
            src={cropping.src}
            aspect={aspect}
            open
            onOpenChange={(open) => !open && setCropping(undefined)}
            onConfirm={async (dataUrl) => {
              const name = cropping.name
              setCropping(undefined)
              change(await store(dataUrlToFile(dataUrl, name)))
            }}
          />
        )}
      </div>
    )
  }
}

/** The image input, with the library's defaults: base64, every image type. */
export const MediaImageInputController =
  /* @__PURE__ */ mediaImageInputControllerFactory()

/**
 * An image input, ready to drop into a form.
 *
 * ```ts
 * logo: createMediaImageInput({ label: "Logo", maxSize: 512 * 1024, crop: true })
 * ```
 */
export function createMediaImageInput(
  props: Omit<MediaImageFormInputInterface, "controller"> = {}
): MediaImageFormInputInterface {
  return { ...props, controller: MediaImageInputController as any }
}

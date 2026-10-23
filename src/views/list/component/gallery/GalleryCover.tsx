import { ImageOff } from "lucide-react"
import { cn } from "@/ui/cn"
import type { GalleryAspect, GalleryFit } from "@/layout/layout"

// Written out in full, for the same reason as the grid of `ListCard`.
const ASPECT_CLASSES: Record<GalleryAspect, string> = {
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "16/9": "aspect-video",
}

export interface GalleryCoverProps {
  /** Where the image is; nothing draws the placeholder. */
  src?: string
  alt?: string
  aspect: GalleryAspect
  fit: GalleryFit
}

/** The picture heading a gallery card, or a placeholder holding its place. */
export function GalleryCover({ src, alt = "", aspect, fit }: GalleryCoverProps) {
  return (
    <div
      data-slot="gallery-cover"
      className={cn(
        "relative w-full overflow-hidden bg-muted text-muted-foreground",
        ASPECT_CLASSES[aspect]
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "size-full",
            fit === "contain" ? "object-contain" : "object-cover"
          )}
        />
      ) : (
        <div
          data-slot="gallery-cover-placeholder"
          className="flex size-full items-center justify-center"
        >
          <ImageOff aria-hidden className="size-8 opacity-50" />
        </div>
      )}
    </div>
  )
}

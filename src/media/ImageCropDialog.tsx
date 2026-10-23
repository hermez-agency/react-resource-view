import { useEffect, useRef, useState, type PointerEvent } from "react"
import { Trans, translate } from "react-mini-i18n"
import { ZoomIn } from "lucide-react"
import { Button } from "@/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import {
  centredOffset,
  clampOffset,
  cropRect,
  displayedSize,
  zoomAroundCentre,
  type Offset,
  type Size,
} from "@/media/cropArea"

export interface ImageCropDialogProps {
  /** The image to crop, as any URL an `<img>` reads — a data URL included. */
  src: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Receives the cropped image, as a data URL. */
  onConfirm: (dataUrl: string) => void
  /** Width over height of the frame. Defaults to 1, a square. */
  aspect?: number
}

/** The frame's longer side, in CSS pixels: room enough on a phone. */
const FRAME_SIDE = 272
/** The longer side of the image produced, in pixels. */
const OUTPUT_SIDE = 512
const MAX_ZOOM = 3

function frameFor(aspect: number): Size {
  return aspect >= 1
    ? { width: FRAME_SIDE, height: FRAME_SIDE / aspect }
    : { width: FRAME_SIDE * aspect, height: FRAME_SIDE }
}

/**
 * Frames an image before it is kept: drag it under the frame, zoom with the
 * slider, confirm. The crop is drawn on a canvas, so what comes out is a new
 * image rather than coordinates the reader of the record would have to apply.
 */
export function ImageCropDialog({
  src,
  open,
  onOpenChange,
  onConfirm,
  aspect = 1,
}: ImageCropDialogProps) {
  const frame = frameFor(aspect)
  const image = useRef<HTMLImageElement>(null)
  const [natural, setNatural] = useState<Size>()
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const drag = useRef<{ pointer: Offset; offset: Offset } | null>(null)

  // A new image starts centred, unzoomed.
  useEffect(() => {
    setNatural(undefined)
    setZoom(1)
  }, [src])

  const displayed = natural ? displayedSize(natural, frame, zoom) : undefined

  const onLoad = () => {
    const element = image.current
    if (!element) return
    const size = { width: element.naturalWidth, height: element.naturalHeight }
    setNatural(size)
    setOffset(centredOffset(displayedSize(size, frame, 1), frame))
  }

  const changeZoom = (next: number) => {
    if (!natural || !displayed) return
    const to = displayedSize(natural, frame, next)
    setOffset(zoomAroundCentre(offset, displayed, to, frame))
    setZoom(next)
  }

  const moveBy = (dx: number, dy: number, from: Offset = offset) => {
    if (!displayed) return
    setOffset(clampOffset({ x: from.x + dx, y: from.y + dy }, displayed, frame))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: { x: event.clientX, y: event.clientY }, offset }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    moveBy(
      event.clientX - start.pointer.x,
      event.clientY - start.pointer.y,
      start.offset
    )
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const confirm = () => {
    const element = image.current
    if (!element || !natural) return
    const rect = cropRect(natural, frame, zoom, offset)
    const scale = Math.min(1, OUTPUT_SIDE / Math.max(rect.width, rect.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(rect.width * scale)
    canvas.height = Math.round(rect.height * scale)
    canvas
      .getContext("2d")
      ?.drawImage(
        element,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
    // A photograph stays a JPEG; anything else — a logo, most of the time —
    // keeps its transparency.
    const type = src.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png"
    onConfirm(canvas.toDataURL(type, 0.9))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="media-crop-dialog">
        <DialogHeader>
          <DialogTitle>
            <Trans>Crop the image</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Drag the image to frame it, and zoom with the slider.</Trans>
          </DialogDescription>
        </DialogHeader>

        <div
          role="application"
          aria-label={translate("Image to crop — arrow keys move it")}
          tabIndex={0}
          className="relative mx-auto touch-none cursor-grab overflow-hidden rounded-2xl bg-muted outline-none ring-ring/30 focus-visible:ring-3 active:cursor-grabbing"
          style={{ width: frame.width, height: frame.height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 20 : 5
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            }
            const move = moves[event.key]
            if (!move) return
            event.preventDefault()
            moveBy(...move)
          }}
        >
          <img
            ref={image}
            src={src}
            alt=""
            draggable={false}
            onLoad={onLoad}
            className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
            style={
              displayed
                ? {
                    width: displayed.width,
                    height: displayed.height,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                  }
                : { visibility: "hidden" }
            }
          />
        </div>

        <label className="flex items-center gap-3">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">
            <Trans>Zoom</Trans>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={confirm} disabled={!natural}>
            <Trans>Apply</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

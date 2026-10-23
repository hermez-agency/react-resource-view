/**
 * The arithmetic of the crop dialog, kept apart from the component so that it
 * can be read — and tested — without a canvas.
 *
 * The image is drawn under a fixed frame: scaled so that it covers the frame at
 * zoom 1, then moved by an offset — the position of its top-left corner
 * relative to the frame's, never positive and never so negative that the frame
 * shows past the image's edge.
 */

export interface Size {
  width: number
  height: number
}

export interface Offset {
  x: number
  y: number
}

/** The scale at which the image just covers the frame. */
export function coverScale(image: Size, frame: Size): number {
  return Math.max(frame.width / image.width, frame.height / image.height)
}

/** The size the image is drawn at, for a zoom of 1 and more. */
export function displayedSize(image: Size, frame: Size, zoom: number): Size {
  const scale = coverScale(image, frame) * zoom

  return { width: image.width * scale, height: image.height * scale }
}

/** An offset moved back inside the range where the image still covers the frame. */
export function clampOffset(offset: Offset, displayed: Size, frame: Size): Offset {
  return {
    x: Math.min(0, Math.max(frame.width - displayed.width, offset.x)),
    y: Math.min(0, Math.max(frame.height - displayed.height, offset.y)),
  }
}

/** The offset that centres the image under the frame. */
export function centredOffset(displayed: Size, frame: Size): Offset {
  return {
    x: (frame.width - displayed.width) / 2,
    y: (frame.height - displayed.height) / 2,
  }
}

/**
 * Keeps the point under the frame's centre where it is while the zoom changes,
 * which is what a zoom slider is expected to do.
 */
export function zoomAroundCentre(
  offset: Offset,
  from: Size,
  to: Size,
  frame: Size
): Offset {
  const ratio = to.width / from.width
  const centre = { x: frame.width / 2, y: frame.height / 2 }

  return clampOffset(
    {
      x: centre.x - (centre.x - offset.x) * ratio,
      y: centre.y - (centre.y - offset.y) * ratio,
    },
    to,
    frame
  )
}

/** The rectangle of the source image the frame shows, in the image's pixels. */
export function cropRect(
  image: Size,
  frame: Size,
  zoom: number,
  offset: Offset
): { x: number; y: number; width: number; height: number } {
  const scale = coverScale(image, frame) * zoom

  return {
    x: (0 - offset.x) / scale,
    y: (0 - offset.y) / scale,
    width: frame.width / scale,
    height: frame.height / scale,
  }
}

import { describe, expect, it } from "vitest"
import {
  centredOffset,
  clampOffset,
  coverScale,
  cropRect,
  displayedSize,
  zoomAroundCentre,
} from "@/media/cropArea"

const frame = { width: 200, height: 200 }
const landscape = { width: 800, height: 400 }

describe("the crop arithmetic", () => {
  it("scales the image to cover the frame, and centres it", () => {
    expect(coverScale(landscape, frame)).toBe(0.5)

    const displayed = displayedSize(landscape, frame, 1)
    expect(displayed).toEqual({ width: 400, height: 200 })
    expect(centredOffset(displayed, frame)).toEqual({ x: -100, y: 0 })
  })

  it("never lets the frame show past the image's edge", () => {
    const displayed = displayedSize(landscape, frame, 1)

    expect(clampOffset({ x: 50, y: 30 }, displayed, frame)).toEqual({ x: 0, y: 0 })
    expect(clampOffset({ x: -500, y: -30 }, displayed, frame)).toEqual({
      x: -200,
      y: 0,
    })
  })

  it("keeps the centre where it is while zooming", () => {
    const from = displayedSize(landscape, frame, 1)
    const to = displayedSize(landscape, frame, 2)

    expect(zoomAroundCentre({ x: -100, y: 0 }, from, to, frame)).toEqual({
      x: -300,
      y: -100,
    })
  })

  it("maps the frame back onto the source image's pixels", () => {
    expect(cropRect(landscape, frame, 1, { x: -100, y: 0 })).toEqual({
      x: 200,
      y: 0,
      width: 400,
      height: 400,
    })
    expect(cropRect(landscape, frame, 2, { x: -300, y: -100 })).toEqual({
      x: 300,
      y: 100,
      width: 200,
      height: 200,
    })
  })
})

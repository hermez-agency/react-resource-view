import { describe, expect, it } from "vitest"
import {
  fitBounds,
  pointInFrame,
  project,
  readPosition,
  tileUrl,
  unproject,
  visibleTiles,
} from "@/views/list/component/map/mapProjection"

const PARIS = { lat: 48.8566, lng: 2.3522 }
const LYON = { lat: 45.764, lng: 4.8357 }

describe("the map's projection", () => {
  it("comes back to the position it started from", () => {
    const back = unproject(project(PARIS, 12), 12)

    expect(back.lat).toBeCloseTo(PARIS.lat, 6)
    expect(back.lng).toBeCloseTo(PARIS.lng, 6)
  })

  it("puts the centre of the frame in the middle of it", () => {
    expect(pointInFrame(PARIS, PARIS, 10, 800, 400)).toEqual({ left: 400, top: 200 })
  })

  it("frames every position, and a single one at street level", () => {
    const { center, zoom } = fitBounds([PARIS, LYON], 800, 420)
    for (const position of [PARIS, LYON]) {
      const { left, top } = pointInFrame(position, center, zoom, 800, 420)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left).toBeLessThanOrEqual(800)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(top).toBeLessThanOrEqual(420)
    }

    expect(fitBounds([PARIS], 800, 420)).toEqual({ center: PARIS, zoom: 13 })
  })

  it("covers the frame with tiles, wrapped around the antimeridian", () => {
    const tiles = visibleTiles({ lat: 0, lng: 179.9 }, 2, 600, 300)

    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every((t) => t.x >= 0 && t.x < 4)).toBe(true)
    expect(tileUrl("https://{s}.tiles/{z}/{x}/{y}.png", tiles[0])).toMatch(
      /^https:\/\/[abc]\.tiles\/2\/\d\/\d\.png$/
    )
  })

  it("reads a position from two fields, as numbers or numeric strings", () => {
    expect(readPosition({ lat: "48.85", lng: 2.35 }, "lat", "lng")).toEqual({
      lat: 48.85,
      lng: 2.35,
    })
    expect(readPosition({ lat: 200, lng: 2 }, "lat", "lng")).toBeUndefined()
    expect(readPosition({ lat: "", lng: 2 }, "lat", "lng")).toBeUndefined()
    expect(readPosition({}, "lat", "lng")).toBeUndefined()
  })
})

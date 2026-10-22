import { RecordOfAny } from "@/internal/type/RecordOfAny"

/** A point on the globe, in degrees. */
export interface GeoPosition {
  lat: number
  lng: number
}

/** The side of one map tile, in pixels — the one every tile server serves. */
export const TILE_SIZE = 256
export const MIN_ZOOM = 1
export const MAX_ZOOM = 18
/** Web Mercator stops here: beyond, the projection runs off to infinity. */
const MAX_LATITUDE = 85.05112878

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** A position as a pixel of the whole world drawn at `zoom`. */
export function project({ lat, lng }: GeoPosition, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom
  const sin = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

/** The position under a pixel of the world drawn at `zoom`. */
export function unproject({ x, y }: { x: number; y: number }, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom
  const n = Math.PI - (2 * Math.PI * y) / scale
  return {
    lat: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    lng: (x / scale) * 360 - 180,
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * A record's position, read from two fields. A value out of range — a latitude
 * of 200, a field holding a postcode — is no position, not a marker off the
 * edge of the world.
 */
export function readPosition(
  data: RecordOfAny | undefined,
  latitudeField: string,
  longitudeField: string
): GeoPosition | undefined {
  const lat = toNumber(data?.[latitudeField])
  const lng = toNumber(data?.[longitudeField])
  if (lat === undefined || lng === undefined) return undefined
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { lat, lng }
}

/**
 * The centre and the zoom showing every position inside a frame of `width` ×
 * `height` pixels, `padding` from its edges. A single position — or several on
 * the same spot — gets `singleZoom`, a street rather than the whole planet.
 */
export function fitBounds(
  positions: GeoPosition[],
  width: number,
  height: number,
  { padding = 48, singleZoom = 13 }: { padding?: number; singleZoom?: number } = {}
): { center: GeoPosition; zoom: number } {
  if (!positions.length) return { center: { lat: 20, lng: 0 }, zoom: 2 }

  const lats = positions.map((p) => p.lat)
  const lngs = positions.map((p) => p.lng)
  const north = Math.max(...lats)
  const south = Math.min(...lats)
  const east = Math.max(...lngs)
  const west = Math.min(...lngs)

  const centerAt = (zoom: number) => {
    const ne = project({ lat: north, lng: east }, zoom)
    const sw = project({ lat: south, lng: west }, zoom)
    return unproject({ x: (ne.x + sw.x) / 2, y: (ne.y + sw.y) / 2 }, zoom)
  }

  if (north === south && east === west) {
    return { center: { lat: north, lng: east }, zoom: singleZoom }
  }

  const room = {
    x: Math.max(1, width - padding * 2),
    y: Math.max(1, height - padding * 2),
  }
  for (let zoom = MAX_ZOOM; zoom > MIN_ZOOM; zoom--) {
    const ne = project({ lat: north, lng: east }, zoom)
    const sw = project({ lat: south, lng: west }, zoom)
    if (ne.x - sw.x <= room.x && sw.y - ne.y <= room.y) {
      return { center: centerAt(zoom), zoom: Math.min(zoom, singleZoom + 3) }
    }
  }
  return { center: centerAt(MIN_ZOOM), zoom: MIN_ZOOM }
}

export interface Tile {
  key: string
  /** The tile's column, wrapped around the antimeridian — what the server takes. */
  x: number
  y: number
  zoom: number
  /** Where it is drawn, from the frame's top-left corner. */
  left: number
  top: number
}

/** The tiles covering a frame of `width` × `height` centred on `center`. */
export function visibleTiles(
  center: GeoPosition,
  zoom: number,
  width: number,
  height: number
): Tile[] {
  const middle = project(center, zoom)
  const origin = { x: middle.x - width / 2, y: middle.y - height / 2 }
  const count = 2 ** zoom
  const tiles: Tile[] = []

  const firstX = Math.floor(origin.x / TILE_SIZE)
  const lastX = Math.floor((origin.x + width) / TILE_SIZE)
  const firstY = Math.max(0, Math.floor(origin.y / TILE_SIZE))
  const lastY = Math.min(count - 1, Math.floor((origin.y + height) / TILE_SIZE))

  for (let ty = firstY; ty <= lastY; ty++) {
    for (let tx = firstX; tx <= lastX; tx++) {
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        x: ((tx % count) + count) % count,
        y: ty,
        zoom,
        left: tx * TILE_SIZE - origin.x,
        top: ty * TILE_SIZE - origin.y,
      })
    }
  }
  return tiles
}

/** Where a position falls in the frame, from its top-left corner. */
export function pointInFrame(
  position: GeoPosition,
  center: GeoPosition,
  zoom: number,
  width: number,
  height: number
) {
  const point = project(position, zoom)
  const middle = project(center, zoom)
  return {
    left: point.x - middle.x + width / 2,
    top: point.y - middle.y + height / 2,
  }
}

/** A tile server's URL template — `{z}/{x}/{y}`, and `{s}` for a subdomain — filled in. */
export function tileUrl(template: string, { x, y, zoom }: Tile): string {
  return template
    .replace("{s}", "abc"[(x + y) % 3])
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
}

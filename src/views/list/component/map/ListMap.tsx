import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"
import { LocateFixed, MapPin, Minus, Plus } from "lucide-react"
import { Trans, translate } from "react-mini-i18n"
import ListPagination from "@/views/list/component/ListPagination"
import { EventPreview } from "@/views/list/component/preview/EventPreview"
import { Button } from "@/ui/button"
import { cn } from "@/ui/cn"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import type { MapLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { ListComponentPropsInterface, RowInterface } from "@/ViewResource"
import {
  fitBounds,
  type GeoPosition,
  MAX_ZOOM,
  MIN_ZOOM,
  pointInFrame,
  project,
  readPosition,
  TILE_SIZE,
  tileUrl,
  unproject,
  visibleTiles,
} from "@/views/list/component/map/mapProjection"

export const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
export const DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors"

/** The width assumed before the frame is measured — and where nothing measures it. */
const FALLBACK_WIDTH = 800
/** How far an arrow key moves the map, in pixels. */
const KEY_PAN = 80

/** Measures the frame, and follows it when the page is resized. */
function useFrameWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth)
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

export function ListMap({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<MapLayoutOptions>().options
  const currentResource = useCurrentViewResourceContext()
  const titleField = options.titleField ?? currentResource?.view?.titleField
  const latitudeField = options.latitudeField ?? "latitude"
  const longitudeField = options.longitudeField ?? "longitude"
  const { getPosition } = options
  const height = options.height ?? 420
  const template = options.tileUrl ?? DEFAULT_TILE_URL
  const attribution = options.attribution ?? DEFAULT_ATTRIBUTION

  const [frameRef, width] = useFrameWidth()

  const markers = useMemo(
    () =>
      rows.flatMap((row) => {
        const data = row.data as RecordOfAny
        const position = getPosition
          ? getPosition(row.data)
          : readPosition(data, latitudeField, longitudeField)
        return position ? [{ row, position }] : []
      }),
    [rows, getPosition, latitudeField, longitudeField]
  )
  const unplaced = rows.length - markers.length

  const fitted = useMemo(
    () =>
      fitBounds(
        markers.map((marker) => marker.position),
        width,
        height
      ),
    [markers, width, height]
  )

  // `null` while the reader has not moved the map: it then follows the
  // records, and frames the next page as it framed this one.
  const [moved, setMoved] = useState<{ center: GeoPosition; zoom: number } | null>(
    null
  )
  const { center, zoom } = moved ?? fitted

  const panBy = (dx: number, dy: number, from = center) => {
    const point = project(from, zoom)
    setMoved({ center: unproject({ x: point.x + dx, y: point.y + dy }, zoom), zoom })
  }
  const zoomBy = (step: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + step))
    setMoved({ center, zoom: next })
  }

  const drag = useRef<{ x: number; y: number; from: GeoPosition } | null>(null)
  const [dragging, setDragging] = useState(false)
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A marker opens its record; only the map itself is dragged.
    if ((event.target as HTMLElement).closest("[data-map-marker],button")) return
    drag.current = { x: event.clientX, y: event.clientY, from: center }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const { x, y, from } = drag.current
    panBy(x - event.clientX, y - event.clientY, from)
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const moves: Record<string, () => void> = {
      ArrowLeft: () => panBy(-KEY_PAN, 0),
      ArrowRight: () => panBy(KEY_PAN, 0),
      ArrowUp: () => panBy(0, -KEY_PAN),
      ArrowDown: () => panBy(0, KEY_PAN),
      "+": () => zoomBy(1),
      "=": () => zoomBy(1),
      "-": () => zoomBy(-1),
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    move()
  }

  const tiles = visibleTiles(center, zoom, width, height)

  return (
    <div className="w-full">
      <div
        ref={frameRef}
        data-slot="map"
        role="region"
        aria-label={translate("Map")}
        aria-roledescription={translate("map")}
        tabIndex={0}
        className="relative w-full touch-none overflow-hidden rounded-2xl border border-border bg-muted outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height, cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tileUrl(template, tile)}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none dark:brightness-[0.8] dark:contrast-[1.1]"
            style={{
              left: tile.left,
              top: tile.top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
          />
        ))}

        {markers.map(({ row, position }, index) => {
          const { left, top } = pointInFrame(position, center, zoom, width, height)
          if (left < -24 || top < -24 || left > width + 24 || top > height + 24) {
            return null
          }
          return (
            <MapMarker
              key={
                getIdFromObject(row.data, false, currentResource.resource) ??
                "marker-" + index
              }
              row={row}
              title={getRecordTitle(row.data, titleField) ?? ""}
              left={left}
              top={top}
            />
          )
        })}

        <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none"
            aria-label={translate("Zoom in")}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => zoomBy(1)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none border-t border-border"
            aria-label={translate("Zoom out")}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => zoomBy(-1)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none border-t border-border"
            aria-label={translate("Show every record")}
            disabled={!moved}
            onClick={() => setMoved(null)}
          >
            <LocateFixed className="size-4" />
          </Button>
        </div>

        <div className="absolute right-0 bottom-0 rounded-tl-md bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
          {attribution}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {unplaced > 0 ? (
            <Trans params={{ count: String(unplaced) }}>
              {"{{count}} records have no position and are not on the map"}
            </Trans>
          ) : (
            <Trans params={{ count: String(markers.length) }}>
              {"{{count}} records on the map"}
            </Trans>
          )}
        </p>
        <ListPagination />
      </div>
    </div>
  )
}

function MapMarker({
  row,
  title,
  left,
  top,
}: {
  row: RowInterface
  title: string
  left: number
  top: number
}) {
  return (
    <Popover>
      <PopoverTrigger
        data-map-marker=""
        aria-label={title || translate("Record")}
        title={title}
        // The pin's tip, not its middle, stands on the position.
        className={cn(
          "absolute flex size-8 -translate-x-1/2 -translate-y-full items-end justify-center text-primary drop-shadow transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none motion-reduce:transition-none",
          row.pending && "opacity-60"
        )}
        style={{ left, top }}
      >
        <MapPin className="size-8 fill-background" strokeWidth={2.25} />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <EventPreview row={row} title={title} />
      </PopoverContent>
    </Popover>
  )
}

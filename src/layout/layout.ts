import { FC } from "react"
import { FormInterface, ValueOptionInterface } from "react-data-form"
import {
  CalendarDays,
  CalendarRange,
  ChartColumn,
  Columns2,
  Columns3,
  List,
  ListTree as ListTreeIcon,
  LucideIcon,
  MapPinned,
  Rows2,
  Table,
} from "lucide-react"
import type { FieldOf, FormDefinition } from "@/ResourceDefinition"
import type {
  IconType,
  ItemComponentPropsInterface,
  ListComponentPropsInterface,
  RowComponentPropsInterface,
  RowInterface,
} from "@/ViewResource"
import { ItemTable } from "@/views/list/component/table/ItemTable"
import { ListTable } from "@/views/list/component/table/ListTable"
import { RowTable } from "@/views/list/component/table/RowTable"
import { ListCard } from "@/views/list/component/card/ListCard"
import { DumpItemComponent } from "@/views/list/component/dump/DumpItemComponent"
import { DumpRowComponent } from "@/views/list/component/dump/DumpRowComponent"
import ListColumn from "@/views/list/component/columns/ListColumn"
import RowColumn from "@/views/list/component/columns/RowColumn"
import { ListCalendar } from "@/views/list/component/calendar/ListCalendar"
import { PreviewRowComponent } from "@/views/list/component/preview/PreviewRowComponent"
import ListTimeline from "@/views/list/component/timeline/ListTimeline"
import ListSplit from "@/views/list/component/split/ListSplit"
import { ListItem } from "@/views/list/component/item/ListItem"
import { ListTree } from "@/views/list/component/tree/ListTree"
import { ListMap } from "@/views/list/component/map/ListMap"
import { ListChart } from "@/views/list/component/chart/ListChart"
import type { GeoPosition } from "@/views/list/component/map/mapProjection"
import type {
  ChartAggregate,
  ChartInterval,
} from "@/views/list/component/chart/chartData"
import { checkLayoutOptions } from "@/definition/validateDefinition"

/**
 * The layouts a list can be shown in, one function each:
 *
 * ```ts
 * import { layout } from "react-resource-view"
 *
 * views: {
 *   list: {
 *     layouts: [
 *       layout.board({ groupBy: "status", columns: STATUSES }),
 *       layout.table(),
 *     ],
 *   },
 * }
 * ```
 *
 * Inside a declaration typed `createViewResource<Task>(…)`, the field options
 * — `groupBy`, `dateField`, `fields`… — are checked against `Task`. A layout
 * built on its own is typed by giving the item: `layout.board<Task>({ … })`.
 */

/** The components a layout draws a list with. */
export interface LayoutComponents {
  /** The whole collection. */
  list: FC<ListComponentPropsInterface>
  /** One record. */
  row?: FC<RowComponentPropsInterface>
  /** One field of a record. */
  item?: FC<ItemComponentPropsInterface>
}

/** What a layout may declare it can draw — see `Layout.supports`. */
export type LayoutSupport = "inline"

/** What every layout accepts. */
export interface LayoutOptions<Item = any> {
  /**
   * The layout's identifier in the URL (`?variant=board`). Defaults to its
   * type, so renaming its label breaks no shared link. Needed only to declare
   * the same layout twice.
   */
  id?: string
  /** What the layout switcher shows. Defaults to the layout's type, capitalised. */
  label?: string
  icon?: IconType
  /** Gives this layout the page's whole width — see `fullWidth` on the resource. */
  fullWidth?: boolean
  /**
   * The fields this layout shows, in order — the table's columns, the card's
   * lines. Defaults to every input of the form.
   */
  fields?: NoInfer<FieldOf<Item>>[]
  /** Adjusts the form for this layout only, merged over the resource's. */
  form?: FormDefinition
  /** Replaces the row or the field component of this layout. */
  components?: Partial<LayoutComponents>
}

/**
 * A layout, as `layout.*` builds it. `Item` only types the declaration it goes
 * into.
 */
export interface Layout<Item = any, Options extends object = Record<string, any>> {
  readonly type: string
  readonly id: string
  readonly label: string
  readonly icon?: IconType
  readonly fullWidth?: boolean
  readonly fields?: string[]
  readonly form?: FormDefinition
  readonly components: LayoutComponents
  /**
   * What the layout can draw besides its records: `"inline"`, a view opened
   * under the row of its record (see `open.custom({ placement: "inline" })`).
   * A view opened inline over a layout without it falls back to a dialog.
   */
  readonly supports?: readonly LayoutSupport[]
  /** The layout's own options — `groupBy`, `dateField`… — with their defaults. */
  readonly options: Options
  /** @internal Carries `Item` for the type checker; never set. */
  readonly __item?: (item: Item) => Item
}

/** A layout inside a built view: its form merged with the view's. */
export interface ResolvedLayout<
  Options extends object = Record<string, any>,
> extends Omit<Layout<any, Options>, "form"> {
  readonly form?: FormInterface
}

/* -------------------------------------------------------------------------- */
/* Options of each layout                                                     */
/* -------------------------------------------------------------------------- */

export interface TableLayoutOptions {
  /**
   * Keeps the row actions' column pinned to the right edge, so the buttons stay
   * in reach however wide the table is. Defaults to `true`.
   */
  stickyActions?: boolean
  /** Pins the first column (the name) to the left edge. Defaults to `false`. */
  stickyFirstColumn?: boolean
}

export interface CardsLayoutOptions {
  /** Cards per row on a desktop, from 1 to 6. Defaults to 4. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * A click on a card opens the record's `read` view where that view says —
 * `views.read.open` — and links to its page as `views.read.expandable` says.
 * Its cards are selected and moved together as `views.list.selectable` says,
 * and `views.list.bulkActions` come up beside "Move to…".
 */
export interface BoardLayoutOptions<Item = any> {
  /**
   * The field a card's column is read from — and written to when the card is
   * dropped in another column.
   */
  groupBy: NoInfer<FieldOf<Item>>
  /** The columns, in order: one per value of `groupBy`. */
  columns: ValueOptionInterface[]
  /** The field a card is titled with. */
  titleField?: NoInfer<FieldOf<Item>>
}

export type CalendarMode = "day" | "week" | "month"

export interface CalendarLayoutOptions<Item = any> {
  /** The date a record is placed on. Defaults to `"dueDate"`. */
  dateField?: NoInfer<FieldOf<Item>>
  /** Where a record spanning several days ends. */
  endDateField?: NoInfer<FieldOf<Item>>
  titleField?: NoInfer<FieldOf<Item>>
  /** The field a record's colour is derived from. */
  colorField?: NoInfer<FieldOf<Item>>
  /** The period shown first. Defaults to `"month"`. */
  mode?: CalendarMode
  /** The first hour of the day and week grids. Defaults to 7. */
  hourStart?: number
  /** The last hour of the day and week grids. Defaults to 21. */
  hourEnd?: number
  /** The icon drawn on an event; `undefined` for none. */
  getIcon?: (row: RowInterface<Record<string, unknown>>) => LucideIcon | undefined
}

export interface TimelineGroupInterface {
  id: string
  label: string
  sublabel?: string
}

export interface TimelineLayoutOptions<Item = any> {
  /** Where a bar starts. Defaults to `"startDate"`. */
  startField?: NoInfer<FieldOf<Item>>
  /** Where a bar ends. Defaults to `"endDate"`. */
  endField?: NoInfer<FieldOf<Item>>
  /** Defaults to `"title"`. */
  titleField?: NoInfer<FieldOf<Item>>
  /** The field whose values make the rows — a room, a person, a vehicle. */
  groupBy?: NoInfer<FieldOf<Item>>
  /** The header of the column listing the rows: "Rooms", "Staff"… */
  groupsLabel?: string
  /** The row of the records with no group. Defaults to "Unassigned". */
  unassignedLabel?: string
  /** Whether that row is shown. Defaults to `true`. */
  showUnassigned?: boolean
  /** The field a bar's colour is read from. Defaults to `"state"`. */
  statusField?: NoInfer<FieldOf<Item>>
  /** A colour per value of `statusField`. */
  colorByStatus?: Record<string, string>
  /** The rows, when they are not simply the values of `groupBy`. */
  resolveGroups?: (rows: RowInterface<Item & object>[]) => TimelineGroupInterface[]
  /** The row of one record, when it is not its `groupBy` value. */
  resolveGroupForRow?: (data: Item) => TimelineGroupInterface | undefined
  /** How many days are shown. Defaults to 14. */
  daysToShow?: number
}

export interface SplitLayoutOptions {
  /** Drawn on the right while no record is selected. */
  emptyState?: FC
  /**
   * The split already shows a record beside the list, so `read/{id}` can land
   * on `list/{id}` instead of a page of its own — for the links coming from a
   * notification, an e-mail, a share.
   */
  readInList?: boolean
  /** What the right-hand side shows. Defaults to `"update"`. */
  action?: "read" | "update"
}

/** A plain list takes only the options every layout takes. */
export type ItemsLayoutOptions = object

/**
 * A record is placed under the record its `parentField` points at — an IRI, an
 * identifier, or the parent object itself. Only the page on screen is arranged:
 * a record whose parent is not on it is a root.
 */
export interface TreeLayoutOptions<Item = any> {
  /** The field naming a record's parent. Defaults to `"parent"`. */
  parentField?: NoInfer<FieldOf<Item>>
  /** The field a node is titled with. */
  titleField?: NoInfer<FieldOf<Item>>
  /** Whether the branches start open. Defaults to `true`. */
  defaultExpanded?: boolean
}

export type { GeoPosition }

/**
 * A marker per record with a position, on map tiles of any server. Nothing is
 * geocoded: a resource holding an address rather than coordinates resolves it
 * in `getPosition`, or stores the coordinates its API computed.
 */
export interface MapLayoutOptions<Item = any> {
  /** Defaults to `"latitude"`. */
  latitudeField?: NoInfer<FieldOf<Item>>
  /** Defaults to `"longitude"`. */
  longitudeField?: NoInfer<FieldOf<Item>>
  /**
   * A record's position, when it is not in two fields — a `[lng, lat]` pair, a
   * nested `location`. `undefined` leaves the record off the map.
   */
  getPosition?: (item: Item) => GeoPosition | undefined
  titleField?: NoInfer<FieldOf<Item>>
  /** The map's height, in pixels. Defaults to 420. */
  height?: number
  /**
   * The tiles' URL, `{z}`, `{x}`, `{y}` (and `{s}`) filled in. Defaults to
   * OpenStreetMap's, whose usage policy suits a demo, not heavy traffic.
   */
  tileUrl?: string
  /** The credit the tile server asks for. Defaults to OpenStreetMap's. */
  attribution?: string
}

/**
 * Figures over the records of the page: a count, a total and an average in
 * tiles, and a chart — one bar per value of `groupBy`, or one column per period
 * of `dateField`.
 */
export interface ChartLayoutOptions<Item = any> {
  /** The field whose values make the bars. */
  groupBy?: NoInfer<FieldOf<Item>>
  /** The bars' labels and order, as a board's `columns`. */
  groups?: ValueOptionInterface[]
  /** Charts over time instead: one column per period of this date. */
  dateField?: NoInfer<FieldOf<Item>>
  /** The period of a column. Defaults to `"month"`. */
  interval?: ChartInterval
  /** The number summed or averaged; without it, records are counted. */
  valueField?: NoInfer<FieldOf<Item>>
  /** What `valueField` is called in the tiles. Defaults to its name. */
  valueLabel?: string
  /** Defaults to `"sum"` with a `valueField`, `"count"` without. */
  aggregate?: ChartAggregate
  /** The chart's title. Defaults to what it measures. */
  title?: string
  /** How a figure is written — a currency, a unit. */
  format?: (value: number) => string
}

/* -------------------------------------------------------------------------- */
/* The factories                                                              */
/* -------------------------------------------------------------------------- */

const BASE_KEYS = [
  "id",
  "label",
  "icon",
  "fullWidth",
  "fields",
  "form",
  "components",
] as const

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

interface BuildParams<Options extends object> {
  type: string
  icon: IconType
  components: LayoutComponents
  supports?: LayoutSupport[]
  /** The options this type accepts, besides the common ones. */
  optionKeys: readonly string[]
  defaults: Partial<Options>
}

function build<Item, Options extends object>(
  { type, icon, components, supports, optionKeys, defaults }: BuildParams<Options>,
  args: (LayoutOptions<Item> & Record<string, any>) | undefined
): Layout<Item, Options> {
  const given = args ?? {}
  checkLayoutOptions(type, given, [...BASE_KEYS, ...optionKeys])

  const options: Record<string, any> = { ...defaults }
  for (const key of optionKeys) {
    if (given[key] !== undefined) options[key] = given[key]
  }

  return {
    type,
    id: given.id ?? type,
    label: given.label ?? capitalise(type),
    icon: given.icon ?? icon,
    fullWidth: given.fullWidth,
    fields: given.fields as string[] | undefined,
    form: given.form,
    components: { ...components, ...given.components },
    supports,
    options: options as Options,
  }
}

/** A table, one column per field, editable in place. The default layout. */
function table<Item = any>(
  options?: LayoutOptions<Item> & TableLayoutOptions
): Layout<Item, TableLayoutOptions> {
  return build<Item, TableLayoutOptions>(
    {
      type: "table",
      icon: Table,
      components: { list: ListTable, row: RowTable, item: ItemTable },
      supports: ["inline"],
      optionKeys: ["stickyActions", "stickyFirstColumn"],
      defaults: { stickyActions: true, stickyFirstColumn: false },
    },
    options
  )
}

/** A grid of cards. */
function cards<Item = any>(
  options?: LayoutOptions<Item> & CardsLayoutOptions
): Layout<Item, CardsLayoutOptions> {
  return build<Item, CardsLayoutOptions>(
    {
      type: "cards",
      icon: Rows2,
      components: { list: ListCard, row: DumpRowComponent, item: DumpItemComponent },
      supports: ["inline"],
      optionKeys: ["columns"],
      defaults: { columns: 4 },
    },
    options
  )
}

/**
 * A Kanban board: one column per value of `groupBy`. Dropping a card in
 * another column writes the new value back.
 */
function board<Item = any>(
  options: LayoutOptions<Item> & BoardLayoutOptions<Item>
): Layout<Item, BoardLayoutOptions<Item>> {
  return build<Item, BoardLayoutOptions<Item>>(
    {
      type: "board",
      icon: Columns3,
      components: { list: ListColumn, row: RowColumn, item: DumpItemComponent },
      optionKeys: ["groupBy", "columns", "titleField"],
      defaults: {},
    },
    options
  )
}

/** A calendar, by day, week or month. */
function calendar<Item = any>(
  options?: LayoutOptions<Item> & CalendarLayoutOptions<Item>
): Layout<Item, CalendarLayoutOptions<Item>> {
  return build<Item, CalendarLayoutOptions<Item>>(
    {
      type: "calendar",
      icon: CalendarDays,
      // What the window opening on an event holds: a summary, not the record
      // in full. A resource with something better to show declares its own.
      components: {
        list: ListCalendar,
        row: PreviewRowComponent,
        item: DumpItemComponent,
      },
      optionKeys: [
        "dateField",
        "endDateField",
        "titleField",
        "colorField",
        "mode",
        "hourStart",
        "hourEnd",
        "getIcon",
      ],
      defaults: {
        dateField: "dueDate" as never,
        mode: "month",
        hourStart: 7,
        hourEnd: 21,
      },
    },
    options
  )
}

/** A timeline: one row per group, one bar per record. */
function timeline<Item = any>(
  options?: LayoutOptions<Item> & TimelineLayoutOptions<Item>
): Layout<Item, TimelineLayoutOptions<Item>> {
  return build<Item, TimelineLayoutOptions<Item>>(
    {
      type: "timeline",
      icon: CalendarRange,
      components: {
        list: ListTimeline,
        row: PreviewRowComponent,
        item: DumpItemComponent,
      },
      optionKeys: [
        "startField",
        "endField",
        "titleField",
        "groupBy",
        "groupsLabel",
        "unassignedLabel",
        "showUnassigned",
        "statusField",
        "colorByStatus",
        "resolveGroups",
        "resolveGroupForRow",
        "daysToShow",
      ],
      defaults: {
        startField: "startDate" as never,
        endField: "endDate" as never,
        titleField: "title" as never,
        statusField: "state" as never,
        daysToShow: 14,
        unassignedLabel: "Unassigned",
        showUnassigned: true,
      },
    },
    options
  )
}

/** The list on the left, the selected record on the right. */
function split<Item = any>(
  options?: LayoutOptions<Item> & SplitLayoutOptions
): Layout<Item, SplitLayoutOptions> {
  return build<Item, SplitLayoutOptions>(
    {
      type: "split",
      icon: Columns2,
      components: { list: ListSplit, row: RowColumn, item: DumpItemComponent },
      optionKeys: ["emptyState", "readInList", "action"],
      defaults: { action: "update" },
    },
    options
  )
}

/** A plain list of records, one per line. */
function items<Item = any>(
  options?: LayoutOptions<Item> & ItemsLayoutOptions
): Layout<Item, ItemsLayoutOptions> {
  return build<Item, ItemsLayoutOptions>(
    {
      type: "items",
      icon: List,
      components: { list: ListItem, row: DumpRowComponent, item: DumpItemComponent },
      supports: ["inline"],
      optionKeys: [],
      defaults: {},
    },
    options
  )
}

/** A tree: each record under its parent, the branches folded and unfolded. */
function tree<Item = any>(
  options?: LayoutOptions<Item> & TreeLayoutOptions<Item>
): Layout<Item, TreeLayoutOptions<Item>> {
  return build<Item, TreeLayoutOptions<Item>>(
    {
      type: "tree",
      icon: ListTreeIcon,
      components: {
        list: ListTree,
        row: DumpRowComponent,
        item: DumpItemComponent,
      },
      supports: ["inline"],
      optionKeys: ["parentField", "titleField", "defaultExpanded"],
      defaults: { parentField: "parent" as never, defaultExpanded: true },
    },
    options
  )
}

/** A map, one marker per record with a position. */
function map<Item = any>(
  options?: LayoutOptions<Item> & MapLayoutOptions<Item>
): Layout<Item, MapLayoutOptions<Item>> {
  return build<Item, MapLayoutOptions<Item>>(
    {
      type: "map",
      icon: MapPinned,
      components: {
        list: ListMap,
        row: PreviewRowComponent,
        item: DumpItemComponent,
      },
      optionKeys: [
        "latitudeField",
        "longitudeField",
        "getPosition",
        "titleField",
        "height",
        "tileUrl",
        "attribution",
      ],
      defaults: {
        latitudeField: "latitude" as never,
        longitudeField: "longitude" as never,
        height: 420,
      },
    },
    options
  )
}

/** Figures and a chart over the records, as a small dashboard. */
function chart<Item = any>(
  options?: LayoutOptions<Item> & ChartLayoutOptions<Item>
): Layout<Item, ChartLayoutOptions<Item>> {
  return build<Item, ChartLayoutOptions<Item>>(
    {
      type: "chart",
      icon: ChartColumn,
      components: {
        list: ListChart,
        row: DumpRowComponent,
        item: DumpItemComponent,
      },
      optionKeys: [
        "groupBy",
        "groups",
        "dateField",
        "interval",
        "valueField",
        "valueLabel",
        "aggregate",
        "title",
        "format",
      ],
      defaults: { interval: "month" },
    },
    options
  )
}

/** What `layout.custom` takes. */
export interface CustomLayoutOptions<
  Item = any,
  Options extends object = object,
> extends Omit<LayoutOptions<Item>, "components"> {
  /** The layout's type — its default `id` and `label`. */
  type: string
  /** The components it draws with; `list` at least. */
  components: LayoutComponents
  /** Its own options, read back with `useLayout().options`. */
  options?: Options
  /**
   * What its list component draws besides the records: `["inline"]` when it
   * draws `<InlineChildView row={row} />` under each of them.
   */
  supports?: LayoutSupport[]
}

/**
 * A layout of one's own: a list component, optionally a row and an item
 * component, and options read back with `useLayout()`. See
 * `npx react-resource-view create-layout`.
 */
function custom<Item = any, Options extends object = object>({
  type,
  components,
  options,
  supports,
  ...rest
}: CustomLayoutOptions<Item, Options>): Layout<Item, Options> {
  const given = { ...rest, components } as LayoutOptions<Item>
  checkLayoutOptions(type, given, BASE_KEYS)

  return {
    type,
    id: given.id ?? type,
    label: given.label ?? capitalise(type),
    icon: given.icon,
    fullWidth: given.fullWidth,
    fields: given.fields as string[] | undefined,
    form: given.form,
    components: { item: DumpItemComponent, row: DumpRowComponent, ...components },
    supports,
    options: (options ?? {}) as Options,
  }
}

export const layout = {
  table,
  cards,
  board,
  calendar,
  timeline,
  split,
  items,
  tree,
  map,
  chart,
  custom,
}

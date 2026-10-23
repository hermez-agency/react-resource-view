import { FC, ReactNode } from "react"
import { ActionList, FormInputInterface, FormInterface } from "react-data-form"
import { IdAbleInterface, JsonLdCollection } from "jsonld-item"
import { ApiDialectInterface } from "@/api/apiDialectInterface"
import type { RealtimeOptions } from "@/api/realtime"
import type { ViewResourceContext } from "@/ViewResourceContext"
import type { Layout } from "@/layout/layout"
import type { ViewResource, IconType, BulkActionInterface } from "@/ViewResource"
import type { FilterInterface } from "@/views/list/filter/useFilter"
import type { ListPreset } from "@/views/list/savedViews/savedViews"
import type { OpenMode } from "@/open/open"

/**
 * What a resource declares — the object handed to `createViewResource`.
 *
 * Everything common to the five actions sits at the root; what belongs to one
 * action sits in `views.<action>`. The two are merged deeply, root first, so a
 * view only says what differs: `views.update.form.inputs.status` adjusts one
 * field and keeps the others.
 *
 * Read {@link ViewResource} for what the library builds out of it.
 */

/* -------------------------------------------------------------------------- */
/* Shared vocabulary                                                          */
/* -------------------------------------------------------------------------- */

/**
 * One of the five things a resource can show. A plain string — `"update"` —
 * which is what the autocompletion offers; `ActionList.update` is the same
 * value and is still accepted.
 */
export type Action = "list" | "read" | "create" | "update" | "delete" | ActionList

/**
 * What a permission is asked about: the five actions, the CSV export, and
 * moving a card to another column of a board.
 */
export type PermissionKey = `${ActionList}` | "export" | "move"

/**
 * The name of a field of `Item`, as the autocompletion offers it. A typo is a
 * TypeScript error, even on an item extending `BaseJsonLdItemInterface`: its
 * `[key: string]: any` signature is dropped, only the literal keys count. With
 * `Item` left untyped, any string goes.
 */
export type FieldOf<Item> = 0 extends 1 & Item
  ? string
  : Extract<
      keyof {
        [Key in keyof Item as string extends Key ? never : Key]: Item[Key]
      },
      string
    >

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

/** What a permission function is told. */
export interface PermissionContext<Item = any> {
  /** The action asked about. */
  action: PermissionKey
  /**
   * The record the action would apply to — the row of a list, the record of a
   * form. Absent for `list`, `create`, `export`, and for a button drawn
   * outside any record.
   */
  item?: Item
  /** The view context the question is asked from, when there is one. */
  context?: ViewResourceContext
}

/**
 * Whether an action is offered: a boolean, or a function of the record — which
 * may answer asynchronously.
 *
 * It decides what the interface offers, not what the API accepts: the API
 * stays the place where access is enforced.
 */
export type Permission<Item = any> =
  boolean | ((context: PermissionContext<Item>) => boolean | Promise<boolean>)

/**
 * What a resource lets its users do. Everything is allowed by default — only
 * restrictions are declared.
 *
 * - `"all"` — every action, the export included (the default);
 * - `"readonly"` — `list`, `read` and `export`;
 * - a list of actions — those, and nothing else;
 * - an object — one permission per action; the actions it leaves out stay
 *   allowed.
 *
 * `move` — dropping a card in another column of a board — answers as `update`
 * unless it is declared: `{ update: false, move: true }` moves the cards
 * without offering the edit form.
 *
 * ```ts
 * permissions: { delete: ({ item }) => item?.status !== "done" }
 * ```
 */
export type Permissions<Item = any> =
  | "all"
  | "readonly"
  | PermissionKey[]
  | Partial<Record<PermissionKey, Permission<Item>>>

/* -------------------------------------------------------------------------- */
/* Data: repository, hooks, quota                                             */
/* -------------------------------------------------------------------------- */

/** What every repository call and every hook receives besides its payload. */
export interface ResourceContext {
  /** The view the call comes from, when it comes from one. */
  viewResourceContext?: ViewResourceContext
}

/**
 * What a hand-written `getCollection` may answer with: the rows and, when the
 * API says, how many match across every page. A JSON-LD collection is accepted
 * too, so a repository wrapping API Platform needs no conversion.
 */
export type RepositoryCollection<Item = any> =
  | { items: Item[]; totalItems?: number; nextCursor?: string | null }
  | JsonLdCollection<Item>

/**
 * The calls a hand-written `repository` implements. Whatever the resource's
 * API, the record to read or delete always arrives as `{ id }` — a string, the
 * `idField` of the record or its short identifier — and the record to update
 * carries that same `id`. No `@id`, no IRI, no raw segment to tell apart.
 */
export interface RepositoryDefinition<
  Item = any,
  Write extends object = Item & object,
> {
  getCollection: (
    params?: Record<string, any>,
    context?: ResourceContext
  ) => Promise<{ data: RepositoryCollection<Item> }>
  getItem: (
    params: { id: string },
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  createItem: (
    item: Partial<Write>,
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  updateItem: (
    item: Partial<Write> & { id: string },
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  removeItem: (params: { id: string }, context?: ResourceContext) => Promise<unknown>
}

/** The five calls a resource makes to its data. */
export interface Repository<Item = any, Write extends object = Item & object> {
  getCollection: (
    params?: Record<string, any>,
    context?: ResourceContext
  ) => Promise<{ data: JsonLdCollection<Item> }>
  getItem: (
    params: IdAbleInterface,
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  createItem: (
    item: Partial<Write>,
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  updateItem: (
    item: Partial<Write>,
    context?: ResourceContext
  ) => Promise<{ data: Item }>
  removeItem: (
    params: IdAbleInterface,
    context?: ResourceContext
  ) => Promise<unknown>
}

type MaybePromise<T> = T | Promise<T>

/**
 * Code run around the calls to the data. Every hook gets the context of the
 * view it is called from, and may answer asynchronously.
 *
 * The `before*` hooks return what goes out — the query, the identifier, the
 * payload — so they can add to it or reshape it. The `after*` hooks are told
 * what came back.
 */
export interface ResourceHooks<Item = any, Write extends object = Item & object> {
  /** The query of a list: filters, page, page size. */
  beforeList?: (
    params: Record<string, any> | undefined,
    context: ResourceContext
  ) => MaybePromise<Record<string, any> | undefined>
  /** The identifier of the record about to be read. */
  beforeRead?: (
    params: IdAbleInterface,
    context: ResourceContext
  ) => MaybePromise<IdAbleInterface>
  /** The payload of a creation. */
  beforeCreate?: (
    data: Partial<Write>,
    context: ResourceContext
  ) => MaybePromise<Partial<Write>>
  /** The payload of an update. */
  beforeUpdate?: (
    data: Partial<Write>,
    context: ResourceContext
  ) => MaybePromise<Partial<Write>>
  /** The record about to be deleted. */
  beforeDelete?: (
    item: IdAbleInterface,
    context: ResourceContext
  ) => MaybePromise<IdAbleInterface>
  /** The record the API answered with, after a creation or an update. */
  afterSave?: (
    item: Item,
    context: ResourceContext & { action: "create" | "update" }
  ) => MaybePromise<void>
  /** The record that was deleted. */
  afterDelete?: (
    item: IdAbleInterface,
    context: ResourceContext
  ) => MaybePromise<void>
}

/** How many records exist, and how many are allowed at most. */
export interface QuotaState {
  current: number
  /** `Infinity` means unlimited. */
  max: number
}

export interface QuotaFallbackProps {
  /** The state of the quota when the fallback is drawn. */
  quota: QuotaState
}

/**
 * How many records may be created. Not a pagination: the list shows every
 * page; the quota only hides the create button — or draws `fallback` in its
 * place — once `current >= max`.
 */
export interface Quota {
  /**
   * Counts. It receives the view context, so a count can be read off the rows
   * already loaded; it may as well ask the API.
   */
  get: (context: ViewResourceContext) => QuotaState | Promise<QuotaState>
  /** Drawn in place of the create button once the quota is reached. */
  fallback?: FC<QuotaFallbackProps>
}

/**
 * A resource with a single record — settings, a profile, a private note. It
 * has no list: its menu entry opens the record, and when there is none yet the
 * creation form is drawn instead, ready to create it.
 *
 * Name the record by its `id` (`GET {path}/{id}`), or fetch it with `get` when
 * the API serves it at a path of its own (`GET /api/settings/me`). `get`
 * resolves to `undefined` or `null` when the record does not exist; so does an
 * `id` the API answers 404 to. Saving an existing record goes through
 * `updateItem`, so a `get` at a path of its own usually comes with a
 * `repository.updateItem` at that same path.
 */
export type SingletonDefinition<Item = any> = {
  /** Which view the menu entry opens. Defaults to `"update"`. */
  action?: Extract<Action, "read" | "update">
  /** What the creation form starts with when the record does not exist yet. */
  defaultData?: object
} & (
  | { id: string | number; get?: never }
  | {
      id?: never
      get: (context: ResourceContext) => MaybePromise<Item | null | undefined>
    }
)

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What a form does once the record is saved.
 *
 * - `"close"` — leave the form: the dialog or the drawer closes; on a page,
 *   back to the list;
 * - `"stay"` — keep the form on screen; after a creation on a page it moves to
 *   the record just created;
 * - `"read"` — go to the page of the record just saved;
 * - `"reload"` — stay, and fill the form again with what the API answered;
 * - `{ redirect }` — go where the function says, given the saved record.
 *
 * Defaults to `"close"` in a dialog or a drawer, `"stay"` on a page.
 */
export type AfterSave<Item = any> =
  "close" | "stay" | "read" | "reload" | { redirect: (item: Item) => string }

/**
 * A form as `react-data-form` describes it, except that an input may be
 * `false`: a view removes a field it inherits with `inputs: { notes: false }`.
 * The keys are the fields of `Data`; an input that is not a field of the item
 * (a password confirmation…) is declared by naming it in the second generic,
 * `createViewResource<User, User & { confirm: string }>`.
 */
export type FormDefinition<Data extends object = any> = Omit<
  FormInterface<Data>,
  "inputs"
> & {
  inputs?: { [Key in FieldOf<Data>]?: FormInputInterface | false }
}

/** The components a view is drawn with, by slot. */
export interface ComponentSlots {
  /** Replaces the whole view — the list, the form, the confirmation. */
  view?: FC
  /** Wraps the view — a layout of the application, a frame. */
  wrapper?: FC<{ children: ReactNode }>
  /** Replaces the whole header `AdminLayout` draws above the view. */
  navigation?: FC
  /** Replaces the title of that header, the back link and the breadcrumb kept. */
  title?: FC
  /** Replaces the actions on the right of that header. */
  actions?: FC
  /** Drawn above the view. */
  top?: FC
  /** Drawn below the view. */
  bottom?: FC
  /** Replaces the pagination of a list. */
  pagination?: FC
  /** Drawn when a list has nothing to show. */
  empty?: FC
  /**
   * Drawn when the view could not load its records — the API down, a 500, a
   * 403. Defaults to a message saying what the API answered, and "Try again".
   */
  error?: FC<LoadErrorProps>
}

/** What the `error` component of a view is given. */
export interface LoadErrorProps {
  /** What the failed request threw — read it with `normalizeApiError`. */
  error?: unknown
  /** Loads the view again. */
  retry: () => void
}

/**
 * The components a view can be drawn with. Declared at the root, they reach
 * every action; in `views.<action>`, that action. Each level only replaces the
 * keys it names, and `null` removes one it inherits. How a list draws its rows
 * belongs to its layouts: `layout.cards({ components: { row: ProductRow } })`.
 */
export type ViewComponents = {
  [Slot in keyof ComponentSlots]?: ComponentSlots[Slot] | null
}

/** What every view of a resource accepts, at the root as well as per action. */
export interface CommonViewOptions<
  Item = any,
  Write extends object = Item & object,
> {
  /** Shared by the forms of every action, the table's columns and the cards. */
  form?: FormDefinition<Write>
  /**
   * Gives the view the page's whole width in `AdminLayout`. The most specific
   * declaration wins: layout, then action, then root.
   */
  fullWidth?: boolean
  /**
   * The field that names a record — `email` for an account known by its
   * address. Read by the header, the breadcrumb, the board's cards; without it
   * they try `title`, `name` and `label`.
   */
  titleField?: FieldOf<Item>
  /** Extra classes for the view's container. */
  className?: string
  components?: ViewComponents
  /** A sentence under the title of the list. */
  description?: string
}

/** What an action's view accepts besides the common options. */
export interface ActionViewOptions {
  /**
   * The title of the view. Derived from the resource's `name` — "Tasks",
   * "Create — Tasks", "Edit — Tasks" — so declare it only to say something
   * else.
   */
  title?: string
  /** The text of the button opening this action. Defaults to the action. */
  buttonLabel?: string
}

/** The view of a record's sub-views: tabs under its form or its page. */
export interface TabsDefinition<Item = any> {
  /**
   * `horizontal`, the default, is a bar above the tab; `vertical` a column
   * beside it — the shape a record with a dozen tabs wants. Below the `md`
   * breakpoint the column falls back to the bar.
   */
  orientation?: "horizontal" | "vertical"
  /** Drawn beside the tabs on a desktop, above them on a phone. */
  aside?: FC
  items: TabDefinition<Item>[]
}

/** What a tab built from the parent record receives. */
export interface TabContext<Item = any> {
  /** The record the tabs are drawn under. */
  item: Item
  /** The view context of that record. */
  parent: ViewResourceContext
}

/**
 * One tab: another resource, filtered on the record on screen — or a
 * component of one's own.
 */
export interface TabDefinition<Item = any> {
  /** In the URL. Defaults to the resource's identifier. */
  id?: string
  /** Defaults to the resource's `name`. */
  label?: string
  description?: string
  /** Defaults to the resource's `icon`. */
  icon?: IconType
  /** The resource the tab shows, or its identifier. */
  resource?: ViewResource | string
  /** Which of its views. Defaults to `"list"`. */
  action?: Action
  /** Narrows the tab to the record on screen: `({ item }) => ({ post: item["@id"] })`. */
  filter?: FilterInterface | ((context: TabContext<Item>) => FilterInterface)
  /**
   * What a record created from the tab starts with — so "new comment" means a
   * comment *of this post*.
   */
  defaultData?: object | ((context: TabContext<Item>) => object)
  /** A component of one's own, in place of a resource. */
  component?: FC
}

/** Which way a field is sorted. */
export type SortDirection = "asc" | "desc"

/** The sort of a list, field by field: `{ createdAt: "desc" }`. */
export type SortState<Item = any> = Partial<
  Record<FieldOf<Item> | (string & {}), SortDirection>
>

/**
 * Which fields the list can be sorted by, and the sort it opens on. The sort
 * goes to the API — every dialect knows how to spell it — and into the URL.
 */
export interface SortDefinition<Item = any> {
  /**
   * The fields a click on their column header sorts by. None by default: an
   * API only sorts by the fields it was told to.
   */
  fields?: NoInfer<FieldOf<Item>>[]
  /** The sort applied as long as the URL carries none. */
  initial?: SortState<Item>
}

/**
 * An action run on every selected record of a list at once — or `"delete"`,
 * which deletes them after a confirmation, record by record, as far as
 * `permissions.delete` allows.
 */
export type BulkAction<Item = any> = "delete" | BulkActionInterface<Item & object>

/**
 * What the list says when it holds no record: `views.list.empty`. The icon and
 * the title default to the resource's own, so a resource rarely declares more.
 */
export interface EmptyStateDefinition {
  /** Defaults to the resource's `icon`. */
  icon?: IconType
  /** Shown when the list is empty without any filter. Defaults to the resource's name. */
  title?: string
  /** Under the title; a component for something richer than a sentence. */
  body?: string | FC
  /** Shown instead of `title` when a filter is active. */
  filteredTitle?: string
}

/** `views.list` */
export interface ListViewDefinition<Item = any, Write extends object = Item & object>
  extends CommonViewOptions<Item, Write>, ActionViewOptions {
  /**
   * The layouts the list can be shown in — `layout.table()`, `layout.board()`…
   * — the first one being the one it opens on. Defaults to a table.
   */
  layouts?: Layout<Item>[]
  /**
   * The filter bar above the list, and the filters applied before any is chosen.
   * Its keys are not checked against the item: a filter is often no field of
   * it (`search`, `createdAt[after]`).
   */
  filters?: FormDefinition<any> & {
    /**
     * Filters applied as long as the URL carries none: they go out with the
     * first request and pre-fill the filter bar.
     */
    initial?: FilterInterface
  }
  /** How many records a page holds. Sent to the API, whatever its dialect. */
  pageSize?: number
  /**
   * What the list says when it holds no record, with and without a filter —
   * the latter offering to clear it. The create button shows only where
   * `permissions.create` allows it. `components.empty` replaces all of it.
   */
  empty?: EmptyStateDefinition
  /**
   * The buttons at the end of each row, in order. Defaults to
   * `["update", "delete"]`; permissions still apply on top.
   */
  rowActions?: (
    | Extract<Action, "read" | "update" | "delete">
    | ActionList.read
    | ActionList.update
    | ActionList.delete
  )[]
  /** The columns a click sorts by, and the sort the list opens on. */
  sort?: SortDefinition<Item>
  /**
   * Views declared in code — a name over filters, a sort, a layout and
   * columns — drawn as tabs above the list, whatever `savedViews` says. Each
   * has a URL: `?savedView=<id>`.
   */
  presets?: ListPreset<Item>[]
  /**
   * Lets the reader save the filters, sort, layout and columns on screen under
   * a name, and come back to them from a tab — create, rename, duplicate,
   * delete. They are kept by the `savedViews` port (`configurePorts`):
   * `localStorage` by default, or an API to share them between users.
   */
  savedViews?: boolean
  /**
   * Whether records can be selected — a checkbox on the table's rows, the
   * cards, the items; Ctrl/Cmd+click, Shift+click and a long press on the
   * board. Defaults to `true` on a board, whose cards are moved together, and
   * elsewhere to whether `bulkActions` declares any.
   */
  selectable?: boolean
  /**
   * The actions run on the selected records, in the bar that comes up once
   * one is selected, in every layout that draws a selection.
   */
  bulkActions?: BulkAction<Item>[]
}

interface OpenableViewDefinition {
  /**
   * Where the view is drawn when it is opened from another — a row's button,
   * a board's card: the whole `page`, a `dialog` over it, a `drawer` sliding
   * in — from the right on a desktop, from the bottom on a phone —, a frame
   * of one's own built with `open.custom()`, or the name of one registered
   * with `configureResourceView({ open })`. Anything but `page` is written
   * into the URL under the view it was opened from, so a link, Back and a
   * reload find it as it was. Defaults to `"dialog"` for `delete`, `"page"`
   * otherwise.
   */
  open?: OpenMode
  /**
   * In a dialog, a drawer or a frame of one's own, an "Open in full page"
   * link beside the close button — a real link, so Ctrl/Cmd+click opens a new tab. Defaults to
   * `true` for `read` and `update`, whose content may be long, `false` for
   * `create` and `delete`.
   */
  expandable?: boolean
}

interface OptimisticViewDefinition {
  /**
   * Draw the result of this action before the API answers, and put things
   * back if it refuses. Defaults to the resource's `optimistic`, itself
   * `true`. `views.delete.optimistic: false` waits for the API before a row
   * goes.
   */
  optimistic?: boolean
}

/** `views.read` */
export interface ReadViewDefinition<Item = any, Write extends object = Item & object>
  extends CommonViewOptions<Item, Write>, ActionViewOptions, OpenableViewDefinition {
  tabs?: TabsDefinition<Item>
}

/** `views.create` */
export interface CreateViewDefinition<
  Item = any,
  Write extends object = Item & object,
>
  extends
    CommonViewOptions<Item, Write>,
    ActionViewOptions,
    OpenableViewDefinition,
    OptimisticViewDefinition {
  afterSave?: AfterSave<Item>
}

/** `views.update` */
export interface UpdateViewDefinition<
  Item = any,
  Write extends object = Item & object,
> extends CreateViewDefinition<Item, Write> {
  tabs?: TabsDefinition<Item>
}

/** `views.delete` */
export interface DeleteViewDefinition<
  Item = any,
  Write extends object = Item & object,
>
  extends
    CommonViewOptions<Item, Write>,
    ActionViewOptions,
    OpenableViewDefinition,
    OptimisticViewDefinition {}

export interface ViewsDefinition<Item = any, Write extends object = Item & object> {
  list?: ListViewDefinition<Item, Write>
  read?: ReadViewDefinition<Item, Write>
  create?: CreateViewDefinition<Item, Write>
  update?: UpdateViewDefinition<Item, Write>
  delete?: DeleteViewDefinition<Item, Write>
}

/* -------------------------------------------------------------------------- */
/* The declaration                                                            */
/* -------------------------------------------------------------------------- */

export interface ResourceDefinition<
  Item = any,
  Write extends object = Item & object,
> extends CommonViewOptions<Item, Write> {
  /** What the resource is called — the menu, the titles, the breadcrumb. */
  name?: string
  icon?: IconType
  /** Another identifier the resource answers to in a URL. */
  alias?: string

  /** The API path of the collection: `"/api/tasks"`. */
  path?: string
  /**
   * Keeps the records in the browser's `localStorage` instead of an API — a
   * demo, a prototype. Declared, because a forgotten `path` must not look like
   * a working API.
   */
  storage?: "local"
  /**
   * How this resource's API spells its URLs, pages, filters and errors.
   * Defaults to the dialect given to `configureApi`.
   */
  dialect?: ApiDialectInterface
  /** Replaces some or all of the calls to the data. */
  repository?: Partial<RepositoryDefinition<Item, Write>>
  /**
   * The field holding a record's identity, for an API whose records carry no
   * JSON-LD `@id` — `idField: "id"`. Links, keys, selection and the `{ id }`
   * given to a `repository` are built from it. Defaults to what the dialect
   * reads (`@id` then `id` for JSON-LD).
   */
  idField?: string
  /** Code run around the calls to the data. */
  hooks?: ResourceHooks<Item, Write>
  /**
   * Reloads the views when the API pushes a change. `true` listens to the
   * dialect's own channel (Mercure, for the JSON-LD dialect); `subscribe`
   * plugs another one and returns what closes it. Held while the views are
   * mounted, let go when they are not.
   */
  realtime?: boolean | RealtimeOptions
  /**
   * Draw every write — a form saved, a row deleted, a cell edited in place, a
   * card moved — before the API answers: the row changes at once, the API's
   * answer replaces it when it comes, and a refusal puts it back with a
   * message. Defaults to `true`; `views.<action>.optimistic` decides per
   * action (an in-place edit and a card moved are updates).
   */
  optimistic?: boolean

  /** What the users may do. Everything, unless restricted here. */
  permissions?: Permissions<Item>
  /** How many records may be created. */
  quota?: Quota
  /**
   * Makes the resource a single record rather than a collection: the menu
   * opens it directly, and creates it when it does not exist.
   */
  singleton?: SingletonDefinition<Item>

  /** What is particular to one action. */
  views?: ViewsDefinition<Item, Write>
}

/**
 * The defaults given to `configureResourceView`: the shape of a declaration,
 * merged beneath every resource.
 */
export type ResourceDefaults = Omit<
  ResourceDefinition,
  "name" | "icon" | "alias" | "path" | "repository"
>

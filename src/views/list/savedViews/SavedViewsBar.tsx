import { useEffect, useRef, useState } from "react"
import { Copy, Ellipsis, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Trans, translate } from "react-mini-i18n"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { useLocation } from "@/ports"
import { ReservedFilterKeys } from "@/api/apiDialectInterface"
import { setUrlParam } from "@/internal/url/setUrlParam"
import { cleanValuesInObject } from "@/internal/object/cleanValuesInObject"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog"
import {
  columnPreferencesKey,
  readColumnPreferences,
  writeColumnPreferences,
} from "@/views/list/component/table/columnPreferences"
import {
  withPresetIds,
  type SavedView,
  type SavedViewInput,
} from "@/views/list/savedViews/savedViews"
import { useSavedViews } from "@/views/list/savedViews/useSavedViews"

/** The tab of the list as it opens, before any view is chosen. */
const ALL = "all"

/** The query parameter a view is written under: `?savedView=late-tasks`. */
export const SAVED_VIEW_PARAM = "savedView"

type DialogState =
  { kind: "create" } | { kind: "rename" | "duplicate" | "delete"; view: SavedView }

/**
 * The tabs above a list: the views declared in code (`presets`) and, with
 * `savedViews`, those a reader saved — a name over the filters, the sort, the
 * layout and the columns on screen. Choosing one applies it and writes
 * `?savedView=<id>` into the URL, next to the filter and the layout it sets.
 */
export function SavedViewsBar() {
  const { view } = useCurrentViewResourceContext()
  if (!view.savedViews && view.presets.length === 0) return null

  return <Bar />
}

function Bar() {
  const currentResource = useCurrentViewResourceContext()
  const { view, parentResource, viewVariant, setViewResource } = currentResource
  const { filterContext } = useListViewContext()
  const { searchStr } = useLocation()
  const resourceId = String(currentResource.resourceId)
  const store = useSavedViews(resourceId, view.savedViews)
  const presets = withPresetIds(view.presets)
  const views: SavedView[] = [...presets, ...store.views]

  const fromUrl = new URLSearchParams(searchStr).get(SAVED_VIEW_PARAM)
  const [activeId, setActiveId] = useState<string>(fromUrl ?? ALL)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const active = views.find((candidate) => candidate.id === activeId)
  const isStored = store.views.some((candidate) => candidate.id === activeId)

  const apply = (target: SavedView | undefined) => {
    const layout = view.layouts.find((candidate) => candidate.id === target?.layout)
    // A view is the whole state: what it does not say falls back to the list's
    // own, the filters declared as `initial` and the sort it opens on.
    filterContext.resetFilter({
      ...target?.filter,
      [ReservedFilterKeys.order]: target?.sort ?? view.sort?.initial,
    })
    if (layout) {
      setViewResource((current) => ({ ...current, viewVariant: layout.id }))
      if (!parentResource) setUrlParam("variant", layout.id)
    }
    if (target?.columns) {
      writeColumnPreferences(
        columnPreferencesKey(resourceId, layout?.id ?? viewVariant ?? "table"),
        {
          order: target.columns.order ?? [],
          hidden: target.columns.hidden ?? [],
        }
      )
    }
  }

  const choose = (id: string) => {
    setActiveId(id)
    if (!parentResource) setUrlParam(SAVED_VIEW_PARAM, id === ALL ? null : id)
    apply(views.find((candidate) => candidate.id === id))
  }

  // A link to a view — `?savedView=late-tasks` — applies it once, unless the
  // URL already carries the filter or the layout: the page was reloaded, and
  // what the reader changed since stays.
  const linked = useRef(false)
  useEffect(() => {
    if (linked.current || !fromUrl) return
    const target = views.find((candidate) => candidate.id === fromUrl)
    if (!target) {
      // Saved views arrive from the store: wait for them before giving up.
      if (store.loaded) linked.current = true
      return
    }
    linked.current = true
    const params = new URLSearchParams(searchStr)
    if (!params.has("filter") && !params.has("variant")) apply(target)
  })

  /** The state on screen, as a view remembers it. */
  const snapshot = (name: string): SavedViewInput => {
    const {
      [ReservedFilterKeys.order]: sort,
      [ReservedFilterKeys.page]: _page,
      [ReservedFilterKeys.cursor]: _cursor,
      [ReservedFilterKeys.itemsPerPage]: _itemsPerPage,
      ...filter
    } = currentResource.filter ?? {}
    const layout = viewVariant ?? view.layouts[0]?.id

    return {
      name,
      filter: cleanValuesInObject(filter),
      sort,
      layout,
      columns: layout
        ? (readColumnPreferences(columnPreferencesKey(resourceId, layout)) ??
          undefined)
        : undefined,
    }
  }

  const submit = async (name: string) => {
    if (!dialog || dialog.kind === "delete") return
    if (dialog.kind === "create") {
      const created = await store.create(snapshot(name))
      if (created) choose(created.id)
    } else if (dialog.kind === "rename") {
      await store.update(dialog.view.id, { name })
    } else {
      // A copy keeps what the view remembers, not the name nor the id.
      const { id: _id, ...state } = dialog.view
      const created = await store.create({ ...state, name })
      if (created) choose(created.id)
    }
    setDialog(null)
  }

  const confirmDelete = async () => {
    if (dialog?.kind !== "delete") return
    if (await store.remove(dialog.view.id)) {
      if (activeId === dialog.view.id) choose(ALL)
    }
    setDialog(null)
  }

  return (
    <div data-slot="saved-views" className="flex flex-wrap items-center gap-2">
      <Tabs value={activeId} onValueChange={(id) => choose(String(id))}>
        <TabsList aria-label={translate("Saved views")}>
          <TabsTrigger value={ALL}>
            <Trans>All</Trans>
          </TabsTrigger>
          {views.map((candidate) => (
            <TabsTrigger key={candidate.id} value={candidate.id}>
              {candidate.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {active && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={translate("View options")}
                data-slot="saved-view-options"
              />
            }
          >
            <Ellipsis />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto gap-1 p-2">
            {isStored && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog({ kind: "rename", view: active })}
                >
                  <Pencil />
                  <Trans>Rename</Trans>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const { name: _name, ...state } = snapshot(active.name)
                    void store.update(active.id, state)
                  }}
                >
                  <RefreshCw />
                  <Trans>Update with the current state</Trans>
                </Button>
              </>
            )}
            {view.savedViews && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ kind: "duplicate", view: active })}
              >
                <Copy />
                <Trans>Duplicate</Trans>
              </Button>
            )}
            {isStored && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ kind: "delete", view: active })}
              >
                <Trash2 />
                <Trans>Delete</Trans>
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}
      {view.savedViews && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialog({ kind: "create" })}
        >
          <Plus />
          <Trans>Save the current view</Trans>
        </Button>
      )}

      {dialog && dialog.kind !== "delete" && (
        <NameDialog
          key={dialog.kind}
          initial={
            dialog.kind === "rename"
              ? dialog.view.name
              : dialog.kind === "duplicate"
                ? translate("{{name}} (copy)", { name: dialog.view.name })
                : ""
          }
          onSubmit={submit}
          onClose={() => setDialog(null)}
        />
      )}
      <AlertDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.kind === "delete" ? dialog.view.name : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>This cannot be undone.</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trans>Delete</Trans>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Asks for the name of a view — to save it, rename it, or name its copy. */
function NameDialog({
  initial,
  onSubmit,
  onClose,
}: {
  initial: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const trimmed = name.trim()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmed) onSubmit(trimmed)
          }}
        >
          <DialogHeader>
            <DialogTitle>
              <Trans>View name</Trans>
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label={translate("View name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={!trimmed}>
              <Trans>Save</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ActionList } from "react-data-form"
import { translate } from "react-mini-i18n"
import { getPorts } from "@/ports"
import { useScopeContext } from "@/scope/Scope"
import { createItemMenuWithResource, MenuItemInterface } from "@/menu/menu"
import { generateLink } from "@/routes/routes"
import { permissionResource } from "@/utils/permissionResource"
import { getCollectionItems } from "@/api/collection"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { isExternalHref } from "@/internal/url/externalLink"
import { Dialog, DialogContent, DialogTitle } from "@/ui/dialog"
import { cn } from "@/ui/cn"
import type { ViewResource } from "@/ViewResource"

/** What `commandPalette` takes on an `AdminLayout`. */
export interface CommandPaletteOptions {
  /**
   * Also looks the typed text up in the records: each resource that names a
   * `titleField` is asked for the records whose title matches it, through the
   * same filter its list uses. Off by default — it is one request per
   * resource and per search.
   */
  searchable?: boolean
}

interface PaletteEntry {
  id: string
  group: "Go to" | "Actions" | "Records"
  label: string
  href: string
}

/** Records asked of each resource, per search. */
const RECORDS_PER_RESOURCE = 5
const SEARCH_DELAY = 200

function flatten(items: MenuItemInterface[]): MenuItemInterface[] {
  return items
    .filter((item) => !item.hidden)
    .flatMap((item) => [item, ...flatten(item.items ?? [])])
}

function titleFieldOf(resource: ViewResource): string | undefined {
  return resource.views.list.titleField ?? resource.views.read.titleField
}

/**
 * The entries the declaration alone gives: the scope's menu, and one "create"
 * per resource — each kept only once the resource has allowed it.
 */
function useStaticEntries(open: boolean): PaletteEntry[] {
  const scope = useScopeContext()?.scope
  const [entries, setEntries] = useState<PaletteEntry[]>([])

  useEffect(() => {
    if (!open || !scope) return
    let cancelled = false
    const resources = scope.resources ?? []
    const listLinks = new Map(
      resources.map((resource) => [
        createItemMenuWithResource({ resource, scope: scope.name }).href,
        resource,
      ])
    )

    const goTo = flatten(scope.menu ?? [])
      .filter((item) => item.href)
      .map(async (item) => {
        const resource = listLinks.get(item.href)
        const allowed =
          !resource || (await permissionResource(resource, ActionList.list))

        return allowed
          ? [
              {
                id: `go:${item.href}`,
                group: "Go to",
                label: item.name,
                href: item.href!,
              },
            ]
          : []
      })

    const create = resources
      .filter((resource) => !resource.singleton)
      .map(async (resource) => {
        const allowed = await permissionResource(resource, ActionList.create)

        return allowed
          ? [
              {
                id: `create:${resource["@id"]}`,
                group: "Actions",
                label: resource.views.create.title,
                href: generateLink({
                  resourceId: resource["@id"],
                  scope: scope.name,
                  resourceAction: ActionList.create,
                }),
              },
            ]
          : []
      })

    void Promise.all([...goTo, ...create]).then((groups) => {
      if (!cancelled) setEntries(groups.flat() as PaletteEntry[])
    })

    return () => {
      cancelled = true
    }
  }, [open, scope])

  return entries
}

/** The records whose title matches `query`, resource by resource. */
function useRecordEntries(query: string, enabled: boolean): PaletteEntry[] {
  const scope = useScopeContext()?.scope
  const [entries, setEntries] = useState<PaletteEntry[]>([])
  const text = query.trim()

  useEffect(() => {
    if (!enabled || !scope || !text) {
      setEntries([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      const searches = (scope.resources ?? []).map(async (resource) => {
        const titleField = titleFieldOf(resource)
        if (!titleField || !(await permissionResource(resource, ActionList.list))) {
          return []
        }

        try {
          const { data } = await resource.getCollection(
            { [titleField]: text, itemsPerPage: RECORDS_PER_RESOURCE },
            { signal: controller.signal }
          )
          const items = getCollectionItems<Record<string, any>>(data, resource)

          const found = await Promise.all(
            items.slice(0, RECORDS_PER_RESOURCE).map(async (item) => {
              const id = getIdFromObject(item, false, resource)
              if (!id) return undefined
              const action = (await permissionResource(resource, ActionList.read, {
                item,
              }))
                ? ActionList.read
                : ActionList.update
              if (!(await permissionResource(resource, action, { item }))) {
                return undefined
              }

              return {
                id: `record:${resource["@id"]}:${id}`,
                group: "Records",
                label: `${item[titleField]} · ${resource.name}`,
                href: generateLink({
                  resourceId: resource["@id"],
                  scope: scope.name,
                  resourceAction: action,
                  id,
                }),
              } as PaletteEntry
            })
          )

          return found.filter((entry) => entry !== undefined)
        } catch {
          // A resource that cannot answer leaves its records out of the list.
          return []
        }
      })

      void Promise.all(searches).then((groups) => {
        if (!controller.signal.aborted) setEntries(groups.flat())
      })
    }, SEARCH_DELAY)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, enabled, scope])

  return entries
}

/**
 * The command palette of an admin layout, opened by Cmd+K / Ctrl+K: go to a
 * resource, start a creation, and — when `searchable` — find a record by its
 * title. Everything it lists comes from the scope's declaration, and an
 * action a resource refuses is not listed.
 */
export function AdminCommandPalette({
  options,
}: {
  options: CommandPaletteOptions
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const navigate = getPorts().navigation.useNavigate()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", onKeyDown)

    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const staticEntries = useStaticEntries(open)
  const recordEntries = useRecordEntries(query, open && Boolean(options.searchable))

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matching = staticEntries.filter((entry) =>
      entry.label.toLowerCase().includes(needle)
    )

    return [...matching, ...recordEntries]
  }, [staticEntries, recordEntries, query])

  const groups = (
    [
      ["Go to", translate("Go to")],
      ["Actions", translate("Actions")],
      ["Records", translate("Records")],
    ] as const
  )
    .map(([group, title]) => ({
      group,
      title,
      entries: entries.filter((entry) => entry.group === group),
    }))
    .filter(({ entries }) => entries.length > 0)

  const current = entries[Math.min(active, entries.length - 1)]

  const close = () => {
    setOpen(false)
    setQuery("")
    setActive(0)
  }

  const go = (entry: PaletteEntry) => {
    close()
    if (isExternalHref(entry.href)) window.location.assign(entry.href)
    else void navigate({ to: entry.href })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (entries.length === 0) return
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive(
        (Math.min(active, entries.length - 1) + step + entries.length) %
          entries.length
      )
    } else if (event.key === "Enter" && current) {
      event.preventDefault()
      go(current)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg"
        initialFocus={input}
        data-slot="admin-command-palette"
      >
        <DialogTitle className="sr-only">{translate("Command palette")}</DialogTitle>
        <input
          ref={input}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          aria-label={translate("Search")}
          placeholder={translate("Search")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none"
        />
        <div id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
          {groups.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {translate("No results")}
            </p>
          )}
          {groups.map(({ group, title, entries: groupEntries }) => (
            <div key={group} role="group" aria-label={title}>
              <div
                aria-hidden
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {title}
              </div>
              {groupEntries.map((entry) => (
                <div
                  key={entry.id}
                  id={`${listId}-${entry.id}`}
                  role="option"
                  aria-selected={entry === current}
                  onClick={() => go(entry)}
                  onMouseMove={() => setActive(entries.indexOf(entry))}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2 text-sm",
                    entry === current && "bg-muted"
                  )}
                >
                  {entry.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { translate } from "react-mini-i18n"
import { getPorts } from "@/ports"
import type { SavedView, SavedViewInput } from "@/views/list/savedViews/savedViews"

/**
 * The views readers saved for a resource, read from the `savedViews` port,
 * and what changes them. A store that refuses leaves the tabs as they were and
 * says so.
 */
export function useSavedViews(resourceId: string, enabled: boolean) {
  const [views, setViews] = useState<SavedView[]>([])
  const [loaded, setLoaded] = useState(!enabled)

  useEffect(() => {
    if (!enabled) return
    let current = true
    Promise.resolve()
      .then(() => getPorts().savedViews.list(resourceId))
      .then((list) => current && setViews(list))
      .catch(
        () => current && toast.error(translate("The views could not be loaded"))
      )
      .finally(() => current && setLoaded(true))

    return () => {
      current = false
    }
  }, [resourceId, enabled])

  const run = useCallback(
    async <Result>(
      action: () => Result | Promise<Result>
    ): Promise<Result | undefined> => {
      try {
        return await action()
      } catch {
        toast.error(translate("The view could not be saved"))
        return undefined
      }
    },
    []
  )

  const create = useCallback(
    async (view: SavedViewInput) => {
      const created = await run(() => getPorts().savedViews.create(resourceId, view))
      if (created) setViews((current) => [...current, created])
      return created
    },
    [resourceId, run]
  )

  const update = useCallback(
    async (id: string, changes: Partial<SavedViewInput>) => {
      const updated = await run(() =>
        getPorts().savedViews.update(resourceId, id, changes)
      )
      if (updated)
        setViews((current) =>
          current.map((view) => (view.id === id ? updated : view))
        )
      return updated
    },
    [resourceId, run]
  )

  const remove = useCallback(
    async (id: string) => {
      const done = await run(async () => {
        await getPorts().savedViews.remove(resourceId, id)
        return true
      })
      if (done) setViews((current) => current.filter((view) => view.id !== id))
      return done === true
    },
    [resourceId, run]
  )

  return { views, loaded, create, update, remove }
}

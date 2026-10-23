import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import {
  ViewResourceContext,
  ViewResourceContextParams,
} from "@/ViewResourceContext"
import { resourceRegistered } from "resource-registry"
import { MultiViewTab } from "@/components/MultiViewTab"
import { ChildViewResourceDialog } from "@/components/ChildViewResourceDialog"
import MetaResourceComponent from "@/components/MetaResource"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { toggleValue } from "@/internal/array/array"
import { resolveViewResourceContext } from "@/utils/resolveViewResourceContext"
import { processViewResourceContext } from "@/utils/processViewResourceContext"
import { FilterInterface } from "@/views/list/filter/useFilter"
import { setUrlParam } from "@/internal/url/setUrlParam"
import { encodeQuery } from "@/internal/url/urlEncoder"
import { cleanValuesInObject } from "@/internal/object/cleanValuesInObject"
import { JsonLdIriAble } from "jsonld-item"
import { resolveDialect } from "@/api/apiConfig"
import { subscribeMercure } from "@/api/realtime"
import {
  PermissionCache,
  PermissionCacheContext,
  usePermissionState,
} from "@/utils/permissionResource"
import { useForbiddenFallback } from "@/provider/useForbiddenFallback"
import { PageLoader } from "@/ui/Loader"
import { ActionList } from "react-data-form"
import { getOptimisticStore } from "@/api/optimistic"
import { useResourceViewConfiguration } from "@/provider/ResourceViewConfigurationContext"
import { markViewLoading } from "@/navigation/navigationState"
import { useViewEnterTransition } from "@/navigation/useViewEnterTransition"
import { OverlayContext, OverlayInterface } from "@/action/overlayContext"
import {
  ChildViewRouteContext,
  ChildViewRouteInterface,
} from "@/open/childViewRoute"

export interface CurrentViewResourceContextParams extends ViewResourceContextParams {
  decoratorComponent?: FC<{ children: ReactNode }>
  onSelected?: (value: string[]) => void
  /**
   * The frame this view is drawn in, when it was opened in one: its forms
   * close it once saved. The views drawn inside this one do not inherit it.
   */
  overlay?: OverlayInterface
}

export interface CurrentViewResourceContext extends ViewResourceContext {
  fetchData: () => void
  setSelected: (data: JsonLdIriAble) => void
  setFilter: (object: FilterInterface) => void
  /**
   * Accepts an updater, like React's own setters. Prefer that form: a plain
   * value is built from the context of the render it was read in, and would
   * revert whatever else changed in between — a request landing, a filter
   * being applied.
   */
  setViewResource: Dispatch<SetStateAction<ViewResourceContext>>
  selected: string[]
  isSelected: (data: JsonLdIriAble) => boolean
  parentResource?: ViewResourceContext
  isLoading: boolean
  /** Whether the last load failed. */
  error: boolean
  /** What the last failed load threw — read with `normalizeApiError`. */
  loadError?: unknown
  viewResource: ViewResourceContext
}

function DefaultDecorator({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export const CurrentResourceContext = createContext<
  CurrentViewResourceContext | undefined
>(undefined)

export default function ViewResourceContextProvider({
  id,
  decoratorComponent,
  onInitViewResource,
  overlay,
  ...viewResourceContextParams
}: Partial<CurrentViewResourceContextParams>) {
  const Decorator = decoratorComponent ?? DefaultDecorator
  const [selected, setSelected] = useState(viewResourceContextParams.selected ?? [])
  const parentResource = useCurrentViewResourceContext()

  useEffect(() => {
    const next = viewResourceContextParams.selected
    if (next === undefined) return
    const sameLength = next.length === selected.length
    const sameValues = sameLength && next.every((v, i) => v === selected[i])
    if (!sameValues) setSelected(next)
  }, [viewResourceContextParams.selected])

  const [viewResource, setViewResource] = useState<ViewResourceContext>(() => {
    const initial = resolveViewResourceContext({
      id,
      ...viewResourceContextParams,
    })
    return onInitViewResource ? onInitViewResource(initial, parentResource) : initial
  })

  const setFilter = (filter: FilterInterface) => {
    setViewResource((current) => ({
      ...current,
      filter,
    }))
    if (!parentResource) {
      setUrlParam("filter", encodeQuery(cleanValuesInObject(filter)))
    }
  }

  const needFetch = !viewResource?.data
  const [isLoading, setIsLoading] = useState<boolean>(needFetch)
  const [error, setError] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<unknown>(undefined)
  const fetchTokenRef = useRef(0)
  const fetchInThisTickRef = useRef<{
    promise: Promise<void>
    token: number
  } | null>(null)
  const isFirstFilterEffectRef = useRef(true)
  // When the rows on screen were asked for, on the clock of the writes in
  // flight: once drawn, the answers older than that are in them.
  const readAtRef = useRef<number | null>(null)

  // The view comes from the resource: test the resource first, or an unknown
  // one is reported as a missing view.
  if (!viewResource.resource) {
    console.warn(viewResource)
    const registered = Object.keys(resourceRegistered).join(", ")
    throw new Error(
      `Resource "${viewResource.resourceId}" is not registered. Registered: ${registered || "none"}`,
      { cause: viewResource }
    )
  }
  if (!viewResource.view) {
    console.warn(viewResource)
    const available = Object.keys(viewResource.resource.views ?? {}).join(", ")
    throw new Error(
      `Resource "${viewResource.resourceId ?? viewResource.resource.id}" has no "${viewResource.resourceAction}" view. Available: ${available || "none"}`,
      { cause: viewResource }
    )
  }

  const loadData = async () => {
    if (error) {
      setError(false)
      setLoadError(undefined)
    }

    const token = ++fetchTokenRef.current
    const readAt = getOptimisticStore(viewResource.resource).now()
    setIsLoading(true)

    try {
      const viewProcessed = await processViewResourceContext(viewResource)
      if (token !== fetchTokenRef.current) return

      // A request brings back rows, nothing else. Writing the whole context
      // back would restore the one captured when the request left — undoing
      // the layout, the filter or the selection chosen while it was in flight.
      // A singleton may come back as its creation form, or with the identifier
      // of the record it found.
      const singleton = viewResource.resource.singleton
        ? {
            id: viewProcessed.id,
            resourceAction: viewProcessed.resourceAction,
            view: viewProcessed.view,
            defaultData: viewProcessed.defaultData,
          }
        : undefined
      setViewResource((current) => ({
        ...current,
        ...singleton,
        data: viewProcessed.data,
      }))
      if (viewResource.resourceAction === ActionList.list) readAtRef.current = readAt
    } catch (e) {
      if (token !== fetchTokenRef.current) return
      console.warn("Fetch Error", e)
      setError(true)
      setLoadError(e)
    } finally {
      if (token === fetchTokenRef.current) setIsLoading(false)
    }
  }

  // Every button of a list hears the same save and asks for the same rows:
  // the calls made in one go share a single request.
  // A request the effect's cleanup has since invalidated — React's strict mode
  // mounts, cleans up and mounts again in one go — is not shared: its rows
  // would be dropped on arrival, and the list would stay empty.
  const fetchData = () => {
    const shared = fetchInThisTickRef.current
    if (shared && shared.token === fetchTokenRef.current) return shared.promise
    const promise = loadData()
    const current = { promise, token: fetchTokenRef.current }
    fetchInThisTickRef.current = current
    queueMicrotask(() => {
      if (fetchInThisTickRef.current === current) fetchInThisTickRef.current = null
    })
    return promise
  }

  // A list reads itself again once a record of its resource is saved —
  // wherever it was saved: a form in a dialog, a cell edited in place, a card
  // moved. Once per list, not once per button of its rows. Read when the
  // record is saved, not when the list mounted: `fetchData` closes over the
  // filter, which may have changed since.
  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData
  const isList = viewResource.resourceAction === ActionList.list
  // The channel is held while the views are mounted. The resource's own
  // `subscribe` comes first, then the dialect's; only a dialect that knows a
  // Mercure topic opens one — Strapi and Supabase name none, so no EventSource
  // is opened against a hub they do not run.
  const realtime = viewResource.resource.realtime
  const realtimePath = viewResource.resource?.path ?? viewResource.resource?.["@id"]
  const dialect = resolveDialect(viewResource.resource)
  const realtimeTopic = dialect.realtimeTopic?.(realtimePath)
  const realtimeSubscribe =
    (typeof realtime === "object" ? realtime.subscribe : undefined) ??
    (realtime ? dialect.realtimeSubscribe?.(realtimePath) : undefined)
  const withCredentials = typeof realtime === "object" && !!realtime.withCredentials
  useEffect(() => {
    if (!realtime) return
    const refresh = () => fetchDataRef.current()
    if (realtimeSubscribe) return realtimeSubscribe(refresh) ?? undefined
    if (!realtimeTopic) return
    return subscribeMercure(realtimeTopic, refresh, { withCredentials })
  }, [!!realtime, realtimeSubscribe, realtimeTopic, withCredentials])

  useEffect(() => {
    if (!isList) return
    const sub = viewResource.resource.onChange.subscribe(() =>
      fetchDataRef.current()
    )
    return () => sub.unsubscribe()
  }, [viewResource.resource, isList])

  useEffect(() => {
    if (needFetch) {
      fetchData()
    }
    return () => {
      fetchTokenRef.current++
    }
  }, [id, needFetch])

  // Let go of the answers the rows now hold — after they are drawn, not
  // before: dropped first, the row would show its old values for one frame.
  useEffect(() => {
    if (readAtRef.current === null) return
    getOptimisticStore(viewResource.resource).acknowledge(readAtRef.current)
    readAtRef.current = null
  }, [viewResource.data, viewResource.resource])

  useEffect(() => {
    if (isFirstFilterEffectRef.current) {
      isFirstFilterEffectRef.current = false
      return
    }
    fetchData()
  }, [viewResource.filter])

  const currentViewWithVariant = withLayout(viewResource)
  const components = currentViewWithVariant.view.components
  const ViewDecorator = components.wrapper ?? DefaultDecorator
  const View = components.view

  // The answers of the permissions asked while this data is on screen: a
  // list of fifty rows asks once per row and action, and asks again once the
  // rows are loaded again.
  const permissionCache = usePermissionCache(viewResource.data)
  const access = useRouteAccess(currentViewWithVariant, error, permissionCache)
  const forbiddenFallback = useForbiddenFallback()

  // The view on screen says when it is still loading, so a navigation lasts
  // until it has what it needs. A view opened inside another is the other's.
  const isBusy = isLoading || access === "pending"
  useLayoutEffect(() => {
    if (parentResource || !isBusy) return
    return markViewLoading()
  }, [isBusy, parentResource])

  const viewRef = useRef<HTMLDivElement>(null)
  const configuration = useResourceViewConfiguration()
  useViewEnterTransition(
    viewRef,
    !parentResource &&
      configuration?.viewTransition !== false &&
      access === "allowed"
  )

  // The key is the identity the resource's dialect reads: a Strapi or Supabase
  // record has no `@id`.
  const selectionKey = (item: JsonLdIriAble) =>
    getIdFromObject(item, false, viewResource.resource)

  const handleSetSelect = (item: JsonLdIriAble) => {
    const key = selectionKey(item)
    if (!key) return

    const values = toggleValue<string>(selected, key)
    setSelected(values)
    viewResourceContextParams.onSelected?.(values)
  }

  const route = useChildViewRouteProvider(
    !parentResource,
    currentViewWithVariant,
    viewResourceContextParams.childViewResource
  )

  const isSelected = (item: JsonLdIriAble) => {
    const key = selectionKey(item)
    if (!key) return false

    return selected.includes(key)
  }

  return (
    <CurrentResourceContext
      value={{
        setViewResource,
        setFilter,
        error,
        loadError,
        isLoading,
        ...currentViewWithVariant,
        parentResource,
        fetchData,
        selected,
        setSelected: handleSetSelect,
        viewResource: currentViewWithVariant,
        isSelected,
      }}
    >
      <PermissionCacheContext value={permissionCache}>
        <OverlayContext value={overlay ?? null}>
          <RouteProvider value={route.value}>
            <MetaResourceComponent />
            <Decorator>
              <ViewDecorator>
                <div ref={viewRef} aria-busy={isBusy || undefined}>
                  {access === "allowed" ? (
                    <>
                      {components.top && <components.top />}
                      <View />
                      <MultiViewTab />
                      {viewResourceContextParams.childViewResource && (
                        <ChildViewResourceDialog
                          childViewResource={
                            viewResourceContextParams.childViewResource
                          }
                          inlineClaimed={route.isInlineClaimed(
                            viewResourceContextParams.childViewResource
                          )}
                        />
                      )}
                      {components.bottom && <components.bottom />}
                    </>
                  ) : access === "pending" ? (
                    <PageLoader isLoading={true} />
                  ) : (
                    forbiddenFallback
                  )}
                </div>
              </ViewDecorator>
            </Decorator>
          </RouteProvider>
        </OverlayContext>
      </PermissionCacheContext>
    </CurrentResourceContext>
  )
}

/** Provides the route when this view is the routed one; passes it on otherwise. */
function RouteProvider({
  value,
  children,
}: {
  value: ChildViewRouteInterface | null
  children: ReactNode
}) {
  if (!value) return <>{children}</>

  return <ChildViewRouteContext value={value}>{children}</ChildViewRouteContext>
}

/**
 * The routed view's side of the views opened over it: what they are written
 * under — this view, with the filter and the layout on screen — and which
 * lists draw the inline ones under their rows.
 */
function useChildViewRouteProvider(
  isRouted: boolean,
  context: ViewResourceContext,
  child: ViewResourceContextParams | undefined
) {
  const [inlineClaims, setInlineClaims] = useState<Record<string, number>>({})

  const claimInline = useCallback((resourceId: string) => {
    const add = (delta: number) =>
      setInlineClaims((claims) => ({
        ...claims,
        [resourceId]: (claims[resourceId] ?? 0) + delta,
      }))
    add(1)
    return () => add(-1)
  }, [])

  const { resource, resourceAction, id, scope, subResource, filter, viewVariant } =
    context
  const value = useMemo<ChildViewRouteInterface | null>(
    () =>
      isRouted
        ? {
            parentParams: {
              resource,
              resourceAction,
              id,
              // The resource's own scope, as the links of its views write it.
              scope: resource?.scope ?? scope,
              subResource,
              filter,
              viewVariantId: viewVariant,
            },
            child,
            claimInline,
          }
        : null,
    [
      isRouted,
      resource,
      resourceAction,
      id,
      scope,
      subResource,
      filter,
      viewVariant,
      child,
      claimInline,
    ]
  )

  const isInlineClaimed = (params: ViewResourceContextParams) => {
    const resourceId = params.resource?.["@id"] ?? params.resourceId
    return !!resourceId && (inlineClaims[resourceId] ?? 0) > 0
  }

  return { value, isInlineClaimed }
}

/**
 * The context with the list's layout on screen merged into its view: the
 * layout's form, width and components win over the action's.
 */
function withLayout(context: ViewResourceContext): ViewResourceContext {
  const layouts = context.view?.layouts ?? []
  if (layouts.length === 0) return context

  const layout =
    layouts.find((candidate) => candidate.id === context.viewVariant) ?? layouts[0]

  return {
    ...context,
    layout,
    view: {
      ...context.view,
      form: layout.form ?? context.view.form,
      fullWidth: layout.fullWidth ?? context.view.fullWidth,
      components: { ...context.view.components, ...layout.components },
    },
  }
}

/** A cache of permission answers, emptied whenever `data` changes. */
function usePermissionCache(data: unknown): PermissionCache {
  const [state, setState] = useState(() => ({ data, cache: new Map() }))
  if (state.data !== data) {
    // Replaced during the render, as React allows for state derived from
    // props: the rows on screen are never checked against the old answers.
    const next = { data, cache: new Map() }
    setState(next)
    return next.cache
  }

  return state.cache
}

/**
 * Whether the action on screen is allowed — a refused action protects its
 * route, not only its button. A permission that depends on the record waits
 * for it to be loaded.
 */
function useRouteAccess(
  context: ViewResourceContext,
  failed: boolean,
  cache: PermissionCache
) {
  const action = context.resourceAction
  const needsRecord =
    action !== ActionList.list && action !== ActionList.create && Boolean(context.id)
  const permission = context.resource.permissions?.[action]
  // A record that could not be loaded is not waited for: the rule is asked
  // without it, and the view says what went wrong.
  const waitsForRecord =
    needsRecord && typeof permission === "function" && !context.data && !failed

  return usePermissionState(
    action,
    needsRecord ? context.data : undefined,
    context.resource,
    context,
    waitsForRecord,
    cache
  )
}

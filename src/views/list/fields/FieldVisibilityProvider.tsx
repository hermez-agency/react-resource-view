import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import { getPorts } from "@/ports"
import {
  localFieldVisibilityStore,
  fieldVisibilityFromHidden,
  hiddenFields,
  isFieldVisible,
  normaliseFieldVisibility,
  readLegacyHiddenColumns,
  withFieldVisible,
  type FieldVisibilityState,
  type FieldVisibilityStoreInterface,
} from "@/views/list/fields/fieldVisibility"

/** The fields a list shows, shared by all its layouts — see {@link useFieldVisibility}. */
export interface FieldVisibilityContextInterface {
  /** The fields hidden on screen, by the declaration or by the reader. */
  hidden: string[]
  /** The fields `views.list.fields.hidden` hides until the reader shows them. */
  defaults: string[]
  /** Whether a field is shown: neither it nor anything it sits under is hidden. */
  isVisible: (field: string) => boolean
  /** Hides or shows one field. */
  setVisible: (field: string, visible: boolean) => void
  /** Hides exactly these fields — what a saved view does. */
  setHidden: (hidden: string[]) => void
  /** Whether the reader changed anything: the declaration is on screen otherwise. */
  customised: boolean
  /** Back to the declaration. */
  reset: () => void
}

export const FieldVisibilityContext =
  createContext<FieldVisibilityContextInterface | null>(null)

type Cache = Map<string, FieldVisibilityState | null>

// What each store answered, per resource: `useSyncExternalStore` wants the same
// object back as long as nothing changed, and an asynchronous store is read
// once rather than on every render.
const caches = new WeakMap<FieldVisibilityStoreInterface, Cache>()
const cacheListeners = new Set<() => void>()

function cacheOf(store: FieldVisibilityStoreInterface): Cache {
  let cache = caches.get(store)
  if (!cache) {
    cache = new Map()
    caches.set(store, cache)
  }
  return cache
}

function notifyCache() {
  cacheListeners.forEach((listener) => listener())
}

function subscribeCache(listener: () => void) {
  cacheListeners.add(listener)
  return () => {
    cacheListeners.delete(listener)
  }
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return !!value && typeof (value as Promise<T>).then === "function"
}

const sameState = (
  a: FieldVisibilityState | null | undefined,
  b: FieldVisibilityState | null
) => JSON.stringify(a ?? null) === JSON.stringify(b)

// The stores that answer with a promise: those are read once, then on notice.
const asyncStores = new WeakSet<FieldVisibilityStoreInterface>()

/**
 * Reads a resource from its store into the cache. A synchronous store —
 * `localStorage` — is read each time: what it holds may have changed under
 * the list, and the cached object comes back as long as it did not.
 */
function load(store: FieldVisibilityStoreInterface, resourceId: string) {
  const cache = cacheOf(store)
  let answer: ReturnType<FieldVisibilityStoreInterface["read"]>
  try {
    answer = store.read(resourceId)
  } catch {
    answer = null
  }
  if (!isPromise<FieldVisibilityState | null>(answer)) {
    const state = normaliseFieldVisibility(answer)
    if (!cache.has(resourceId) || !sameState(cache.get(resourceId), state)) {
      cache.set(resourceId, state)
    }
    return
  }
  asyncStores.add(store)
  // Until the store answers, the declaration.
  if (!cache.has(resourceId)) cache.set(resourceId, null)
  answer.then(
    (state) => {
      const next = normaliseFieldVisibility(state)
      if (sameState(cache.get(resourceId), next)) return
      cache.set(resourceId, next)
      notifyCache()
    },
    () => undefined
  )
}

function snapshot(store: FieldVisibilityStoreInterface, resourceId: string) {
  const cache = cacheOf(store)
  if (!cache.has(resourceId) || !asyncStores.has(store)) load(store, resourceId)
  return cache.get(resourceId) ?? null
}

function save(
  store: FieldVisibilityStoreInterface,
  resourceId: string,
  state: FieldVisibilityState | null
): Promise<void> {
  cacheOf(store).set(resourceId, state)
  notifyCache()
  try {
    return Promise.resolve(store.write(resourceId, state)).catch(() => undefined)
  } catch {
    // A store that cannot write: the list keeps the change until it is left.
    return Promise.resolve()
  }
}

/** What the store keeps for a resource, read and written through the cache. */
function useStoredState(
  store: FieldVisibilityStoreInterface,
  resourceId: string,
  enabled: boolean
) {
  const state = useSyncExternalStore(
    subscribeCache,
    () => (enabled ? snapshot(store, resourceId) : null),
    () => null
  )

  useEffect(() => {
    if (!enabled) return
    return store.subscribe?.(resourceId, () => {
      load(store, resourceId)
      notifyCache()
    })
  }, [store, resourceId, enabled])

  // The columns a reader hid in a table before the fields were shared: they
  // become the resource's hidden fields, once.
  const loaded = useSyncExternalStore(
    subscribeCache,
    () => cacheOf(store).has(resourceId),
    () => false
  )
  useEffect(() => {
    if (!enabled || !loaded || state) return
    const legacy = readLegacyHiddenColumns(resourceId)
    if (!legacy) return
    void save(store, resourceId, { hidden: legacy.hidden, shown: [] }).then(
      legacy.clear
    )
  }, [store, resourceId, enabled, loaded, state])

  const write = useCallback(
    (next: FieldVisibilityState | null) => void save(store, resourceId, next),
    [store, resourceId]
  )

  return [state, write] as const
}

export interface FieldVisibilityProviderProps {
  /** The resource whose fields these are. */
  resourceId: string
  /** The fields hidden until the reader shows them. */
  defaults?: string[]
  /**
   * `"local"` keeps the reader's choice through the `fieldVisibility` port —
   * `localStorage` unless configured otherwise; `false` keeps it for as long
   * as the list is on screen.
   */
  persist?: "local" | false
}

/**
 * Which fields of a resource are shown, for every layout of its list: a field
 * hidden in the table is hidden in the cards and the calendar too. Read with
 * {@link useFieldVisible} and `<Field>`.
 */
export function FieldVisibilityProvider({
  resourceId,
  defaults: declared,
  persist = "local",
  children,
}: PropsWithChildren<FieldVisibilityProviderProps>) {
  const store = getPorts().fieldVisibility ?? localFieldVisibilityStore
  const [stored, writeStored] = useStoredState(store, resourceId, persist !== false)
  const [memory, setMemory] = useState<FieldVisibilityState | null>(null)
  const state = persist === false ? memory : stored
  const write = persist === false ? setMemory : writeStored

  // A new array on each render of the declaration is the same declaration.
  const defaultsKey = (declared ?? []).join("\u0000")
  const value = useMemo<FieldVisibilityContextInterface>(() => {
    const defaults = defaultsKey ? defaultsKey.split("\u0000") : []
    const hidden = hiddenFields(state, defaults)

    return {
      hidden,
      defaults,
      isVisible: (field) => isFieldVisible(field, hidden),
      setVisible: (field, visible) =>
        write(withFieldVisible(state, defaults, field, visible)),
      setHidden: (next) => write(fieldVisibilityFromHidden(next, defaults)),
      customised: state !== null,
      reset: () => write(null),
    }
  }, [state, write, defaultsKey])

  return <FieldVisibilityContext value={value}>{children}</FieldVisibilityContext>
}

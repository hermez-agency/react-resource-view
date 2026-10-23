import { createContext, use, useEffect, useReducer, useState } from "react"
import type { Action, Permission, PermissionKey } from "@/ResourceDefinition"
import type { ViewResource } from "@/ViewResource"
import type { ViewResourceContext } from "@/ViewResourceContext"
import getIdFromObject from "@/internal/id/getIdFromObject"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"

/**
 * The permissions of a resource, asked from code and from components.
 *
 * A permission is a boolean or a function of `{ action, item, context }` that
 * may answer with a promise — see `permissions` on the declaration. Anything
 * the resource does not restrict is allowed.
 */

/** An action, the CSV export, or moving a card on a board. */
type PermissionAction = Action | "export" | "move"

export interface PermissionQuery<Item = any> {
  /** The record the action would apply to. */
  item?: Item
  /** The view context the question comes from. */
  context?: ViewResourceContext
}

/**
 * The action a permission is asked as: `move`, left undeclared, is asked as
 * `update` — moving a card is updating its record.
 */
function askedAs(
  resource: Pick<ViewResource, "permissions"> | undefined,
  action: PermissionAction
): PermissionAction {
  return action === "move" && resource?.permissions?.move === undefined
    ? "update"
    : action
}

function permissionOf(
  resource: Pick<ViewResource, "permissions"> | undefined,
  action: PermissionAction
): Permission | undefined {
  return resource?.permissions?.[String(action) as PermissionKey]
}

/**
 * Whether `action` is allowed on `resource` — for `item`, when it depends on
 * one. A promise when the permission answers asynchronously; in a component,
 * {@link usePermission} unwraps it.
 */
export function permissionResource<Item = any>(
  resource: Pick<ViewResource, "permissions"> | undefined,
  requested: PermissionAction,
  { item, context }: PermissionQuery<Item> = {}
): boolean | Promise<boolean> {
  const action = askedAs(resource, requested)
  const permission = permissionOf(resource, action)

  if (permission === undefined) return true
  if (typeof permission === "boolean") return permission

  try {
    const answer = permission({
      action: String(action) as PermissionKey,
      item,
      context,
    })

    return isPromiseLike(answer)
      ? Promise.resolve(answer).then(Boolean, (error) => refuse(action, error))
      : Boolean(answer)
  } catch (error) {
    return refuse(action, error)
  }
}

function refuse(action: PermissionAction, error: unknown): false {
  console.warn(`permission "${String(action)}" failed, so it is refused`, error)
  return false
}

function isPromiseLike(value: unknown): value is PromiseLike<boolean> {
  return typeof (value as PromiseLike<boolean> | undefined)?.then === "function"
}

/* -------------------------------------------------------------------------- */
/* In components                                                              */
/* -------------------------------------------------------------------------- */

interface CachedAnswer {
  value?: boolean
  pending: boolean
  listeners: Set<() => void>
}

/**
 * The asynchronous answers given while a view is on screen, by action and
 * record — so a list of fifty rows asks once per row and action, not once per
 * render. Each view context holds one, emptied when its data is loaded again;
 * a component outside any view keeps its own. A synchronous answer is never
 * kept: it is asked again on every render, and follows whatever it reads.
 */
export type PermissionCache = Map<string, CachedAnswer>

export const PermissionCacheContext = createContext<PermissionCache | undefined>(
  undefined
)

function cacheKey(
  resource: ViewResource | undefined,
  action: PermissionAction,
  item: unknown
): string {
  const identity =
    item && typeof item === "object"
      ? (getIdFromObject(item as object, false, resource) ?? "")
      : ""

  return `${resource?.["@id"] ?? ""}|${String(action)}|${identity}`
}

/**
 * Whether `action` is allowed — on `item` when given, on `resource` or the
 * resource of the view on screen. `false` while an asynchronous permission is
 * still answering: an action is offered once it is known to be allowed.
 *
 * ```tsx
 * const canDelete = usePermission("delete", row.data)
 * ```
 */
export function usePermission<Item = any>(
  action: PermissionAction,
  item?: Item,
  resource?: ViewResource
): boolean {
  return usePermissionState(action, item, resource) === "allowed"
}

export type PermissionState = "allowed" | "refused" | "pending"

/** {@link usePermission}, with the pending state told apart from a refusal. */
export function usePermissionState<Item = any>(
  action: PermissionAction,
  item?: Item,
  targetResource?: ViewResource,
  targetContext?: ViewResourceContext,
  /** Not asked yet — the record it depends on is still loading. */
  skip: boolean = false,
  /** Where the asynchronous answers are kept, when not the view's. */
  targetCache?: PermissionCache
): PermissionState {
  return usePermissionStates(
    [action],
    item,
    targetResource,
    targetContext,
    skip,
    targetCache
  )[0]
}

/**
 * The actions of `actions` allowed on `item`, in order — those still answering
 * left out.
 *
 * ```tsx
 * const offered = useAllowedActions(["update", "delete"], row.data)
 * ```
 */
export function useAllowedActions<A extends PermissionAction, Item = any>(
  actions: A[],
  item?: Item,
  resource?: ViewResource
): A[] {
  const states = usePermissionStates(actions, item, resource)

  return actions.filter((_, index) => states[index] === "allowed")
}

function usePermissionStates<Item = any>(
  actions: PermissionAction[],
  item?: Item,
  targetResource?: ViewResource,
  targetContext?: ViewResourceContext,
  skip: boolean = false,
  targetCache?: PermissionCache
): PermissionState[] {
  const current = useCurrentViewResourceContext()
  const context = targetContext ?? current?.viewResource ?? current
  const resource = targetResource ?? context?.resource
  const [ownCache] = useState<PermissionCache>(() => new Map())
  const cache = targetCache ?? use(PermissionCacheContext) ?? ownCache
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  const answers = actions.map((declared) => {
    const action = askedAs(resource, declared)
    const permission = permissionOf(resource, action)
    if (permission === undefined) return { state: "allowed" as const }
    if (typeof permission === "boolean") {
      return { state: permission ? ("allowed" as const) : ("refused" as const) }
    }
    if (skip) return { state: "pending" as const }

    const key = cacheKey(resource, action, item)
    let entry = cache.get(key)
    if (!entry) {
      entry = ask(resource, action, item, context)
      if (entry.pending) cache.set(key, entry)
    }

    const state: PermissionState = entry.pending
      ? "pending"
      : entry.value
        ? "allowed"
        : "refused"

    return { state, key }
  })

  // Subscribed by key rather than by entry: the entries are read again from
  // the cache on every render.
  const pendingKeys = answers
    .filter((answer) => answer.state === "pending" && answer.key)
    .map((answer) => answer.key as string)
    .join("\n")

  useEffect(() => {
    if (!pendingKeys) return
    const entries = pendingKeys
      .split("\n")
      .map((key) => cache.get(key))
      .filter((entry): entry is CachedAnswer => Boolean(entry))

    for (const entry of entries) entry.listeners.add(rerender)
    // Answered between the render and the effect.
    if (entries.some((entry) => !entry.pending)) rerender()

    return () => {
      for (const entry of entries) entry.listeners.delete(rerender)
    }
  }, [pendingKeys, cache])

  return answers.map((answer) => answer.state)
}

function ask(
  resource: ViewResource | undefined,
  action: PermissionAction,
  item: unknown,
  context: ViewResourceContext | undefined
): CachedAnswer {
  const answer = permissionResource(resource, action, { item, context })
  const entry: CachedAnswer = { pending: false, listeners: new Set() }

  if (typeof answer === "boolean") {
    entry.value = answer
    return entry
  }

  entry.pending = true
  void answer.then((value) => {
    entry.value = value
    entry.pending = false
    entry.listeners.forEach((listener) => listener())
  })

  return entry
}

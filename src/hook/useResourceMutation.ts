import { useSyncExternalStore } from "react"
import { toast } from "sonner"
import { translate } from "react-mini-i18n"
import { IdAbleInterface } from "jsonld-item"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { normalizeApiError } from "@/api/apiRequestError"
import { describeWriteError } from "@/api/describeWriteError"
import { resolveDialect } from "@/api/apiConfig"
import {
  getOptimisticStore,
  hasWriteInFlight,
  OptimisticChange,
  optimisticKey,
} from "@/api/optimistic"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import type { ResourceContext } from "@/ResourceDefinition"
import type { ViewResource } from "@/ViewResource"

/**
 * The writes of a resource, drawn before the API answers.
 *
 * Every write the views make goes through here — a form saved, a row deleted,
 * a cell edited in place, a card moved on a board — and so can an
 * application's own: the list shows the expected result at once, the API's
 * answer replaces it when it comes, and a refusal puts back what was there.
 */

export interface MutationOptions {
  /**
   * Draw the result before the API answers. Defaults to what the resource
   * declares for the action — `optimistic` at its root or in
   * `views.<action>` —, itself `true` by default.
   */
  optimistic?: boolean
  /** Passed to the repository and the hooks. Defaults to the view's context. */
  context?: ResourceContext
  /** Say so in a toast when the write fails. Defaults to `true`. */
  notify?: boolean
}

export interface CustomMutation<
  Item = any,
  Result = unknown,
> extends MutationOptions {
  /** The record the action applies to; it must carry its identifier. */
  item: IdAbleInterface | Item
  /** What the record looks like once the action has run, or `"delete"`. */
  change: Partial<Item> | "delete"
  /** The call to the API. */
  request: () => Promise<Result>
  /**
   * What the API's answer says the record now is. Without it the guess stays
   * on screen until the list is read again.
   */
  confirm?: (result: Result) => Partial<Item> | "delete" | undefined
}

export interface ResourceMutation<Item = any> {
  create: (data: Partial<Item>, options?: MutationOptions) => Promise<Item>
  update: (data: Partial<Item>, options?: MutationOptions) => Promise<Item>
  remove: (item: IdAbleInterface | Item, options?: MutationOptions) => Promise<void>
  /**
   * A business action of the application's own — "archive", "assign to me" —
   * with the same optimism and the same rollback as the others.
   */
  mutate: <Result>(mutation: CustomMutation<Item, Result>) => Promise<Result>
  /** Whether a write to this record is waiting for the API. */
  isPending: (item: IdAbleInterface | Item) => boolean
}

type WriteAction = "create" | "update" | "delete"

/** Whether a write of `action` is drawn before the answer, unless told otherwise. */
export function isOptimistic(
  resource: ViewResource,
  action: WriteAction,
  override?: boolean
): boolean {
  return override ?? resource.views?.[action]?.optimistic ?? true
}

/**
 * Runs `request`, with `change` laid over the lists of the resource while it
 * is in flight. Rejects as `request` does, once the change is withdrawn.
 */
export async function writeOptimistically<Result>(
  resource: ViewResource,
  {
    key,
    change,
    optimistic,
    request,
    confirm,
  }: {
    key: string
    change: OptimisticChange
    optimistic: boolean
    request: () => Promise<Result>
    confirm: (result: Result) => OptimisticChange
  }
): Promise<Result> {
  if (!optimistic) return request()

  const store = getOptimisticStore(resource)
  const token = store.begin(key, change)
  try {
    const result = await request()
    store.succeed(token, confirm(result))
    return result
  } catch (error) {
    store.fail(token)
    throw error
  }
}

/** The record the API answered with, when it answered with one. */
function answered(result: unknown): RecordOfAny | undefined {
  const data = (result as { data?: unknown } | undefined)?.data
  return data && typeof data === "object" ? (data as RecordOfAny) : undefined
}

export function createRecord<Item>(
  resource: ViewResource<Item>,
  data: Partial<Item>,
  options: MutationOptions = {}
): Promise<{ data: Item }> {
  return writeOptimistically(resource, {
    key: optimisticKey(resource),
    change: { kind: "create", data: data as RecordOfAny },
    optimistic: isOptimistic(resource, "create", options.optimistic),
    request: () => resource.createItem(data as never, options.context),
    confirm: (result) => ({
      kind: "create",
      data: answered(result) ?? (data as RecordOfAny),
    }),
  })
}

export function updateRecord<Item>(
  resource: ViewResource<Item>,
  data: Partial<Item>,
  options: MutationOptions = {}
): Promise<{ data: Item }> {
  return writeOptimistically(resource, {
    key: optimisticKey(resource, data as RecordOfAny),
    change: { kind: "update", data: data as RecordOfAny },
    optimistic: isOptimistic(resource, "update", options.optimistic),
    request: () => resource.updateItem(data as never, options.context),
    confirm: (result) => ({
      kind: "update",
      data: answered(result) ?? (data as RecordOfAny),
    }),
  })
}

export function removeRecord<Item>(
  resource: ViewResource<Item>,
  item: IdAbleInterface | Item,
  options: MutationOptions = {}
): Promise<unknown> {
  return writeOptimistically(resource, {
    key: optimisticKey(resource, item as RecordOfAny),
    change: { kind: "delete" },
    optimistic: isOptimistic(resource, "delete", options.optimistic),
    request: () => resource.removeItem(item as IdAbleInterface, options.context),
    confirm: () => ({ kind: "delete" }),
  })
}

function toChange(change: RecordOfAny | "delete"): OptimisticChange {
  return change === "delete" ? { kind: "delete" } : { kind: "update", data: change }
}

/** Says what went wrong, in the words of the API when it gave some. */
export function notifyWriteError(resource: ViewResource, error: unknown): void {
  const apiError = normalizeApiError(error, resolveDialect(resource))
  const violations = apiError?.violations ?? []

  toast.error(translate("An error occurred"), {
    description: violations.length
      ? violations.map((violation) => violation.message).join(", ")
      : describeWriteError(error, apiError),
  })
}

/**
 * The writes of a resource — the one of the view it is called from, by
 * default — drawn before the API answers.
 *
 * ```ts
 * const tasks = useResourceMutation(tasksResource)
 *
 * tasks.mutate({
 *   item: task,
 *   change: { assignee: me["@id"] },
 *   request: () => api.post(`/api/tasks/${task.id}/assign`),
 * })
 * ```
 *
 * Every call resolves with the API's answer, or rejects once the record is
 * back to what it was — after a toast, unless `notify: false`.
 */
export function useResourceMutation<Item = any>(
  resource?: ViewResource<Item>
): ResourceMutation<Item> {
  const current = useCurrentViewResourceContext()
  const target = (resource ?? current?.resource) as ViewResource<Item> | undefined
  if (!target) {
    throw new Error("useResourceMutation: no resource given, and no view around")
  }

  const store = getOptimisticStore(target)
  const entries = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )

  const withDefaults = (options: MutationOptions = {}): MutationOptions => ({
    ...options,
    context:
      options.context ??
      (current?.resource === target
        ? { viewResourceContext: current.viewResource }
        : undefined),
  })

  async function run<Result>(
    options: MutationOptions,
    write: () => Promise<Result>
  ): Promise<Result> {
    try {
      return await write()
    } catch (error) {
      if (options.notify !== false) notifyWriteError(target as ViewResource, error)
      throw error
    }
  }

  return {
    create: (data, options) =>
      run(options ?? {}, async () => {
        const response = await createRecord(target, data, withDefaults(options))
        return response.data
      }),
    update: (data, options) =>
      run(options ?? {}, async () => {
        const response = await updateRecord(target, data, withDefaults(options))
        return response.data
      }),
    remove: (item, options) =>
      run(options ?? {}, async () => {
        await removeRecord(target, item, withDefaults(options))
      }),
    mutate: ({ item, change, request, confirm, ...options }) =>
      run(options, () =>
        writeOptimistically(target as ViewResource, {
          key: optimisticKey(target as ViewResource, item as RecordOfAny),
          change: toChange(change as RecordOfAny | "delete"),
          optimistic: isOptimistic(
            target as ViewResource,
            change === "delete" ? "delete" : "update",
            options.optimistic
          ),
          request,
          confirm: (result) =>
            toChange((confirm?.(result) ?? change) as RecordOfAny | "delete"),
        })
      ),
    isPending: (item) =>
      hasWriteInFlight(
        entries,
        optimisticKey(target as ViewResource, item as RecordOfAny)
      ),
  }
}

import { getIdFromIri, isApiIri, JsonLdIri } from "jsonld-item"
import { createJsonLdCollection } from "jsonld-item"
import { ActionList } from "react-data-form"
import { createPubSub } from "coooking-pubsub"
import { createResource } from "resource-registry"
import { createRepository } from "@/api/createRepository"
import { localRepository } from "@/api/localRepository"
import { createResourceCollection } from "@/api/collectionShape"
import getIdFromObject from "@/internal/id/getIdFromObject"
import type {
  Repository,
  ResourceContext,
  ResourceDefinition,
  ResourceHooks,
} from "@/ResourceDefinition"
import type { ViewResource } from "@/ViewResource"
import {
  getRegisteredOpenFrames,
  getResourceViewDefaults,
  onResourceViewDefaultsChange,
} from "@/ResourceConfig"
import { normalizePermissions, resolveViews } from "@/definition/resolveDefinition"
import { validateDefinition } from "@/definition/validateDefinition"

/**
 * Declares a resource: its data, what may be done with it, and how each of its
 * five views — list, read, create, update, delete — is drawn.
 *
 * ```ts
 * export const tasks = createViewResource<Task>("tasks", {
 *   name: "Tasks",
 *   path: "/api/tasks",
 *   form: { inputs: TASK_FIELDS },
 *   permissions: { delete: ({ item }) => item?.status !== "done" },
 *   views: {
 *     list: { layouts: [layout.board({ groupBy: "status", columns: STATUSES }), layout.table()] },
 *     update: { open: "dialog" },
 *   },
 * })
 * ```
 *
 * In development the declaration is checked, and anything that would be
 * ignored or could not work throws an error saying how to write it.
 */
export function createViewResource<
  Item extends object = any,
  Write extends object = Item,
>(
  id: JsonLdIri,
  definition: ResourceDefinition<Item, Write>
): ViewResource<Item, Write> {
  const name = definition.name ?? getIdFromIri(id)
  validateDefinition(id, definition as Record<string, any>, name)

  const onChange = createPubSub<{ data: Item; action: ActionList }>()
  const hooks: ResourceHooks<Item, Write> = definition.hooks ?? {}
  const repository = {
    ...createBaseRepository<Item, Write>(id, definition),
    ...customRepository<Item, Write>(definition),
  } as Repository<Item, Write>

  const resource = {
    "@type": "view-resource",
    name,
    icon: definition.icon,
    alias: definition.alias,
    path: definition.path,
    storage: definition.storage,
    dialect: definition.dialect,
    idField: definition.idField,
    quota: definition.quota,
    singleton: definition.singleton,
    hooks,
    onChange,
    definition,
    ...withHooks(repository, hooks, onChange),
  } as unknown as ViewResource<Item, Write>

  const built = createResource<ViewResource<Item, Write>>(id, resource)
  resolve(built)
  // The defaults may be configured after the resources are declared — the
  // imports of an application run before its body.
  onResourceViewDefaultsChange(() => resolve(built))

  return built
}

/** Applies the application's defaults to a built resource. */
function resolve(resource: ViewResource): void {
  const defaults = getResourceViewDefaults()
  const { definition } = resource

  resource.views = resolveViews(
    definition,
    defaults,
    resource.name,
    getRegisteredOpenFrames()
  )
  resource.permissions = normalizePermissions(
    defaults.permissions,
    definition.permissions
  )
  resource.realtime = definition.realtime ?? defaults.realtime ?? false
}

/** Where the data lives when the declaration does not replace every call. */
function createBaseRepository<Item, Write extends object>(
  id: string,
  definition: ResourceDefinition<Item, Write>
): Partial<Repository<Item, Write>> {
  if (definition.path) {
    // A resource declaring a dialect pins its backend, everything else follows
    // `configureApi` as of each request.
    return createRepository({
      path: definition.path,
      dialect: definition.dialect,
    }) as unknown as Repository<Item, Write>
  }

  if (definition.storage === "local") {
    return localRepository({ path: id }) as unknown as Repository<Item, Write>
  }

  if (definition.components?.view ?? definition.views?.list?.components?.view) {
    return emptyRepository(id)
  }

  return missingRepository(id)
}

/**
 * The calls a declaration writes itself, adapted to the one shape they are
 * documented to receive: a record to read or delete arrives as `{ id }`, a
 * record to update carries that `id`, and a list may answer `{ items,
 * totalItems }` — which is given the envelope the views read.
 */
function customRepository<Item, Write extends object>(
  definition: ResourceDefinition<Item, Write>
): Partial<Repository<Item, Write>> {
  const custom = definition.repository
  if (!custom) return {}

  // The identity comes in three spellings — the record, its IRI, the bare
  // segment — and leaves in one: the segment.
  const idOf = (params: object): string | undefined => {
    const raw =
      getIdFromObject(params, true, definition) ?? (params as { id?: unknown }).id
    if (raw === undefined || raw === null) return undefined
    const id = String(raw)

    return isApiIri(id) ? getIdFromIri(id) : id
  }
  const withId = (params: object) => {
    const id = idOf(params)
    return id === undefined ? params : { ...params, id }
  }

  const adapted: Partial<Repository<Item, Write>> = {}
  if (custom.getCollection) {
    const getCollection = custom.getCollection
    adapted.getCollection = async (params, context) => {
      const response = await getCollection(params, context)
      const data = response.data as any
      if (!data || Array.isArray(data.member) || !Array.isArray(data.items)) {
        return response as never
      }

      return {
        ...response,
        data: createResourceCollection({
          id: definition.path ?? "",
          items: data.items,
          totalItems: data.totalItems,
          nextCursor: data.nextCursor,
        }),
      } as never
    }
  }
  if (custom.getItem) {
    const getItem = custom.getItem
    adapted.getItem = (params, context) =>
      getItem({ id: idOf(params) ?? "" }, context)
  }
  if (custom.removeItem) {
    const removeItem = custom.removeItem
    adapted.removeItem = (params, context) =>
      removeItem({ id: idOf(params) ?? "" }, context)
  }
  if (custom.updateItem) {
    const updateItem = custom.updateItem
    adapted.updateItem = (item, context) =>
      updateItem(withId(item) as never, context)
  }
  if (custom.createItem) adapted.createItem = custom.createItem as never

  return adapted
}

/** A resource made of screens of its own: nothing to load, nothing to write. */
function emptyRepository<Item, Write extends object>(
  id: string
): Repository<Item, Write> {
  const refuse = () =>
    Promise.reject(new Error(`"${id}" has no data source: nothing can be written.`))

  return {
    getCollection: async () => ({
      data: createJsonLdCollection({ type: id }) as never,
    }),
    getItem: async (params) => ({ data: { ...params } as Item }),
    createItem: refuse,
    updateItem: refuse,
    removeItem: refuse,
  }
}

/** What a resource without `path`, `storage` or `repository` does in production. */
function missingRepository<Item, Write extends object>(
  id: string
): Repository<Item, Write> {
  const refuse = () =>
    Promise.reject(
      new Error(
        `"${id}" has no data source: declare \`path\`, \`storage: "local"\` or a \`repository\`.`
      )
    )

  return {
    getCollection: refuse,
    getItem: refuse,
    createItem: refuse,
    updateItem: refuse,
    removeItem: refuse,
  }
}

/**
 * The calls to the data, with the hooks around them and `onChange` published
 * after every write. The view context reaches the repository on every call —
 * creations and updates included.
 */
function withHooks<Item, Write extends object>(
  repository: Repository<Item, Write>,
  hooks: ResourceHooks<Item, Write>,
  onChange: ViewResource<Item, Write>["onChange"]
): Repository<Item, Write> {
  return {
    getCollection: async (params, context: ResourceContext = {}) => {
      const filter = context.viewResourceContext?.filter
      const query = filter ? { ...params, ...filter } : params
      const payload = hooks.beforeList
        ? await hooks.beforeList(query, context)
        : query

      return repository.getCollection(payload, context)
    },
    getItem: async (params, context: ResourceContext = {}) => {
      const payload = hooks.beforeRead
        ? await hooks.beforeRead(params, context)
        : params

      return repository.getItem(payload, context)
    },
    removeItem: async (params, context: ResourceContext = {}) => {
      const payload = hooks.beforeDelete
        ? await hooks.beforeDelete(params, context)
        : params
      const response = await repository.removeItem(payload, context)
      await hooks.afterDelete?.(payload, context)
      onChange.publish({ data: payload as Item, action: ActionList.delete })

      return response
    },
    updateItem: async (item, context: ResourceContext = {}) => {
      const payload = hooks.beforeUpdate
        ? await hooks.beforeUpdate(item, context)
        : item
      const response = await repository.updateItem(payload, context)
      await hooks.afterSave?.(response.data, { ...context, action: "update" })
      onChange.publish({ data: response.data, action: ActionList.update })

      return response
    },
    createItem: async (item, context: ResourceContext = {}) => {
      const payload = hooks.beforeCreate
        ? await hooks.beforeCreate(item, context)
        : item
      const response = await repository.createItem(payload, context)
      await hooks.afterSave?.(response.data, { ...context, action: "create" })
      onChange.publish({ data: response.data, action: ActionList.create })

      return response
    },
  }
}

import { ApiDialectInterface } from "@/api/apiDialectInterface"
import { resolveDialect } from "@/api/apiConfig"
import { restRepository } from "@/api/restRepository"
import { AsyncRepositoryInterface, httpRepository } from "jsonld-repository"
import { IdAbleInterface } from "jsonld-item"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { isEmptyFilterValue } from "@/api/queryString"

/**
 * Spells the filter the way API Platform reads it, key by key: `status[]` for
 * every value of an array, `order[title]` for a nested object, an ISO string
 * for a date. The OpenAPI client serializes the filter it is given with its
 * default, which writes `status=a&status=b` — and PHP keeps only the last
 * value of a parameter repeated without brackets.
 */
function flattenFilter(filter: RecordOfAny = {}): RecordOfAny {
  const flat: RecordOfAny = {}

  const add = (key: string, value: unknown) => {
    if (isEmptyFilterValue(value)) return
    if (Array.isArray(value)) {
      value.forEach((entry) => add(`${key}[]`, entry))
    } else if (value instanceof Date) {
      add(key, value.toISOString())
    } else if (typeof value === "object") {
      Object.entries(value as RecordOfAny).forEach(([subKey, subValue]) =>
        add(`${key}[${subKey}]`, subValue)
      )
    } else {
      const known = flat[key]
      flat[key] = known === undefined ? value : [...[known].flat(), value]
    }
  }

  Object.entries(filter).forEach(([key, value]) => add(key, value))
  return flat
}

/**
 * The repository a resource gets when it declares a path and no CRUD of its
 * own.
 *
 * JSON-LD keeps the repository of `jsonld-repository`: it goes through the
 * OpenAPI client an API Platform application has already configured —
 * middleware, scope header and typed paths included — and nothing about that
 * setup should change because the package learned other dialects. Every other
 * dialect goes through {@link restRepository}, which needs no client at all.
 *
 * The choice is made at each call, not when the resource is declared: the
 * resources of an application are declared by imported modules, before the
 * body of its entry point reaches `configureApi`.
 */
export function createRepository<T extends IdAbleInterface = IdAbleInterface>({
  path,
  dialect,
}: {
  path: string
  dialect?: ApiDialectInterface
}): AsyncRepositoryInterface<T> {
  const jsonLd = () => {
    const repository = httpRepository<T>({ path })

    return {
      ...repository,
      getCollection: (params?: RecordOfAny, ...rest: unknown[]) =>
        (repository.getCollection as any)(flattenFilter(params), ...rest),
    }
  }

  const current = () => {
    const resolved = dialect ?? resolveDialect()

    return resolved.name === "json-ld"
      ? jsonLd()
      : restRepository<T>({ path, dialect: resolved })
  }

  return {
    getItem: (...args) => current().getItem(...args),
    getCollection: (...args) => current().getCollection(...args),
    removeItem: (...args) => current().removeItem(...args),
    createItem: (...args) => current().createItem(...args),
    updateItem: (...args) => current().updateItem(...args),
    replaceItem: (...args) => current().replaceItem(...args),
  }
}

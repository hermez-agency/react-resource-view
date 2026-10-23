import { ApiDialectInterface } from "@/api/apiDialectInterface"
import { resolveDialect } from "@/api/apiConfig"
import { restRepository } from "@/api/restRepository"
import { AsyncRepositoryInterface, httpRepository } from "jsonld-repository"
import { IdAbleInterface } from "jsonld-item"

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
  const current = () => {
    const resolved = dialect ?? resolveDialect()

    return resolved.name === "json-ld"
      ? httpRepository<T>({ path })
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

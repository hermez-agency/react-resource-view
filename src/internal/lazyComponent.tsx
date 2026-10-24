import { lazy, Suspense, type ComponentType, type FC } from "react"

/** A component drawn once its code is loaded; `load` fetches it ahead. */
export type LazyComponent<Props extends object> = FC<Props> & {
  load: () => Promise<ComponentType<Props>>
}

/**
 * A component whose code is fetched the first time it is drawn, so that
 * declaring a resource does not bundle every component it might show. The
 * `Suspense` is inside: the caller needs no boundary of its own.
 */
export function lazyComponent<Props extends object>(
  load: () => Promise<ComponentType<Props>>
): LazyComponent<Props> {
  const Loaded = lazy(async () => ({ default: await load() }))
  const Component = (props: Props) => (
    <Suspense fallback={null}>
      <Loaded {...(props as any)} />
    </Suspense>
  )
  return Object.assign(Component, { load })
}

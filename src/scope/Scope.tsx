import {
  createContext,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { Trans } from "react-mini-i18n"
import { getAuthorizationStatus } from "@/scope/getAuthorizationStatus"
import { setCurrentScope } from "@/scope/scope"
import { ResolvedScope, ScopeConfig } from "@/scope/scopeInterface"
import { resolveScope } from "@/scope/resolveScope"
import { PageLoader } from "@/ui/Loader"

type Scope = string | undefined

interface ScopeContextValue {
  scope: ResolvedScope
  /** Runs the scope's `authorization` again, after a sign-in or a sign-out. */
  recheckAuthorization: () => void
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined)

const scopePromiseCache = new Map<string, Promise<ResolvedScope>>()

function getScopePromise(
  scopeName: string,
  configScope: ScopeConfig
): Promise<ResolvedScope> {
  let promise = scopePromiseCache.get(scopeName)
  if (!promise) {
    const fn = configScope[scopeName]
    promise = fn
      ? fn().then(resolveScope)
      : Promise.reject(new Error("Scope not found"))
    scopePromiseCache.set(scopeName, promise)
  }
  return promise
}

type AuthorizationStatus = "pending" | "authorized" | "unauthorized" | "forbidden"

/**
 * Le résultat d'une vérification, rattaché au scope et à la révision qui l'ont
 * produit : un changement de l'un ou de l'autre repasse en attente dès le rendu,
 * sans montrer le contenu sous l'autorisation précédente.
 */
interface AuthorizationCheck {
  scope: ResolvedScope
  revision: number
  status: AuthorizationStatus
  error?: unknown
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | undefined)?.then === "function"
}

export function AccessDenied() {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="text-lg font-medium text-foreground">
        <Trans>Access denied</Trans>
      </p>
      <p className="text-sm text-muted-foreground">
        <Trans>You are not allowed to access this page.</Trans>
      </p>
    </div>
  )
}

interface ScopeProviderParams {
  scopeName: Scope
  children: ReactNode
  configScope: ScopeConfig
  unauthorizedError?: () => void
  defaultScope?: Scope
  authorizationFallback?: ReactNode
  forbiddenFallback?: ReactNode
}

export const ScopeProvider = ({
  scopeName: parentScopeName,
  children,
  configScope,
  unauthorizedError,
  defaultScope,
  authorizationFallback,
  forbiddenFallback,
}: ScopeProviderParams) => {
  const scopeName = parentScopeName ?? defaultScope

  if (!scopeName) {
    throw new Error("Scope not found")
  }

  const scope = use(getScopePromise(scopeName, configScope))
  const [revision, setRevision] = useState(0)
  const [check, setCheck] = useState<AuthorizationCheck | undefined>(undefined)

  // Lu depuis l'effet sans en être une dépendance : un `onUnauthorized` recréé à
  // chaque rendu ne doit pas relancer la vérification.
  const unauthorizedErrorRef = useRef(unauthorizedError)
  useEffect(() => {
    unauthorizedErrorRef.current = unauthorizedError
  }, [unauthorizedError])

  const recheckAuthorization = useCallback(() => {
    setRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    setCurrentScope(scopeName)
  }, [scopeName])

  useEffect(() => {
    if (!scope.authorization) return

    let isCurrent = true

    const settle = (status: AuthorizationStatus, error?: unknown) => {
      if (!isCurrent) return
      setCheck({ scope, revision, status, error })

      if (status !== "unauthorized") return
      if (unauthorizedErrorRef.current) {
        unauthorizedErrorRef.current()
        return
      }
      window.location.href = "/"
    }

    const onResult = (result: unknown) =>
      settle(result === false ? "forbidden" : "authorized")

    const onError = (e: unknown) => {
      const status = getAuthorizationStatus(e)
      if (status === 401) return settle("unauthorized")
      if (status === 403) return settle("forbidden")
      settle("pending", e)
    }

    try {
      const result = scope.authorization()
      if (isPromiseLike(result)) {
        result.then(onResult, onError)
      } else {
        onResult(result)
      }
    } catch (e) {
      onError(e)
    }

    return () => {
      isCurrent = false
    }
  }, [scope, revision])

  const isChecked = check?.scope === scope && check.revision === revision
  const status: AuthorizationStatus = !scope.authorization
    ? "authorized"
    : isChecked
      ? check.status
      : "pending"

  // Une erreur qui n'est ni un 401 ni un 403 remonte à l'error boundary.
  if (isChecked && check.error !== undefined) {
    throw check.error
  }

  let content: ReactNode = children
  if (status === "forbidden") {
    content = scope.forbiddenFallback ?? forbiddenFallback ?? <AccessDenied />
  } else if (status !== "authorized") {
    content = scope.authorizationFallback ?? authorizationFallback ?? (
      <PageLoader isLoading={true} />
    )
  }

  return (
    <ScopeContext.Provider value={{ scope, recheckAuthorization }}>
      {content}
    </ScopeContext.Provider>
  )
}

export const useScopeContext = () => {
  return use(ScopeContext)
}

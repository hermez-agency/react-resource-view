import { getClientConfig } from "jsonld-api-client"

/**
 * Opens a push channel and calls `refresh` each time the API says something
 * changed. Returns the function that closes it again.
 */
export type RealtimeSubscribe = (refresh: () => void) => (() => void) | void

export interface RealtimeOptions {
  /** Replaces the dialect's channel: Supabase Realtime, a SSE, WebSockets… */
  subscribe?: RealtimeSubscribe
  /** Sends the cookies to the Mercure hub — a private hub on another domain. */
  withCredentials?: boolean
}

// `EventSource.CLOSED`, which the test environment does not define.
const CLOSED = 2
const FIRST_DELAY = 1000
const MAX_DELAY = 30000

/**
 * Listens to one Mercure topic. When the hub closes the connection for good
 * (a 401 once the cookie expires, a 502 during a deployment — the browser
 * gives up on those), it is opened again after 1 s, 2 s, 4 s… up to 30 s. Once
 * back, `refresh` is called: whatever was pushed in the meantime is read.
 */
export function subscribeMercure(
  topic: string,
  refresh: () => void,
  { withCredentials }: Pick<RealtimeOptions, "withCredentials"> = {}
): () => void {
  const { baseUrl, mercurePath } = getClientConfig()
  const url = new URL(baseUrl + mercurePath)
  url.searchParams.append("topic", topic)

  let source: EventSource | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let delay = FIRST_DELAY
  let dropped = false

  const connect = () => {
    const current = new EventSource(url, { withCredentials })
    source = current
    current.onopen = () => {
      delay = FIRST_DELAY
      if (!dropped) return
      dropped = false
      refresh()
    }
    current.onmessage = () => refresh()
    current.onerror = () => {
      dropped = true
      // Still connecting: the browser retries by itself.
      if (current.readyState !== CLOSED) return
      current.close()
      timer = setTimeout(connect, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    }
  }
  connect()

  return () => {
    clearTimeout(timer)
    source?.close()
  }
}

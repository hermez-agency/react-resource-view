import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { configureClient } from "jsonld-api-client"
import { subscribeMercure } from "@/api/realtime"

class FakeEventSource {
  static instances: FakeEventSource[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(
    public url: URL,
    public init?: EventSourceInit
  ) {
    FakeEventSource.instances.push(this)
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
}

const last = () => FakeEventSource.instances.at(-1)!

describe("subscribeMercure", () => {
  const original = globalThis.EventSource

  beforeEach(() => {
    vi.useFakeTimers()
    FakeEventSource.instances = []
    globalThis.EventSource = FakeEventSource as never
    configureClient({
      baseUrl: "https://api.test",
      mercurePath: "/.well-known/mercure",
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.EventSource = original
  })

  it("opens the hub on the topic, with the cookies when asked", () => {
    subscribeMercure("https://api.test/tasks/{id}", vi.fn(), {
      withCredentials: true,
    })

    expect(last().url.searchParams.get("topic")).toBe("https://api.test/tasks/{id}")
    expect(last().init).toEqual({ withCredentials: true })
  })

  it("refreshes on each message and closes when let go", () => {
    const refresh = vi.fn()
    const stop = subscribeMercure("t", refresh)

    last().onmessage?.()
    expect(refresh).toHaveBeenCalledTimes(1)

    stop()
    expect(last().closed).toBe(true)
  })

  it("opens again with a growing delay once the hub closed it, and reads again", () => {
    const refresh = vi.fn()
    subscribeMercure("t", refresh)
    last().onopen?.()
    expect(refresh).not.toHaveBeenCalled()

    // The hub answers 502: the browser closes the connection for good.
    last().readyState = 2
    last().onerror?.()
    expect(FakeEventSource.instances).toHaveLength(1)
    vi.advanceTimersByTime(999)
    expect(FakeEventSource.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.instances).toHaveLength(2)

    // Still down: the next try waits twice as long.
    last().readyState = 2
    last().onerror?.()
    vi.advanceTimersByTime(1999)
    expect(FakeEventSource.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.instances).toHaveLength(3)

    // Back: what was pushed meanwhile is read, once.
    last().onopen?.()
    expect(refresh).toHaveBeenCalledTimes(1)
    last().onopen?.()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("reads again when the browser reconnects by itself", () => {
    const refresh = vi.fn()
    subscribeMercure("t", refresh)
    last().onopen?.()

    last().onerror?.()
    expect(FakeEventSource.instances).toHaveLength(1)
    last().onopen?.()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("does not open again after being let go", () => {
    const stop = subscribeMercure("t", vi.fn())
    last().readyState = 2
    last().onerror?.()
    stop()
    vi.advanceTimersByTime(60000)

    expect(FakeEventSource.instances).toHaveLength(1)
  })
})

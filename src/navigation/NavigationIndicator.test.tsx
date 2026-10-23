import { useSyncExternalStore } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { ActionList } from "react-data-form"
import { configurePorts, getPorts, Link, NavigationPortInterface } from "@/ports"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { ResourceConfigInterface } from "@/ResourceConfig"
import { createViewResource } from "@/utils/createViewResource"
import { resetNavigationState } from "@/navigation/navigationState"
import { layout } from "@/layout/layout"

/**
 * Moving from one view to another through an in-memory router, the way an
 * application's router would: a click on a link of the library, a new
 * location, a new view that takes its time to load.
 */

let location = "/fast"
const listeners = new Set<() => void>()
const go = (to: string) => {
  location = to
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const memoryRouter: NavigationPortInterface = {
  useNavigate: () => (options) => go(options.to),
  useLocation: () => ({
    pathname: useSyncExternalStore(subscribe, () => location),
    searchStr: "",
  }),
  Link: ({ to, children, onClick, ...rest }) => (
    <a
      href={to}
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
        go(to)
      }}
    >
      {children}
    </a>
  ),
  Navigate: () => null,
}

let release: () => void = () => {}

const fast = createViewResource("nav_fast", {
  storage: "local",
  views: {
    read: {
      components: {
        view: () => (
          <>
            <h2>Fast</h2>
            <Link to="/slow">To the slow view</Link>
          </>
        ),
      },
    },
  },
})

const slow = createViewResource("nav_slow", {
  storage: "local",
  repository: {
    getCollection: () =>
      new Promise((resolve) => {
        release = () =>
          resolve({
            data: {
              "@id": "nav_slow",
              "@type": "Collection",
              member: [],
              totalItems: 0,
            },
          } as never)
      }),
  },
  views: {
    list: {
      layouts: [
        layout.custom({ type: "slow", components: { list: () => <h2>Slow</h2> } }),
      ],
    },
  },
})

function App({ configuration }: { configuration?: ResourceConfigInterface }) {
  const { pathname } = getPorts().navigation.useLocation()
  const resourceId = pathname === "/slow" ? "nav_slow" : "nav_fast"

  return (
    <ResourceViewProvider
      viewResourceContextParams={{
        scope: "nav",
        resourceId,
        resourceAction:
          resourceId === "nav_slow" ? ActionList.list : ActionList.read,
      }}
      configuration={{
        resources: [fast, slow],
        defaultScope: "nav",
        ...configuration,
      }}
    />
  )
}

const original = getPorts().navigation

beforeEach(() => {
  location = "/fast"
  configurePorts({ navigation: memoryRouter })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  configurePorts({ navigation: original })
  resetNavigationState()
})

/** Lets time pass step by step, so timers set by the steps before run too. */
function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    act(() => vi.advanceTimersByTime(Math.min(50, ms - elapsed)))
  }
}

async function navigateToSlow() {
  fireEvent.click(await screen.findByRole("link", { name: "To the slow view" }))
}

describe("the navigation indicator", () => {
  it("appears after 150 ms, and finishes once the new view has its data", async () => {
    render(<App />)
    await navigateToSlow()

    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByRole("progressbar")).toBeNull()

    act(() => vi.advanceTimersByTime(60))
    expect(screen.getByRole("progressbar")).toBeInTheDocument()

    // Still there while the data is loading, and filling up meanwhile.
    advance(2000)
    const bar = screen.getByRole("progressbar")
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(15)
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeLessThan(100)

    await act(async () => release())
    act(() => vi.advanceTimersByTime(0))
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")

    advance(1000)
    expect(screen.queryByRole("progressbar")).toBeNull()
    expect(
      await screen.findByRole("heading", { name: "nav_slow" })
    ).toBeInTheDocument()
  })

  it("marks the view busy while it loads, without taking the focus", async () => {
    render(<App />)
    const link = await screen.findByRole("link", { name: "To the slow view" })
    link.focus()
    fireEvent.click(link)

    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("tabindex")

    await act(async () => release())
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it("shows nothing when the navigation ends within the delay", async () => {
    render(<App />)
    await navigateToSlow()

    await act(async () => release())
    advance(1000)

    expect(screen.queryByRole("progressbar")).toBeNull()
  })

  it("shows nothing with navigationLoader: false", async () => {
    render(<App configuration={{ navigationLoader: false }} />)
    await navigateToSlow()

    advance(1000)
    expect(screen.queryByRole("progressbar")).toBeNull()
    await act(async () => release())
  })

  it("draws the node given as navigationLoader instead of the bar", async () => {
    render(<App configuration={{ navigationLoader: <p>Custom loader</p> }} />)
    await navigateToSlow()

    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByText("Custom loader")).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).toBeNull()

    await act(async () => release())
    advance(1000)
    expect(screen.queryByText("Custom loader")).toBeNull()
  })

  it("tells the component given as navigationLoader when to show", async () => {
    render(
      <App
        configuration={{
          navigationLoader: ({ isNavigating }) => (
            <p>{isNavigating ? "Loading" : "Idle"}</p>
          ),
        }}
      />
    )
    expect(await screen.findByText("Idle")).toBeInTheDocument()
    await navigateToSlow()

    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByText("Loading")).toBeInTheDocument()

    await act(async () => release())
    advance(1000)
    expect(screen.getByText("Idle")).toBeInTheDocument()
  })

  it("follows the router's own signal when its adapter gives one", async () => {
    let pending = false
    configurePorts({
      navigation: { ...memoryRouter, useIsNavigating: () => pending },
    })
    const { rerender } = render(<App />)
    await screen.findByText("Fast")

    pending = true
    rerender(<App />)
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByRole("progressbar")).toBeInTheDocument()

    pending = false
    rerender(<App />)
    advance(1000)
    expect(screen.queryByRole("progressbar")).toBeNull()
  })
})

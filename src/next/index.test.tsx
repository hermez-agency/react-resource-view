import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const router = { push: vi.fn(), replace: vi.fn() }
let pathname = "/tasks"
let params = new URLSearchParams("status=todo")

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => params,
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { configurePorts, getPorts } from "@/ports"
import { nextAdapter } from "./index"

function Probe() {
  const navigate = nextAdapter.useNavigate()
  const location = nextAdapter.useLocation()
  const { Link } = nextAdapter
  return (
    <div>
      <p data-testid="where">
        {location.pathname}|{location.searchStr}|{JSON.stringify(location.search)}
      </p>
      <Link to="/tasks/update/1">edit</Link>
      <button onClick={() => navigate({ to: "/tasks?page=2" })}>push</button>
      <button
        onClick={() => navigate({ to: "/tasks", replace: true, resetScroll: false })}
      >
        replace
      </button>
    </div>
  )
}

describe("nextAdapter", () => {
  beforeEach(() => {
    router.push.mockClear()
    router.replace.mockClear()
    pathname = "/tasks"
    params = new URLSearchParams("status=todo")
  })

  it("plugs into the navigation port", () => {
    configurePorts({ navigation: nextAdapter })
    expect(getPorts().navigation).toBe(nextAdapter)
  })

  it("reads the location from the App Router hooks", () => {
    render(<Probe />)
    expect(screen.getByTestId("where").textContent).toBe(
      '/tasks|?status=todo|{"status":"todo"}'
    )
    expect(screen.getByText("edit").getAttribute("href")).toBe("/tasks/update/1")
  })

  it("has an empty query string when there is no query", () => {
    params = new URLSearchParams()
    render(<Probe />)
    expect(screen.getByTestId("where").textContent).toBe("/tasks||{}")
  })

  it("pushes, or replaces and keeps the scroll position", () => {
    render(<Probe />)
    fireEvent.click(screen.getByText("push"))
    expect(router.push).toHaveBeenCalledWith("/tasks?page=2", { scroll: true })
    fireEvent.click(screen.getByText("replace"))
    expect(router.replace).toHaveBeenCalledWith("/tasks", { scroll: false })
  })

  it("redirects on render", () => {
    const { Navigate } = nextAdapter
    render(<Navigate to="/login" replace />)
    expect(router.replace).toHaveBeenCalledWith("/login")
  })
})

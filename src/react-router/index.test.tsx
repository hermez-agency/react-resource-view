import { describe, expect, it } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  MemoryRouter,
  Route,
  Routes,
  createMemoryRouter,
  RouterProvider,
} from "react-router"
import { configurePorts, getPorts } from "@/ports"
import { reactRouterAdapter } from "./index"

function Probe() {
  const { Link } = reactRouterAdapter
  const navigate = reactRouterAdapter.useNavigate()
  const location = reactRouterAdapter.useLocation()
  const navigating = reactRouterAdapter.useIsNavigating!()
  return (
    <div>
      <p data-testid="where">
        {location.pathname}|{location.searchStr}|{JSON.stringify(location.search)}|
        {String(navigating)}
      </p>
      <Link to="/tasks/update/1">edit</Link>
      <button onClick={() => navigate({ to: "/tasks?page=2" })}>go</button>
    </div>
  )
}

describe("reactRouterAdapter", () => {
  it("plugs into the navigation port", () => {
    configurePorts({ navigation: reactRouterAdapter })
    expect(getPorts().navigation).toBe(reactRouterAdapter)
  })

  it("reads the location and navigates inside a declarative router", () => {
    render(
      <MemoryRouter initialEntries={["/tasks?status=todo"]}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId("where").textContent).toBe(
      '/tasks|?status=todo|{"status":"todo"}|false'
    )
    expect(screen.getByText("edit").getAttribute("href")).toBe("/tasks/update/1")

    fireEvent.click(screen.getByText("go"))
    expect(screen.getByTestId("where").textContent).toContain("|?page=2|")
  })

  it("works under a data router too", () => {
    const router = createMemoryRouter([{ path: "*", element: <Probe /> }], {
      initialEntries: ["/tasks"],
    })
    render(<RouterProvider router={router} />)
    expect(screen.getByTestId("where").textContent).toBe("/tasks||{}|false")
  })
})

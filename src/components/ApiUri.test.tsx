import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resourceRegistered } from "resource-registry"
import ApiUri from "@/components/ApiUri"

const store: Record<string, any> = {}
const fetchData = vi.fn()

vi.mock("jsonld-api-client", () => ({
  fetchDataFromApiPlatform: (iri: string) => fetchData(iri),
  getDataFromApiPlatform: (iri: string) => store[iri],
  removeDataFromApiPlatform: (iri: string) => {
    delete store[iri]
  },
}))

describe("ApiUri", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    for (const key of Object.keys(resourceRegistered)) delete resourceRegistered[key]
    fetchData.mockReset()
  })

  it("stops the loader and shows a fallback when the fetch is rejected", async () => {
    fetchData.mockRejectedValue(new Error("403"))

    const { container } = render(<ApiUri iri="/api/users/1" />)

    await waitFor(() => expect(container.textContent).toBe("-"))
  })

  it("refetches an iri already in cache when noCache is set", async () => {
    store["/api/users/1"] = { "@id": "/api/users/1", name: "Old" }
    fetchData.mockResolvedValue({ "@id": "/api/users/1", name: "Fresh" })

    render(<ApiUri iri="/api/users/1" noCache />)

    expect(await screen.findByText("Fresh")).toBeTruthy()
    expect(fetchData).toHaveBeenCalledTimes(1)
  })

  it("reads the new iri when it changes", async () => {
    fetchData.mockImplementation(async (iri: string) => ({ name: `name of ${iri}` }))

    const { rerender } = render(<ApiUri iri="/api/users/1" />)
    expect(await screen.findByText("name of /api/users/1")).toBeTruthy()

    rerender(<ApiUri iri="/api/users/2" />)
    expect(await screen.findByText("name of /api/users/2")).toBeTruthy()
  })

  it("drops the cache and rereads when the linked resource publishes onChange", async () => {
    let publish = () => {}
    resourceRegistered["users"] = {
      path: "/api/users",
      onChange: {
        subscribe: (callback: () => void) => {
          publish = callback
          return { unsubscribe: () => {} }
        },
      },
    } as never
    fetchData
      .mockResolvedValueOnce({ name: "Before" })
      .mockResolvedValueOnce({ name: "After" })

    render(<ApiUri iri="/api/users/1" />)
    expect(await screen.findByText("Before")).toBeTruthy()
    store["/api/users/1"] = { name: "Before" }

    act(() => publish())

    expect(await screen.findByText("After")).toBeTruthy()
  })
})

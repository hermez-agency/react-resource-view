import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createViewResource } from "@/index"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { createItemMenuWithResource } from "@/menu/menu"
import { resolveScope } from "@/scope/resolveScope"

interface Settings {
  "@id"?: string
  id?: string
  language?: string
}

/** An API serving one record at `/api/settings/me`, created on the first save. */
function settingsApi(initial?: Settings) {
  let stored = initial
  const get = vi.fn(async () => stored)
  const createItem = vi.fn(async (item: Settings) => {
    stored = { ...item, id: "7" }
    return { data: stored }
  })
  const updateItem = vi.fn(async (item: Settings) => {
    stored = { ...stored, ...item }
    return { data: stored }
  })

  return { get, createItem, updateItem }
}

function declare(id: string, api: ReturnType<typeof settingsApi>) {
  return createViewResource<Settings>(id, {
    name: "Settings",
    path: "/api/settings",
    repository: {
      createItem: api.createItem as never,
      updateItem: api.updateItem as never,
    },
    singleton: { get: api.get, defaultData: { language: "fr" } },
    form: { inputs: { language: { label: "Language" } } },
  })
}

function renderSingleton(resource: ReturnType<typeof declare>) {
  return render(
    <ResourceViewProvider
      viewResourceContextParams={{
        resourceId: resource["@id"],
        resourceAction: "update",
        scope: "demo",
      }}
      configuration={{ resources: [resource], defaultScope: "demo" }}
    />
  )
}

afterEach(() => vi.restoreAllMocks())

describe("a singleton resource", () => {
  it("opens the record without an identifier", async () => {
    const api = settingsApi({ id: "7", language: "en" })
    renderSingleton(declare("singleton_found", api))

    await waitFor(() => {
      expect(screen.getByDisplayValue("en")).toBeInTheDocument()
    })
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it("draws the creation form, pre-filled, when the record does not exist", async () => {
    const api = settingsApi()
    renderSingleton(declare("singleton_absent", api))

    await waitFor(() => {
      expect(screen.getByDisplayValue("fr")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole("button", { name: /create|update/i }))

    await waitFor(() => expect(api.createItem).toHaveBeenCalledTimes(1))
    expect(api.createItem.mock.calls[0][0]).toMatchObject({ language: "fr" })
  })

  it("stays on the page after creating, and updates from then on", async () => {
    const api = settingsApi()
    renderSingleton(declare("singleton_create_then_update", api))

    await waitFor(() => {
      expect(screen.getByDisplayValue("fr")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole("button", { name: /create|update/i }))
    await waitFor(() => expect(api.createItem).toHaveBeenCalledTimes(1))

    const field = await screen.findByDisplayValue("fr")
    await userEvent.clear(field)
    await userEvent.type(field, "de")
    await userEvent.click(screen.getByRole("button", { name: /create|update/i }))

    await waitFor(() => expect(api.updateItem).toHaveBeenCalledTimes(1))
    expect(api.updateItem.mock.calls[0][0]).toMatchObject({
      id: "7",
      language: "de",
    })
    expect(api.createItem).toHaveBeenCalledTimes(1)
  })

  it("treats a 404 on its `id` as an absent record", async () => {
    const getItem = vi.fn(async () => {
      throw Object.assign(new Error("Not Found"), { status: 404 })
    })
    const resource = createViewResource<Settings>("singleton_id_404", {
      name: "Settings",
      path: "/api/settings",
      repository: { getItem: getItem as never },
      singleton: { id: "me", defaultData: { language: "fr" } },
      form: { inputs: { language: { label: "Language" } } },
    })
    renderSingleton(resource)

    await waitFor(() => {
      expect(screen.getByDisplayValue("fr")).toBeInTheDocument()
    })
    expect(getItem).toHaveBeenCalledWith({ id: "me" }, expect.anything())
  })

  it("has a menu entry opening the record, not a list", () => {
    const resource = declare("singleton_menu", settingsApi())
    const read = createViewResource<Settings>("singleton_menu_read", {
      name: "Profile",
      path: "/api/profile",
      repository: {},
      singleton: { id: "me", action: "read" },
    })

    expect(createItemMenuWithResource({ resource, scope: "demo" }).href).toBe(
      "/demo/singleton_menu/update"
    )
    expect(createItemMenuWithResource({ resource: read, scope: "demo" }).href).toBe(
      "/demo/singleton_menu_read/read"
    )
    expect(
      resolveScope({ name: "demo", resources: [resource], menu: "auto" }).menu?.[0]
        .href
    ).toBe("/demo/singleton_menu/update")
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fieldPathsOf,
  fieldVisibilityFromHidden,
  fieldVisibilityKey,
  hiddenFields,
  isFieldVisible,
  localFieldVisibilityStore,
  readLegacyHiddenColumns,
  withFieldVisible,
} from "@/views/list/fields/fieldVisibility"

afterEach(() => window.localStorage.clear())

describe("nested fields", () => {
  it("lists what a field sits under, itself last", () => {
    expect(fieldPathsOf("price")).toEqual(["price"])
    expect(fieldPathsOf("user.address.city")).toEqual([
      "user",
      "user.address",
      "user.address.city",
    ])
  })

  it("hides everything under a hidden field", () => {
    expect(isFieldVisible("user.name", ["user"])).toBe(false)
    expect(isFieldVisible("user", ["user"])).toBe(false)
    expect(isFieldVisible("username", ["user"])).toBe(true)
  })

  it("hides one nested field and keeps its siblings", () => {
    const state = withFieldVisible(null, [], "user.email", false)

    expect(isFieldVisible("user.email", hiddenFields(state))).toBe(false)
    expect(isFieldVisible("user.name", hiddenFields(state))).toBe(true)
    expect(isFieldVisible("user", hiddenFields(state))).toBe(true)
  })

  it("shows what a field sits under when it is shown", () => {
    const hidden = withFieldVisible(null, [], "user", false)
    const shown = withFieldVisible(hidden, [], "user.name", true)

    expect(isFieldVisible("user.name", hiddenFields(shown))).toBe(true)
  })
})

describe("fields hidden by default", () => {
  it("are hidden until the reader shows them", () => {
    expect(hiddenFields(null, ["notes"])).toEqual(["notes"])

    const state = withFieldVisible(null, ["notes"], "notes", true)
    expect(state).toEqual({ hidden: [], shown: ["notes"] })
    expect(hiddenFields(state, ["notes"])).toEqual([])
  })

  it("come back hidden when the reader hides them again", () => {
    const shown = withFieldVisible(null, ["notes"], "notes", true)
    const hidden = withFieldVisible(shown, ["notes"], "notes", false)

    expect(hiddenFields(hidden, ["notes"])).toEqual(["notes"])
  })

  it("are shown by a saved view that does not hide them", () => {
    const state = fieldVisibilityFromHidden(["price"], ["notes"])

    expect(hiddenFields(state, ["notes"])).toEqual(["price"])
  })
})

describe("the local store", () => {
  it("keeps one entry per resource, and forgets it on null", () => {
    localFieldVisibilityStore.write("tasks", { hidden: ["price"], shown: [] })

    expect(window.localStorage.getItem(fieldVisibilityKey("tasks"))).toBe(
      JSON.stringify({ hidden: ["price"], shown: [] })
    )
    expect(localFieldVisibilityStore.read("tasks")).toEqual({
      hidden: ["price"],
      shown: [],
    })
    expect(localFieldVisibilityStore.read("users")).toBeNull()

    localFieldVisibilityStore.write("tasks", null)
    expect(localFieldVisibilityStore.read("tasks")).toBeNull()
  })

  it("reads an unreadable entry as nothing", () => {
    window.localStorage.setItem(fieldVisibilityKey("tasks"), "{not json")

    expect(localFieldVisibilityStore.read("tasks")).toBeNull()
  })

  it("tells its subscribers, and stops when asked", () => {
    const listener = vi.fn()
    const stop = localFieldVisibilityStore.subscribe!("tasks", listener)

    localFieldVisibilityStore.write("tasks", { hidden: ["price"], shown: [] })
    localFieldVisibilityStore.write("users", { hidden: ["email"], shown: [] })
    expect(listener).toHaveBeenCalledTimes(1)

    stop()
    localFieldVisibilityStore.write("tasks", null)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe("the columns hidden before the fields were shared", () => {
  it("are read from every layout of the resource, and cleared to their order", () => {
    window.localStorage.setItem(
      "react-resource-view:columns:tasks:table",
      JSON.stringify({ order: ["title", "price"], hidden: ["price"] })
    )
    window.localStorage.setItem(
      "react-resource-view:columns:tasks:compact",
      JSON.stringify({ order: ["title"], hidden: ["notes"] })
    )
    window.localStorage.setItem(
      "react-resource-view:columns:other:table",
      JSON.stringify({ order: [], hidden: ["title"] })
    )

    const legacy = readLegacyHiddenColumns("tasks")
    expect(legacy?.hidden.sort()).toEqual(["notes", "price"])

    legacy?.clear()
    expect(
      JSON.parse(
        window.localStorage.getItem("react-resource-view:columns:tasks:table")!
      )
    ).toEqual({ order: ["title", "price"] })
    expect(
      JSON.parse(
        window.localStorage.getItem("react-resource-view:columns:other:table")!
      )
    ).toEqual({ order: [], hidden: ["title"] })
    expect(readLegacyHiddenColumns("tasks")).toBeNull()
  })

  it("are nothing when no table hid any", () => {
    window.localStorage.setItem(
      "react-resource-view:columns:tasks:table",
      JSON.stringify({ order: ["title"], hidden: [] })
    )

    expect(readLegacyHiddenColumns("tasks")).toBeNull()
  })
})

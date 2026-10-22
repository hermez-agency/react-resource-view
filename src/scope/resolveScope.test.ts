import { describe, expect, it } from "vitest"
import { createViewResource } from "@/utils/createViewResource"
import { resolveScope } from "@/scope/resolveScope"
import { setCurrentScope } from "@/scope/scope"

/**
 * A resource no longer names its scope: the scope lists its resources, and
 * that list is the one place the link between them is written.
 */

let count = 0
const resource = (name: string) =>
  createViewResource(`scope_${name.toLowerCase()}_${++count}`, {
    name,
    storage: "local",
  })

describe("resolveScope", () => {
  it("ties the resources it lists to the scope", () => {
    const users = resource("Users")
    resolveScope({ name: "back_office", resources: [users] })

    expect(users.scope).toBe("back_office")
  })

  it("links a resource listed by several scopes within the one on screen", () => {
    const shared = resource("Shared")
    resolveScope({ name: "first", resources: [shared] })
    resolveScope({ name: "second", resources: [shared] })

    setCurrentScope("second")
    expect(shared.scope).toBe("second")
    // Within the first that loaded, from anywhere else.
    setCurrentScope("elsewhere")
    expect(shared.scope).toBe("first")
    setCurrentScope(undefined)
  })

  it('builds the menu out of the resources with `menu: "auto"`', () => {
    const users = resource("Users")
    const posts = resource("Posts")
    const scope = resolveScope({ name: "auto_menu", resources: [users, posts], menu: "auto" })

    expect(scope.menu?.map((entry) => entry.name)).toEqual(["Users", "Posts"])
    expect(scope.menu?.[0].href).toBe(`/auto_menu/${users["@id"]}/list`)
  })

  it("takes resources, links and groups in a menu of its own", () => {
    const users = resource("Users")
    const posts = resource("Posts")
    const scope = resolveScope({
      name: "own_menu",
      resources: [users, posts],
      menu: [
        users,
        { name: "Content", items: [posts, { name: "Help", href: "/help" }] },
      ],
    })

    expect(scope.menu?.[0]).toMatchObject({
      name: "Users",
      href: `/own_menu/${users["@id"]}/list`,
    })
    expect(scope.menu?.[1].name).toBe("Content")
    expect(scope.menu?.[1].items?.map((entry) => entry.href)).toEqual([
      `/own_menu/${posts["@id"]}/list`,
      "/help",
    ])
  })

  it("keeps the getters of an entry, read as the menu draws", () => {
    let language = "en"
    let layout = "board"
    const entry = {
      get name() {
        return language === "en" ? "Settings" : "Réglages"
      },
      get href() {
        return `/tasks?layout=${layout}`
      },
    }
    const scope = resolveScope({
      name: "live_menu",
      menu: [entry, { name: "Group", items: [entry] }],
    })

    language = "fr"
    layout = "table"
    expect(scope.menu?.[0]).toMatchObject({
      name: "Réglages",
      href: "/tasks?layout=table",
    })
    expect(scope.menu?.[1].items?.[0].name).toBe("Réglages")
  })

  it("leaves a scope without a menu without one", () => {
    expect(resolveScope({ name: "no_menu" }).menu).toBeUndefined()
  })
})

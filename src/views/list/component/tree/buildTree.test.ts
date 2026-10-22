import { describe, expect, it } from "vitest"
import { branchKeys, buildTree } from "@/views/list/component/tree/buildTree"

const identities = (data: Record<string, unknown>) => [
  data["@id"] as string | undefined,
  data.id === undefined ? undefined : String(data.id),
]

const row = (id: number, parent?: unknown) => ({
  data: { "@id": `/api/pages/${id}`, id, title: `Page ${id}`, parent },
})

describe("buildTree", () => {
  it("files every record under the record its parent field points at", () => {
    const tree = buildTree(
      [row(1), row(2, "/api/pages/1"), row(3, "/api/pages/2"), row(4)],
      "parent",
      identities
    )

    expect(tree.map((n) => n.key)).toEqual(["/api/pages/1", "/api/pages/4"])
    expect(tree[0].children[0].key).toBe("/api/pages/2")
    expect(tree[0].children[0].children[0]).toMatchObject({
      key: "/api/pages/3",
      depth: 2,
    })
  })

  it("reads a parent given as a short identifier or as an object", () => {
    const tree = buildTree(
      [row(1), row(2, 1), row(3, { "@id": "/api/pages/1", title: "Page 1" })],
      "parent",
      identities
    )

    expect(tree).toHaveLength(1)
    expect(tree[0].children.map((n) => n.key)).toEqual([
      "/api/pages/2",
      "/api/pages/3",
    ])
  })

  // The page on screen is all the tree knows: a record whose parent is on
  // another page must stay visible.
  it("makes a root of a record whose parent is not on the page", () => {
    const tree = buildTree([row(2, "/api/pages/99")], "parent", identities)

    expect(tree.map((n) => n.key)).toEqual(["/api/pages/2"])
  })

  it("shows every record of a parent chain that loops back on itself", () => {
    const tree = buildTree(
      [row(1, "/api/pages/2"), row(2, "/api/pages/1"), row(3, "/api/pages/3")],
      "parent",
      identities
    )
    const count = (nodes: typeof tree): number =>
      nodes.reduce((sum, n) => sum + 1 + count(n.children), 0)

    expect(count(tree)).toBe(3)
  })

  it("lists the branches, nested ones included", () => {
    const tree = buildTree(
      [row(1), row(2, "/api/pages/1"), row(3, "/api/pages/2"), row(4)],
      "parent",
      identities
    )

    expect(branchKeys(tree)).toEqual(["/api/pages/1", "/api/pages/2"])
  })
})

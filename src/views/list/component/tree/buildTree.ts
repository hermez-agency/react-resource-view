import type { RowInterface } from "@/ViewResource"
import { RecordOfAny } from "@/internal/type/RecordOfAny"

export interface TreeNode {
  /** The key the node is known by on the page: its identity, or its index. */
  key: string
  row: RowInterface
  depth: number
  children: TreeNode[]
}

/**
 * The ways a record can be pointed at by its children: its identity as the API
 * spells it (an IRI, a `documentId`, a primary key) and the short identifier a
 * URL segment takes. A child may hold either, or the parent object itself.
 */
export type IdentitiesOf = (data: RecordOfAny) => (string | undefined)[]

/** What a parent field holds, reduced to the identity it points at. */
function referenceOf(value: unknown, identitiesOf: IdentitiesOf): string[] {
  if (value === null || value === undefined || value === "") return []
  if (typeof value === "string" || typeof value === "number") return [String(value)]
  if (typeof value === "object") {
    return identitiesOf(value as RecordOfAny).filter(
      (id): id is string => id !== undefined
    )
  }
  return []
}

/**
 * Turns the flat page of records the API returned into a forest, through the
 * field each record names its parent in.
 *
 * Nothing is fetched: a record whose parent is not on the page — filtered out,
 * on another page, or gone — is a root, rather than a record the list no longer
 * shows. A parent chain that loops back on itself is cut where it closes, so a
 * record pointing at its own descendant still appears once.
 */
export function buildTree(
  rows: RowInterface[],
  parentField: string,
  identitiesOf: IdentitiesOf
): TreeNode[] {
  const nodes = rows.map<TreeNode>((row, index) => ({
    key: identitiesOf(row.data ?? {})[0] ?? "row-" + index,
    row,
    depth: 0,
    children: [],
  }))

  const byIdentity = new Map<string, number>()
  rows.forEach((row, index) => {
    for (const id of identitiesOf(row.data ?? {})) {
      if (id !== undefined && !byIdentity.has(id)) byIdentity.set(id, index)
    }
  })

  const parentOf = rows.map((row) => {
    const refs = referenceOf((row.data as RecordOfAny)?.[parentField], identitiesOf)
    for (const ref of refs) {
      const index = byIdentity.get(ref)
      if (index !== undefined) return index
    }
    return -1
  })

  // A record is cut from its parent when walking up from that parent leads
  // back to it: a cycle, which would otherwise make the whole loop vanish.
  const loopsBack = (index: number) => {
    const seen = new Set<number>([index])
    let current = parentOf[index]
    while (current !== -1) {
      if (seen.has(current)) return true
      seen.add(current)
      current = parentOf[current]
    }
    return false
  }

  const roots: TreeNode[] = []
  nodes.forEach((node, index) => {
    const parent = parentOf[index]
    if (parent === -1 || parent === index || loopsBack(index)) {
      roots.push(node)
    } else {
      nodes[parent].children.push(node)
    }
  })

  const setDepth = (list: TreeNode[], depth: number) => {
    for (const node of list) {
      node.depth = depth
      setDepth(node.children, depth + 1)
    }
  }
  setDepth(roots, 0)

  return roots
}

/** Every node of the forest that has children: what "expand all" opens. */
export function branchKeys(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children.length ? [node.key, ...branchKeys(node.children)] : []
  )
}

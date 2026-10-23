import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

/** The calls to `getIdFromObject` that stop short of the resource argument. */
function callsWithoutResource(code: string): string[] {
  const found: string[] = []
  for (const match of code.matchAll(/\bgetIdFromObject\(/g)) {
    let depth = 1
    let args = 1
    let end = match.index + match[0].length
    for (; end < code.length && depth > 0; end++) {
      const char = code[end]
      if ("([{".includes(char)) depth++
      else if (")]}".includes(char)) depth--
      else if (char === "," && depth === 1) args++
    }
    if (args < 3) found.push(code.slice(match.index, end))
  }
  return found
}

describe("getIdFromObject", () => {
  // Without the resource it reads the identity with the configured dialect —
  // `id` for a Strapi record whose link wants its `documentId`.
  it("is always given the resource whose dialect reads the record", () => {
    const calls = sources("src").flatMap((file) =>
      callsWithoutResource(readFileSync(file, "utf8")).map(
        (call) => `${file}: ${call}`
      )
    )

    expect(calls).toEqual([])
  })
})

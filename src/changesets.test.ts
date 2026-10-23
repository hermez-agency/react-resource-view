import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// The rules are written for people in `.changeset/README.md`.
const HEADINGS = ["Added", "Changed", "Fixed", "Breaking"]

/** Words a French sentence can hardly do without, and an English one never uses. */
const FRENCH_WORDS =
  /\b(au lieu|les|des|une|est|avec|sans|dans|pour|qui|sur|et|ou|le|la|du|aux|pas|ne)\b/gi

/**
 * The French words of a text, outside its code and its quotes: an entry may
 * quote the French label it replaced, or an identifier.
 */
function frenchWords(text: string): string[] {
  const prose = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/"[^"\n]*"/g, "")
    .replace(/«[^»\n]*»/g, "")
  return prose.match(FRENCH_WORDS) ?? []
}

function heading(summary: string): string | undefined {
  return HEADINGS.find((name) => summary.startsWith(`${name}: `))
}

const changesets = readdirSync(".changeset")
  .filter((name) => name.endsWith(".md") && name !== "README.md")
  .map((name) => {
    const source = readFileSync(join(".changeset", name), "utf8")
    const [, frontmatter = "", body = ""] =
      /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source) ?? []
    return { name, bump: /:\s*(\w+)\s*$/.exec(frontmatter)?.[1], body: body.trim() }
  })

describe("changesets", () => {
  it.each(changesets)("$name opens on a heading", ({ body }) => {
    expect(heading(body), body.split("\n")[0]).toBeDefined()
  })

  it.each(changesets)(
    "$name is Breaking exactly when it is major",
    ({ bump, body }) => {
      expect(heading(body) === "Breaking").toBe(bump === "major")
    }
  )

  it.each(changesets)("$name is written in English", ({ body }) => {
    expect(frenchWords(body)).toEqual([])
  })
})

describe("CHANGELOG.md", () => {
  const changelog = readFileSync("CHANGELOG.md", "utf8")

  it("is written in English", () => {
    expect(frenchWords(changelog)).toEqual([])
  })

  // The headings were adopted with 1.2.x; older entries keep their
  // conventional-commit prefix.
  it("opens every entry on a heading from 1.2.0 on", () => {
    const recent = changelog.slice(0, changelog.indexOf("\n## 1.1.0\n"))
    const entries = [...recent.matchAll(/^- [0-9a-f]{7,}: (.*)$/gm)].map(
      ([, summary]) => summary
    )

    expect(entries.length).toBeGreaterThan(0)
    expect(entries.filter((summary) => !heading(summary))).toEqual([])
  })
})

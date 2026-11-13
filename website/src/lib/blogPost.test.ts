import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parsePost, readingMinutes, renderMarkdown, sortPosts } from "@/lib/blogPost"

const VALID = `---
title: Un titre
description: Une description
date: 2026-11-13
tags: [Tutoriel]
---

## Ce qu'on construit

Du texte avec un [lien](/docs/form/) et une image.

![Légende](/blog/cover.png "Une légende")

\`\`\`ts
const a = 1 < 2
\`\`\`
`

describe("parsePost", () => {
  it("reads the frontmatter, the reading time and the body", () => {
    const post = parsePost("un-titre", VALID)
    expect(post).toMatchObject({
      slug: "un-titre",
      title: "Un titre",
      description: "Une description",
      date: "2026-11-13",
      tags: ["Tutoriel"],
      minutes: 1,
    })
    expect(post.updated).toBeUndefined()
    expect(post.body).toContain("## Ce qu'on construit")
  })

  it.each([
    ["a missing description", VALID.replace("description: Une description\n", "")],
    ["a date that is not a day", VALID.replace("2026-11-13", "demain")],
    ["no tags", VALID.replace("tags: [Tutoriel]", "tags: []")],
    ["no frontmatter", "Du texte"],
  ])("refuses %s, naming the file", (_, raw) => {
    expect(() => parsePost("un-titre", raw)).toThrow(/blog\/un-titre\.md/)
  })

  it("refuses a file name that is not a slug", () => {
    expect(() => parsePost("Un Titre", VALID)).toThrow(/hyphens/)
  })
})

describe("sortPosts", () => {
  it("puts the newest first", () => {
    const older = parsePost("a", VALID.replace("2026-11-13", "2026-01-01"))
    const newer = parsePost("b", VALID)
    expect(sortPosts([older, newer]).map((post) => post.slug)).toEqual(["b", "a"])
  })
})

describe("readingMinutes", () => {
  it("ignores code blocks and never drops under one minute", () => {
    expect(readingMinutes("```\n" + "mot ".repeat(1000) + "\n```\nbref")).toBe(1)
    expect(readingMinutes("mot ".repeat(401))).toBe(3)
  })
})

describe("renderMarkdown", () => {
  const html = renderMarkdown(parsePost("un-titre", VALID).body, {
    base: "/react-resource-view/",
    highlight: (code, lang) => (lang === "ts" ? `<pre class="shiki">${code}</pre>` : undefined),
  })

  it("gives headings an id without the accents or the apostrophe", () => {
    expect(html).toContain('<h2 id="ce-quon-construit">')
  })

  it("puts the site base on root-relative links and images", () => {
    expect(html).toContain('href="/react-resource-view/docs/form/"')
    expect(html).toContain('src="/react-resource-view/blog/cover.png"')
  })

  it("draws an image alone on its line as a figure with its caption", () => {
    expect(html).toContain('<figure data-width="wide"')
    expect(html).toContain("<figcaption")
    expect(html).not.toContain("<p><figure")
  })

  it("hands code to the highlighter, and escapes it when there is none", () => {
    expect(html).toContain('<pre class="shiki">')
    const plain = renderMarkdown("```text\n<b>\n```", { base: "/" })
    expect(plain).toContain("<pre><code>&lt;b&gt;")
  })
})

describe("the articles of the repository", () => {
  const dir = join(import.meta.dirname, "..", "..", "blog")

  it("all parse", () => {
    const names = readdirSync(dir).filter((name) => name.endsWith(".md"))
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(() =>
        parsePost(name.slice(0, -3), readFileSync(join(dir, name), "utf8"))
      ).not.toThrow()
    }
  })
})

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  checkTranslations,
  missingTranslations,
  parsePost,
  readingMinutes,
  renderMarkdown,
  sortPosts,
  translationsOf,
} from "@/lib/blogPost"

const VALID = `---
title: Un titre
description: Une description
date: 2026-11-13
lang: fr
translation: un-titre
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
      lang: "fr",
      translation: "un-titre",
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
    ["no language", VALID.replace("lang: fr\n", "")],
    ["an unknown language", VALID.replace("lang: fr", "lang: de")],
    ["no translation key", VALID.replace("translation: un-titre\n", "")],
    ["a translation key that is not a slug", VALID.replace("translation: un-titre", "translation: Un Titre")],
  ])("refuses %s, naming the file", (_, raw) => {
    expect(() => parsePost("un-titre", raw)).toThrow(/blog\/un-titre\.md/)
  })

  it("refuses a file name that is not a slug", () => {
    expect(() => parsePost("Un Titre", VALID)).toThrow(/hyphens/)
  })

  it("refuses a language's name as a slug: /blog/fr/ is the French index", () => {
    expect(() => parsePost("fr", VALID)).toThrow(/reserved/)
  })
})

describe("translations", () => {
  const fr = parsePost("un-titre", VALID)
  const en = parsePost("a-title", VALID.replace("lang: fr", "lang: en"))
  const alone = parsePost("seul", VALID.replace("translation: un-titre", "translation: seul"))

  it("links the versions of an article through their key", () => {
    expect(translationsOf([fr, en, alone], fr)).toEqual([en])
    expect(translationsOf([fr, en, alone], en)).toEqual([fr])
    expect(translationsOf([fr, en, alone], alone)).toEqual([])
  })

  it("names the article that has no version in the other language", () => {
    expect(missingTranslations([fr, en])).toEqual([])
    expect(missingTranslations([fr, en, alone])).toEqual([{ slug: "seul", lang: "en" }])
  })

  it("refuses two articles of one language under the same key, naming both", () => {
    const twin = parsePost("un-autre-titre", VALID)
    expect(() => checkTranslations([fr, twin])).toThrow(
      /blog\/un-autre-titre\.md.*blog\/un-titre\.md/
    )
    expect(checkTranslations([fr, en])).toEqual([fr, en])
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
  const names = readdirSync(dir).filter((name) => name.endsWith(".md"))
  const read = () =>
    names.map((name) => parsePost(name.slice(0, -3), readFileSync(join(dir, name), "utf8")))

  it("all parse", () => {
    expect(names.length).toBeGreaterThan(0)
    expect(read).not.toThrow()
  })

  it("never share a translation key within one language", () => {
    expect(() => checkTranslations(read())).not.toThrow()
  })

  it("all exist in English and in French", () => {
    // Publish both versions with the same `translation:` key (see blog/README.md).
    expect(missingTranslations(read())).toEqual([])
  })

  it("keep the same date in both languages", () => {
    const posts = read()
    for (const post of posts) {
      for (const other of translationsOf(posts, post)) {
        expect(other.date, `${post.slug} / ${other.slug}`).toBe(post.date)
      }
    }
  })
})

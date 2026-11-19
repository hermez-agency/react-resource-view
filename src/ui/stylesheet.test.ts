/**
 * The stylesheet Tailwind builds from the library's classes asks Chrome
 * nothing that restyles the whole page.
 *
 * A consumer scans `dist/` with `@source`, so every class written in `src/`
 * ends up in its stylesheet. Two shapes made Chrome restyle every element of
 * a large page each time a window opened or closed (a portal inserted under
 * `<body>`, then removed — about 300 to 430 ms each on a table of 57,000
 * nodes):
 *
 * - a `:has()` written before the element a rule styles — what `group-has-*`
 *   and `has-[…]:*:` / `has-[…]:[&>…]:` compile to — when that element is
 *   anything, or any `[data-slot]` / `[role]`: Chrome cannot tell which
 *   elements a change under the `:has()` may now match;
 * - `[a] ~ *` or `[data-slot] ~ [data-slot]`: every parent of a slot, `<body>`
 *   included, is then marked as styling its children by the ones before them.
 *
 * The components write the same rules with a class or a tag as the subject,
 * the `:has()` on the element itself, or `:nth-child(n + 2 of …)` instead of
 * `~`. This test builds the sheet from `src/` — with Tailwind's own scanner,
 * as a consumer's build does — and fails if either shape comes back.
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { Scanner } from "@tailwindcss/oxide"
import { compile } from "tailwindcss"
import { describe, expect, it } from "vitest"

// Tests run from the root of the package.
const SRC = join(process.cwd(), "src")
const TAILWIND = dirname(
  createRequire(join(process.cwd(), "package.json")).resolve(
    "tailwindcss/package.json"
  )
)

/** The sheet a consumer gets: Tailwind, the library's theme, and every class of `src/`. */
async function builtSheet(): Promise<string> {
  const scanner = new Scanner({
    sources: [
      { base: SRC, pattern: "**/*", negated: false },
      // Tests are not published.
      { base: SRC, pattern: "**/*.test.*", negated: true },
    ],
  })
  const compiler = await compile(
    `@import "tailwindcss";\n${readFileSync(join(SRC, "styles.css"), "utf8")}`,
    {
      base: SRC,
      loadStylesheet: async (id, base) => ({
        path: id,
        base,
        content: readFileSync(join(TAILWIND, "index.css"), "utf8"),
      }),
    }
  )
  return compiler.build(scanner.scan())
}

/** A selector list cut at its own commas. */
function items(list: string): string[] {
  const out: string[] = []
  let start = 0
  for (let at = groupEnd(list, 0); at < list.length; at = groupEnd(list, at + 1)) {
    out.push(list.slice(start, at).trim())
    start = at + 1
  }
  out.push(list.slice(start).trim())
  return out
}

/** A rule nested in another, written out whole: `&` is the parent, or the parent comes first. */
function nested(parent: string | undefined, child: string): string {
  if (!parent) return child
  return items(parent)
    .flatMap((outer) =>
      items(child).map((inner) =>
        inner.includes("&") ? inner.replaceAll("&", outer) : `${outer} ${inner}`
      )
    )
    .join(",")
}

/** Every selector of a sheet — in an at-rule's block, or nested in another rule — as the browser reads it. */
function selectors(css: string): string[] {
  const found: string[] = []
  // What each open block is: the selector of a rule, or nothing for an at-rule.
  const open: (string | undefined)[] = []
  let start = 0
  let quote = ""
  for (let at = 0; at < css.length; at++) {
    const char = css[at]
    if (quote) {
      if (char === "\\") at++
      else if (char === quote) quote = ""
    } else if (char === "\\") at++
    else if (char === '"' || char === "'") quote = char
    else if (char === "{") {
      const prelude = css.slice(start, at).trim()
      const parent = open.findLast((selector) => selector !== undefined)
      if (prelude.startsWith("@")) open.push(undefined)
      else {
        const whole = nested(parent, prelude)
        found.push(whole)
        open.push(whole)
      }
      start = at + 1
    } else if (char === "}") {
      open.pop()
      start = at + 1
    } else if (char === ";") start = at + 1
  }
  return found
}

/** Where the group that opens before `from` closes — at a comma too, with `list` — or the end of the text. */
function groupEnd(text: string, from: number, list = true): number {
  let depth = 0
  for (let at = from; at < text.length; at++) {
    const char = text[at]
    if (char === "\\") at++
    else if (char === "(") depth++
    else if (char === ")") {
      if (depth === 0) return at
      depth--
    } else if (list && char === "," && depth === 0) return at
  }
  return text.length
}

/** The text with every parenthesised group and attribute emptied: what is left is its own level. */
function ownLevel(text: string): string {
  let out = ""
  let depth = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]
    if (char === "\\") {
      if (depth === 0) out += text.slice(at, at + 2)
      at++
    } else if (char === "(" || char === "[") {
      if (depth === 0) out += char
      depth++
    } else if (char === ")" || char === "]") {
      depth--
      if (depth === 0) out += char
    } else if (depth === 0) out += char
  }
  return out
}

/** Each `:has()` of a selector that is not on the element the rule styles, with that element. */
function hasBefore(selector: string): { has: string; subject: string }[] {
  const wrong: { has: string; subject: string }[] = []
  for (
    let at = selector.indexOf(":has(");
    at >= 0;
    at = selector.indexOf(":has(", at + 1)
  ) {
    const close = groupEnd(selector, at + 5, false)
    // What follows the `:has()` in its own group: the rest of the selector, or
    // of the `:is()` / `:not()` it is written in.
    const rest = ownLevel(selector.slice(close + 1, groupEnd(selector, close + 1)))
    const combinator = rest.search(/[\s>+~]/)
    if (combinator < 0) continue
    const subject =
      rest
        .slice(combinator)
        .trim()
        .split(/[\s>+~]+/)
        .pop() ?? ""
    // A class or a tag narrows it down; `*`, an attribute or a pseudo-class alone do not.
    if (/^[a-z][a-z0-9-]*|\.(?:[^\s\\]|\\.)/i.test(subject)) continue
    wrong.push({ has: selector.slice(at, close + 1), subject: subject || "*" })
  }
  return wrong
}

/** Whether a selector styles, after a `~`, anything or any element carrying an attribute. */
function siblingOfAny(selector: string): boolean {
  return /~\s*(?:\*|\[[\w-]+\])\s*$/.test(selector)
}

describe("the checks", () => {
  it("find what Tailwind compiles group-has and has-*: to, and let the rest by", () => {
    expect(hasBefore(".a:is(:where(.group\\/field):has(:disabled) *)")).toHaveLength(
      1
    )
    expect(
      hasBefore(":is(.b:has(>[data-variant=outline])>*)[data-slot=input-group]")
    ).toHaveLength(1)
    expect(
      hasBefore(
        ".c:has(>[data-variant=outline])>[data-slot=select-trigger]:focus-visible"
      )
    ).toHaveLength(1)
    expect(
      hasBefore(
        ":is(.d:has(>[data-slot=field-content])>[role=checkbox],.d:has(>[data-slot=field-content]) [role=radio])"
      )
    ).toHaveLength(2)
    // On the element itself, or before a class or a tag.
    expect(hasBefore(".has-\\[\\>svg\\]\\:px-4:has(>svg)")).toHaveLength(0)
    expect(hasBefore("[data-slot]:not(:has(~[data-slot]))")).toHaveLength(0)
    expect(
      hasBefore(
        ":where(.group\\/item):has([data-slot=item-description]) .f\\:self-start"
      )
    ).toHaveLength(0)
    expect(
      hasBefore(".g:has(>[data-variant=outline])>input:focus-visible")
    ).toHaveLength(0)
    // A nested rule is read with its parent.
    expect(
      selectors(
        "@layer x{body:has([data-slot=head]){color:red;[data-slot=tabs]>[data-slot=card]{display:none}}}"
      )
    ).toEqual([
      "body:has([data-slot=head])",
      "body:has([data-slot=head]) [data-slot=tabs]>[data-slot=card]",
    ])
  })

  it("find a sibling that is any slot, and let a named one by", () => {
    expect(siblingOfAny(".x > [data-slot] ~ [data-slot]")).toBe(true)
    expect(siblingOfAny(".x > [data-variant=outline] ~ *")).toBe(true)
    expect(siblingOfAny(".x > [data-slot]:nth-child(n + 2 of [data-slot])")).toBe(
      false
    )
    expect(
      siblingOfAny(".x > [data-variant=outline] ~ [data-slot=input-group]")
    ).toBe(false)
  })
})

describe("the stylesheet built from src/", () => {
  it("has no :has() before a subject Chrome cannot narrow", async () => {
    const wrong = selectors(await builtSheet()).flatMap((selector) =>
      hasBefore(selector).map(
        ({ has, subject }) => `${has} before ${subject} in ${selector}`
      )
    )
    expect(wrong).toEqual([])
  })

  it("has no `~` that styles any slot, or anything", async () => {
    const wrong = selectors(await builtSheet())
      .flatMap(items)
      .filter(siblingOfAny)
    expect(wrong).toEqual([])
  })
})

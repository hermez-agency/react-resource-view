import { describe, expect, it } from "vitest"
import ts from "typescript"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { messages } from "./messages"

/** Every file of `dir` that the library ships: no tests, no declarations. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    const shipped =
      /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)
    return shipped ? [path] : []
  })
}

/** The string a node can only be, or undefined: a literal, or a ternary of two. */
function literalsOf(expression: ts.Expression): string[] | undefined {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return [expression.text]
  }
  if (ts.isConditionalExpression(expression)) {
    const whenTrue = literalsOf(expression.whenTrue)
    const whenFalse = literalsOf(expression.whenFalse)
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : undefined
  }
  return undefined
}

/** JSX trims the lines of a text child the way React renders them. */
function jsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/)
  return lines
    .map((line, index) => {
      let text = line.replace(/\t/g, " ")
      if (index !== 0) text = text.replace(/^ +/, "")
      if (index !== lines.length - 1) text = text.replace(/ +$/, "")
      return text
    })
    .filter(Boolean)
    .join(" ")
}

/**
 * The keys the source translates with a literal: `translate("…")` and the
 * text of `<Trans>…</Trans>`. A key read from a variable (a view's title, a
 * column's label) is the caller's, and cannot be checked here.
 */
function literalKeys(file: string): string[] {
  const keys: string[] = []
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "translate" &&
      node.arguments[0]
    ) {
      keys.push(...(literalsOf(node.arguments[0]) ?? []))
    }

    if (
      ts.isJsxElement(node) &&
      ts.isIdentifier(node.openingElement.tagName) &&
      node.openingElement.tagName.text === "Trans"
    ) {
      let text = ""
      let literal = true
      for (const child of node.children) {
        if (ts.isJsxText(child)) text += jsxText(child.text)
        else if (ts.isJsxExpression(child) && child.expression) {
          const parts = literalsOf(child.expression)
          if (parts?.length === 1) text += parts[0]
          else literal = false
        } else literal = false
      }
      if (literal && text) keys.push(text)
    }

    ts.forEachChild(node, visit)
  }
  visit(source)

  return keys
}

describe("messages", () => {
  it("has an entry for every literal key the library translates", () => {
    const used = sourceFiles("src").flatMap(literalKeys)
    const absent = [...new Set(used)].filter((key) => !(key in messages))

    expect(absent).toEqual([])
  })
})

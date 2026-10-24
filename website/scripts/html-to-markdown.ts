/**
 * Turns the prerendered HTML of a documentation page into Markdown.
 *
 * `llms-full.txt` is built from the HTML the build already produced rather than
 * from the route files: a page is TSX — components, constants, JSX — and only
 * the rendered output holds the text and the code samples the way a reader
 * gets them. It only knows the tags the prose components emit (see
 * `src/components/prose.tsx`), and drops what is not content: icons, copy
 * buttons, the heading anchors' "#".
 *
 * A plain Child script's helper, like its callers: no dependency, and only
 * syntax Child can strip.
 */

interface ElementNode {
  tag: string
  attributes: string
  children: Child[]
}
type Child = ElementNode | string

const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "wbr"])
/** Subtrees that are chrome, not content. */
const SKIPPED = new Set(["svg", "button", "script", "style", "aside"])

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10)
      return String.fromCodePoint(code)
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

function parse(html: string): ElementNode {
  const root: ElementNode = { tag: "#root", attributes: "", children: [] }
  const stack = [root]
  const tokens = html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|[^<]+/g)

  for (const [token, closing, tag, attributes] of tokens) {
    const top = stack[stack.length - 1]
    if (token.startsWith("<!--")) continue
    if (tag === undefined) {
      top.children.push(token)
      continue
    }
    const name = tag.toLowerCase()
    if (closing) {
      const index = stack.map((node) => node.tag).lastIndexOf(name)
      if (index > 0) stack.length = index
      continue
    }
    const node: ElementNode = { tag: name, attributes, children: [] }
    top.children.push(node)
    if (!VOID.has(name) && !attributes.endsWith("/")) stack.push(node)
  }
  return root
}

function attribute(node: ElementNode, name: string): string | undefined {
  const match = node.attributes.match(new RegExp(`\\s${name}="([^"]*)"`))
  return match ? decode(match[1]) : undefined
}

function rawText(node: Child): string {
  if (typeof node === "string") return decode(node)
  if (SKIPPED.has(node.tag)) return ""
  return node.children.map(rawText).join("")
}

function hidden(node: ElementNode): boolean {
  return (
    SKIPPED.has(node.tag) ||
    // The "#" a heading shows on hover.
    (attribute(node, "class") ?? "").includes("opacity-0")
  )
}

export interface MarkdownOptions {
  /** Prefix for links that start with a slash: `https://host`. */
  origin: string
}

export function htmlToMarkdown(html: string, options: MarkdownOptions): string {
  function inline(node: Child): string {
    if (typeof node === "string") return decode(node).replace(/\s+/g, " ")
    if (hidden(node)) return ""
    const content = () => node.children.map(inline).join("")

    switch (node.tag) {
      case "code": {
        const text = rawText(node)
        const fence = text.includes("`") ? "``" : "`"
        return `${fence}${text}${fence}`
      }
      case "strong":
      case "b":
        return wrap("**", content())
      case "em":
      case "i":
        return wrap("*", content())
      case "br":
        return "  \n"
      case "a": {
        const href = attribute(node, "href") ?? ""
        const text = content().trim()
        // A hash on its own leads nowhere once the pages are one file.
        if (!text || href === "" || href.startsWith("#")) return text
        return `[${text}](${href.startsWith("/") ? options.origin + href : href})`
      }
      default:
        return content()
    }
  }

  function wrap(mark: string, text: string): string {
    const trimmed = text.trim()
    if (!trimmed) return text
    const lead = text.slice(0, text.length - text.trimStart().length)
    const trail = text.slice(text.trimEnd().length)
    return `${lead}${mark}${trimmed}${mark}${trail}`
  }

  /** Inline content of an element, as one trimmed line. */
  function line(node: ElementNode): string {
    return inline(node).replace(/\s+/g, " ").trim()
  }

  function codeBlock(node: ElementNode): string {
    const text = rawText(node).replace(/\n+$/, "")
    const fence = text.includes("```") ? "~~~~" : "```"
    return `\n\n${fence}\n${text}\n${fence}\n\n`
  }

  function list(node: ElementNode, ordered: boolean): string {
    const items = node.children
      .filter((child): child is ElementNode => typeof child !== "string")
      .filter((child) => child.tag === "li")
      .map((item, index) => {
        const marker = ordered ? `${index + 1}. ` : "- "
        const body = blocks(item.children).trim()
        return marker + body.replace(/\n/g, `\n${" ".repeat(marker.length)}`)
      })
    return `\n\n${items.join("\n")}\n\n`
  }

  function table(node: ElementNode): string {
    const rows: ElementNode[] = []
    const collect = (parent: ElementNode) => {
      for (const child of parent.children) {
        if (typeof child === "string" || hidden(child)) continue
        if (child.tag === "tr") rows.push(child)
        else collect(child)
      }
    }
    collect(node)

    const cells = rows.map((row) =>
      row.children
        .filter((cell): cell is ElementNode => typeof cell !== "string")
        .filter((cell) => cell.tag === "th" || cell.tag === "td")
        .map((cell) => line(cell).replace(/\|/g, "\\|"))
    )
    if (cells.length === 0) return ""

    const width = Math.max(...cells.map((row) => row.length))
    const format = (row: string[]) =>
      `| ${Array.from({ length: width }, (_, i) => row[i] ?? "").join(" | ")} |`
    const [head, ...body] = cells
    const rule = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`
    return `\n\n${[format(head), rule, ...body.map(format)].join("\n")}\n\n`
  }

  function block(node: ElementNode): string {
    if (hidden(node)) return ""

    switch (node.tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4": {
        const level = Number(node.tag[1])
        return `\n\n${"#".repeat(level)} ${line(node)}\n\n`
      }
      case "p":
      case "figcaption":
        return `\n\n${line(node)}\n\n`
      case "pre":
        return codeBlock(node)
      case "ul":
        return list(node, false)
      case "ol":
        return list(node, true)
      case "table":
        return table(node)
      case "dt":
        return `\n\n**${line(node)}**\n`
      case "dd":
        return `\n${line(node)}\n\n`
      case "li":
        return `\n\n${blocks(node.children).trim()}\n\n`
      case "div":
      case "section":
      case "article":
      case "figure":
      case "dl":
      case "blockquote":
      case "details":
      case "summary":
      case "nav":
      case "header":
      case "footer":
      case "main":
        return `\n\n${blocks(node.children)}\n\n`
      case "hr":
        return "\n\n---\n\n"
      default:
        return inline(node)
    }
  }

  const BLOCK_TAGS = new Set([
    "h1", "h2", "h3", "h4", "p", "figcaption", "pre", "ul", "ol", "table",
    "dt", "dd", "li", "div", "section", "article", "figure", "dl", "blockquote",
    "details", "summary", "nav", "header", "footer", "main", "hr",
  ])

  /**
   * A run of siblings: consecutive inline nodes make one paragraph, block
   * nodes stand on their own.
   */
  function blocks(nodes: Child[]): string {
    let out = ""
    let run = ""
    const flush = () => {
      const text = run.replace(/[ \t]+/g, " ").trim()
      if (text) out += `\n\n${text}\n\n`
      run = ""
    }
    for (const node of nodes) {
      if (typeof node !== "string" && BLOCK_TAGS.has(node.tag)) {
        flush()
        out += block(node)
      } else {
        run += inline(node)
      }
    }
    flush()
    return out.replace(/\n{3,}/g, "\n\n")
  }

  return blocks(parse(html).children).trim()
}

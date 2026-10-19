import commentsSource from "@/demo/playground/resources/comments.ts?raw"
import companiesSource from "@/demo/playground/resources/companies.ts?raw"
import newslettersSource from "@/demo/playground/resources/newsletters.ts?raw"
import ordersSource from "@/demo/playground/resources/orders.ts?raw"
import overviewSource from "@/demo/playground/resources/overview.ts?raw"
import postsSource from "@/demo/playground/resources/posts.ts?raw"
import productsSource from "@/demo/playground/resources/products.ts?raw"
import tasksSource from "@/demo/playground/resources/tasks.ts?raw"
import usersSource from "@/demo/playground/resources/users.ts?raw"
import {
  COMMENTS_ID,
  COMPANIES_ID,
  NEWSLETTERS_ID,
  ORDERS_ID,
  OVERVIEW_ID,
  POSTS_ID,
  PRODUCTS_ID,
  TASKS_ID,
  USERS_ID,
} from "@/demo/playground/adminData"
import type { LineRange } from "@/lib/highlight"

const REPOSITORY = "https://github.com/hermez-agency/react-resource-view"

export interface Declaration {
  /** Path in the repository. */
  path: string
  source: string
}

function declaration(file: string, source: string): Declaration {
  return { path: `website/src/demo/playground/resources/${file}.ts`, source }
}

/**
 * The file each resource of the back office is declared in, read as text from
 * the very module the scope imports — so what the panel prints is what runs.
 *
 * Only text lives here: the highlighter is loaded with the panel, not with the
 * overview that counts these lines.
 */
export const DECLARATIONS: Record<string, Declaration> = {
  [OVERVIEW_ID]: declaration("overview", overviewSource),
  [USERS_ID]: declaration("users", usersSource),
  [COMPANIES_ID]: declaration("companies", companiesSource),
  [POSTS_ID]: declaration("posts", postsSource),
  [COMMENTS_ID]: declaration("comments", commentsSource),
  [NEWSLETTERS_ID]: declaration("newsletters", newslettersSource),
  [PRODUCTS_ID]: declaration("products", productsSource),
  [ORDERS_ID]: declaration("orders", ordersSource),
  [TASKS_ID]: declaration("tasks", tasksSource),
}

export function countLines(source: string): number {
  return source.trimEnd().split("\n").length
}

/** The link to the file on GitHub, on the lines of the active layout if any. */
export function githubUrl({ path }: Declaration, lines?: LineRange): string {
  const anchor = lines ? `#L${lines.from}-L${lines.to}` : ""

  return `${REPOSITORY}/blob/main/${path}${anchor}`
}

/** What identifies a layout of the list: its type, and its label or id. */
export interface LayoutRef {
  type: string
  label?: string
  id?: string
}

/**
 * The lines of the `layouts` entry that builds `layout`: from the
 * `layout.<type>(` call that opens it to the parenthesis that closes it.
 *
 * Found by the layout's type, which is what the declaration calls; when the
 * list has two layouts of one type, by the `label` or `id` written in the
 * call. A layout built by a call this does not recognise — a factory of one's
 * own — simply has nothing to mark.
 */
export function findLayoutLines(
  source: string,
  layout: LayoutRef | undefined
): LineRange | undefined {
  if (!layout) return undefined

  const lines = source.trimEnd().split("\n")
  const start = lines.findIndex((line) => line.includes("layouts:"))
  if (start === -1) return undefined

  const opener = new RegExp(`\\blayout\\.${layout.type}\\b(<[^>]*>)?\\(`)
  const ranges: LineRange[] = []

  for (let from = start; from < lines.length; from++) {
    if (!opener.test(lines[from])) continue
    const to = closingLine(lines, from)
    if (to !== undefined) ranges.push({ from: from + 1, to: to + 1 })
  }

  if (ranges.length <= 1) return ranges[0]

  const names = [layout.label, layout.id]
    .filter(Boolean)
    .flatMap((name) => [`label: "${name}"`, `id: "${name}"`])

  return ranges.find(({ from, to }) =>
    lines
      .slice(from - 1, to)
      .some((line) => names.some((name) => line.includes(name)))
  )
}

/** The line of the parenthesis closing the call opened on line `from`. */
function closingLine(lines: string[], from: number): number | undefined {
  let depth = 0

  for (let to = from; to < lines.length; to++) {
    for (const char of lines[to]) {
      if (char === "(") depth++
      if (char === ")") depth--
    }
    if (depth <= 0) return to
  }

  return undefined
}

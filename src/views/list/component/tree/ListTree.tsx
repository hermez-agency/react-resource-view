import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Trans, translate } from "react-mini-i18n"
import ListPagination from "@/views/list/component/ListPagination"
import ListResourceViewButton from "@/action/ListResourceViewButton"
import { InlineChildView } from "@/components/ChildViewResourceDialog"
import { SelectRowCheckbox } from "@/views/list/selection/SelectRowCheckbox"
import { Button } from "@/ui/button"
import { cn } from "@/ui/cn"
import type { TreeLayoutOptions } from "@/layout/layout"
import { useLayout } from "@/layout/useLayout"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import getIdFromObject from "@/internal/id/getIdFromObject"
import { getRecordTitle } from "@/internal/object/getRecordTitle"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { ListComponentPropsInterface } from "@/ViewResource"
import {
  branchKeys,
  buildTree,
  type TreeNode,
} from "@/views/list/component/tree/buildTree"

/** How far a level is pushed to the right, in rem. */
const INDENT_REM = 1.5

/**
 * A nested list, not an ARIA tree: each row holds a checkbox and action
 * buttons, which a `tree` would have to hide behind arrow-key navigation. The
 * disclosure buttons carry `aria-expanded` and are reached with Tab.
 */
export function ListTree({ rows = [] }: ListComponentPropsInterface) {
  const options = useLayout<TreeLayoutOptions>().options
  const currentResource = useCurrentViewResourceContext()
  const resource = currentResource?.resource
  const parentField = options.parentField ?? "parent"
  const titleField = options.titleField ?? currentResource?.view?.titleField

  const tree = useMemo(
    () =>
      buildTree(rows, parentField, (data: RecordOfAny) => [
        getIdFromObject(data, false, resource),
        getIdFromObject(data, true, resource),
      ]),
    [rows, parentField, resource]
  )
  const branches = useMemo(() => branchKeys(tree), [tree])

  // What the reader closed rather than what they opened: a record arriving
  // with the next page is then shown open, as the rest of the tree is.
  const [collapsed, setCollapsed] = useState<Set<string> | "all">(() =>
    options.defaultExpanded === false ? "all" : new Set()
  )
  const isOpen = (key: string) => collapsed !== "all" && !collapsed.has(key)
  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current === "all" ? branches : current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        <Trans>No data yet</Trans>
      </p>
    )
  }

  const renderNodes = (nodes: TreeNode[]) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0
      const open = hasChildren && isOpen(node.key)
      const title = getRecordTitle(node.row.data, titleField) ?? node.key

      return (
        <li key={node.key}>
          <div
            className="flex items-center gap-3 py-2.5 pr-4 transition-colors hover:bg-muted/40"
            style={{ paddingLeft: `${1 + node.depth * INDENT_REM}rem` }}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={translate(open ? "Collapse" : "Expand")}
                aria-expanded={open}
                onClick={() => toggle(node.key)}
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform motion-reduce:transition-none",
                    open && "rotate-90"
                  )}
                />
              </Button>
            ) : (
              // The same width as the chevron, so the titles of a level line up
              // whether or not a record has children.
              <span className="size-7 shrink-0" aria-hidden />
            )}
            <SelectRowCheckbox row={node.row} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {title}
            </span>
            {hasChildren && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {node.children.length}
              </span>
            )}
            <div className="flex shrink-0 gap-2">
              {node.row.pending !== "create" && (
                <ListResourceViewButton data={node.row.data} />
              )}
            </div>
          </div>
          <InlineChildView row={node.row} />
          {open && (
            <ul className="divide-y divide-border border-t border-border">
              {renderNodes(node.children)}
            </ul>
          )}
        </li>
      )
    })

  return (
    <div className="w-full">
      {branches.length > 0 && (
        <div className="mb-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set())}>
            <Trans>Expand all</Trans>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed("all")}>
            <Trans>Collapse all</Trans>
          </Button>
        </div>
      )}
      <ul
        aria-label={translate("Records")}
        className="divide-y divide-border overflow-hidden rounded-2xl border border-border"
      >
        {renderNodes(tree)}
      </ul>
      <div className="mt-3">
        <ListPagination />
      </div>
    </div>
  )
}

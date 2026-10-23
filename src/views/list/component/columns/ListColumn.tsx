import { useState } from "react"
import ListPagination from "@/views/list/component/ListPagination"
import { Trans, translate } from "react-mini-i18n"
import { ListComponentPropsInterface } from "@/ViewResource"
import RowWrapperColumnComponent from "@/views/list/component/columns/RowWrapperColumn"
import { useLayout } from "@/layout/useLayout"
import type { BoardLayoutOptions } from "@/layout/layout"
import {
  BoardContext,
  sameColumnValue,
  useBoard,
} from "@/views/list/component/columns/useBoard"
import { BoardSelectionBar } from "@/views/list/component/columns/BoardSelectionBar"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"

export default function ListColumn({ rows = [] }: ListComponentPropsInterface) {
  const {
    groupBy,
    columns: declared,
    hideEmpty,
    showUnassigned,
    unassignedLabel,
  } = useLayout<BoardLayoutOptions>().options
  const currentResource = useCurrentViewResourceContext()
  // Read again at each render, so a filter or a context that changed moves the
  // columns with it.
  const columns =
    typeof declared === "function"
      ? declared({
          viewResourceContext: currentResource.viewResource,
          rows,
          defaults: [],
        })
      : declared
  const selection = useListViewContext().selection
  const [isDragging, setIsDragging] = useState(false)

  const board = useBoard({
    rows,
    identifierKey: groupBy ?? "",
    columns: columns ?? [],
    selectable: selection?.selectable ?? true,
  })

  if (!rows.length) return <Trans>No data yet</Trans>

  // `layout.board()` refuses to be built without them in development.
  if (!groupBy || !columns) return null

  // A record whose value is in no column would be drawn nowhere, silently.
  const hasUnassigned = rows.some(
    (row) =>
      !columns.some((column) => sameColumnValue(board.columnOf(row), column.value))
  )

  return (
    <BoardContext value={board}>
      {/* The columns keep their width and the board scrolls, rather than each
          column shrinking until its cards are unreadable. */}
      <div className={"flex items-start gap-3 overflow-x-auto pb-2"}>
        {columns.map((currentIdentifier) =>
          // Drawn while a card is in the air, empty or not: it is a place to
          // drop it.
          (currentIdentifier.hideEmpty ?? hideEmpty) &&
          !board.dragging.length &&
          !isDragging &&
          !rows.some((row) =>
            sameColumnValue(board.columnOf(row), currentIdentifier.value)
          ) ? null : (
            <RowWrapperColumnComponent
              key={currentIdentifier.value as string}
              identifierKey={groupBy}
              valueIdentifier={currentIdentifier}
              isDragging={isDragging}
              handleDragging={setIsDragging}
              rows={rows}
            />
          )
        )}
        {showUnassigned !== false && hasUnassigned && (
          <RowWrapperColumnComponent
            key="unassigned"
            identifierKey={groupBy}
            valueIdentifier={{
              value: null,
              label: unassignedLabel ?? translate("No value"),
            }}
            isDragging={isDragging}
            handleDragging={setIsDragging}
            rows={rows}
            unassigned
          />
        )}
      </div>
      <BoardSelectionBar board={board} />
      <ListPagination />
    </BoardContext>
  )
}

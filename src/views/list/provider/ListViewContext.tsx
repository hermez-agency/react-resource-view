import { createContext } from "react"
import { FilterOutputsInterface } from "@/views/list/filter/useFilter"
import { ListViewOutputsInterface } from "@/views/list/hook/useList"
import { BaseJsonLdItemInterface } from "jsonld-item"
import { ListSelectionInterface } from "@/views/list/selection/useListSelection"

export interface ListViewContextInterface extends ListViewOutputsInterface<BaseJsonLdItemInterface> {
  filterContext?: FilterOutputsInterface
  /** The records selected, for the bulk actions. */
  selection?: ListSelectionInterface
}

export const ListViewContext = /* @__PURE__ */ createContext<
  Partial<ListViewContextInterface>
>({})

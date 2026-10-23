import { createForm } from "react-data-form"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { FormInterface } from "react-data-form"
import { RecordOfAny } from "@/internal/type/RecordOfAny"
import { useForm, FormContextOutput } from "react-data-form"
import isObjectEmpty from "@/internal/object/objectIsEmpty"
import { cleanValuesInObject } from "@/internal/object/cleanValuesInObject"
import { useMemo, useRef } from "react"
import { deepMerge } from "@/internal/object/deepMerge"
import { ViewResource } from "@/ViewResource"
import type { SortState } from "@/ResourceDefinition"
import FormGroupProviderFilter from "@/views/list/filter/FormGroupProviderFilter"
import { toForm } from "@/definition/toForm"
import { ReservedFilterKeys } from "@/api/apiDialectInterface"

export type FilterInterface = Record<string, any>

export interface FilterInputsInterface {
  onChange?: (filter: FilterInterface) => void
}

export interface FilterOutputsInterface {
  updateFilter: (filter: FilterInterface, merge?: boolean) => void
  resetFilter: (filter: FilterInterface) => void
  filter: FilterInterface
  filterIsEmpty: boolean
  formContext: FormContextOutput
  /** The sort the rows come in, as it goes to the API. */
  sort?: SortState
  setSort: (sort: SortState | undefined) => void
}

const defaultFormFilter: Partial<FormInterface> = {
  saveOnChange: true,
  components: {
    formGroupProvider: FormGroupProviderFilter,
  },
}

/** The filter bar of a resource's list — `views.list.filters` without `initial`. */
export function getFormFilter(resource: ViewResource): FormInterface | undefined {
  const filters = resource?.views?.list?.filters
  if (!filters) return undefined
  const { initial: _initial, ...form } = filters

  return toForm(form)
}

function getDefaultFilter(resource: ViewResource): FilterInterface {
  return resource?.views?.list?.filters?.initial ?? {}
}

const { order: ORDER_KEY, page: PAGE_KEY, cursor: CURSOR_KEY } = ReservedFilterKeys

export default function useFilter({
  onChange,
}: FilterInputsInterface): FilterOutputsInterface {
  const {
    resource,
    filter: resourceFilter,
    setFilter,
  } = useCurrentViewResourceContext()

  // Work out the initial values, in order of precedence
  const initialValues = useMemo(() => {
    const formInterface = deepMerge(defaultFormFilter, getFormFilter(resource) ?? {})

    // Precedence: defaultFilter > queryFilter > empty
    let initialData = !isObjectEmpty(resourceFilter) ? resourceFilter : undefined

    if (resourceFilter) {
      initialData = deepMerge(initialData ?? {}, resourceFilter)
    }

    return createForm(formInterface, initialData)
  }, [resource, resourceFilter])

  // The page the list is on, as the context knows it: what a change of the form
  // is measured against to tell a new page from a changed filter.
  const currentPage = useRef(resourceFilter?.[PAGE_KEY])
  currentPage.current = resourceFilter?.[PAGE_KEY]

  const formContext = useForm({
    form: initialValues,
    data: initialValues.data,
    onChange: (data) => {
      // A change that leaves the page as it was is a filter: the page on screen
      // means nothing for another search, which starts back at the first page.
      // The cursor belongs to the page it led to, and goes with it.
      const { [PAGE_KEY]: page, [CURSOR_KEY]: _cursor, ...rest } = data ?? {}
      if (page !== undefined && page === currentPage.current) {
        updateFilter(rest, false)
        return
      }
      const dataClean = cleanValuesInObject(data)
      setFilter(dataClean)
      onChange?.(dataClean)
    },
  })

  const filter = useMemo(() => {
    return cleanValuesInObject({ ...formContext.form.data })
  }, [formContext.form.data])

  const defaultFilter = useMemo(() => getDefaultFilter(resource), [resource])

  const userFilter = useMemo(() => {
    const userData: FilterInterface = {}
    Object.entries(formContext.form.inputs ?? {}).forEach(([key, input]) => {
      if (input?.generatedValue) return
      // A value left at its default is not a search; otherwise "clear search"
      // would be offered permanently.
      if (input?.value === defaultFilter[key]) return
      userData[key] = input?.value
    })
    return cleanValuesInObject(userData)
  }, [formContext.form.inputs, defaultFilter])

  const filterIsEmpty = useMemo(() => isObjectEmpty(userFilter), [userFilter])

  const updateFilter = (currentFilter: RecordOfAny, partial = true) => {
    // The form is rebuilt from what it is given: a partial update keeps the
    // other filters by passing them along.
    formContext.updateData(
      partial ? { ...formContext.form.data, ...currentFilter } : currentFilter,
      partial
    )
  }

  /**
   * "Clear the search" only empties what the user typed. Three kinds of filter
   * survive:
   * - those injected by the context — generated inputs, such as the parent set
   *   by a tab's `filter` — which define the scope of the
   *   list: losing them would show the rows of every company;
   * - the list's `initial` filters, which are its resting state;
   * - the sort, which is not a search: the rows found again come in the order
   *   the user chose.
   */
  const resetFilter = (filter: FilterInterface = {}) => {
    const injectedFilter: FilterInterface = {}
    Object.entries(formContext.form.inputs ?? {}).forEach(([key, input]) => {
      if (input?.generatedValue) injectedFilter[key] = input.value
    })
    const order = formContext.form.data?.[ORDER_KEY]

    updateFilter(
      {
        ...defaultFilter,
        ...cleanValuesInObject(injectedFilter),
        ...(order ? { [ORDER_KEY]: order } : {}),
        ...filter,
      },
      false
    )
  }

  /**
   * Sorts by one field — replacing the sort before it — or, given `undefined`,
   * by none. Back to the first page: the page on screen means nothing in
   * another order.
   */
  const setSort = (sort: SortState | undefined) => {
    const {
      [ORDER_KEY]: _order,
      [PAGE_KEY]: _page,
      [CURSOR_KEY]: _cursor,
      ...rest
    } = formContext.form.data ?? {}
    updateFilter(sort ? { ...rest, [ORDER_KEY]: sort } : rest, false)
  }

  const sort = (formContext.form.data?.[ORDER_KEY] ?? undefined) as
    SortState | undefined

  return {
    formContext,
    updateFilter,
    filter,
    filterIsEmpty,
    resetFilter,
    sort,
    setSort,
  }
}

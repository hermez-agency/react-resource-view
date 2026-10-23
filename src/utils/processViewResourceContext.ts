import { resolveViewResourceContext } from "@/utils/resolveViewResourceContext"
import { ActionList } from "react-data-form"
import {
  ViewResourceContext,
  ViewResourceContextParams,
} from "@/ViewResourceContext"
import getIdFromObject from "@/internal/id/getIdFromObject"

const DEFAULT_PAGE_SIZE = 30

/**
 * The record of a singleton, or the creation view that stands in for it when
 * there is none yet. Its identifier is set so that saving updates it.
 */
async function processSingleton(
  currentView: ViewResourceContext,
  signal?: AbortSignal
): Promise<ViewResourceContext> {
  const { resource } = currentView
  const singleton = resource.singleton!
  const context = { viewResourceContext: currentView, signal }

  let record: object | null | undefined
  try {
    record = singleton.get
      ? await singleton.get(context)
      : (await resource.getItem({ id: String(singleton.id) }, context)).data
  } catch (error) {
    // `{ id }` of a record not created yet: the API answers 404.
    if ((error as { status?: number } | null)?.status !== 404) throw error
  }

  if (record) {
    return {
      ...currentView,
      data: record,
      id: getIdFromObject(record, false, resource) ?? currentView.id,
    }
  }

  return {
    ...currentView,
    resourceAction: ActionList.create,
    view: resource.views[ActionList.create],
    data: undefined,
    defaultData: currentView.defaultData ?? singleton.defaultData,
  }
}

export async function processViewResourceContext(
  viewResourceContextParams: ViewResourceContextParams,
  signal?: AbortSignal
) {
  const currentView = resolveViewResourceContext(viewResourceContextParams)

  if (currentView.resourceAction === ActionList.list) {
    // The page size travels with the request rather than staying a display
    // setting: Strapi and Supabase page by an explicit size, and a list whose
    // pagination counts by 30 while the API answers 10 at a time is wrong on
    // both counts. Without a declared pageSize it is the 30 ListPagination
    // counts by, never the API's own default (20 for Spring, 25 for Strapi).
    // An explicit filter still wins.
    const filter = {
      itemsPerPage: currentView.view?.pageSize ?? DEFAULT_PAGE_SIZE,
      ...currentView.filter,
    }

    const response = await currentView.resource?.getCollection(filter, {
      viewResourceContext: currentView,
      signal,
    })
    currentView.data = response?.data ?? currentView.data
    return { ...currentView }
  }

  // A singleton is not looked up by the identifier of the URL: it is looked
  // for, and created when it is not there.
  const opensSingleton =
    currentView.resource?.singleton &&
    (currentView.resourceAction === ActionList.update ||
      currentView.resourceAction === ActionList.read)
  if (opensSingleton) return processSingleton(currentView, signal)

  // A creation has no existing item to load
  if (currentView.resourceAction === ActionList.create && !currentView.id) {
    return { ...currentView }
  }

  const response = await currentView.resource?.getItem(
    { id: currentView.id },
    {
      viewResourceContext: currentView,
      signal,
    }
  )
  currentView.data = response?.data ?? currentView.data

  return { ...currentView }
}

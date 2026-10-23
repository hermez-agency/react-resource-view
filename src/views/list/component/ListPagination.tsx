import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { Trans, translate } from "react-mini-i18n"
import { Button } from "@/ui/button"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { getCollectionItems, getCollectionTotal } from "@/api/collection"

export default function ListPagination() {
  const listViewContext = useListViewContext()
  const currentResource = useCurrentViewResourceContext()
  const currentView = currentResource.view

  if (!listViewContext.originalData) {
    return null
  }

  const Pagination = currentView?.components.pagination
  if (Pagination) {
    return <Pagination />
  }

  const itemPerPage = currentView.pageSize ?? 30

  const onPageChange = (page: number) => {
    listViewContext.filterContext.updateFilter({ page })
  }

  const currentPage = listViewContext.filterContext.filter["page"] ?? 1
  const reportedTotal = getCollectionTotal(
    listViewContext.originalData,
    currentResource.resource
  )

  // An API that reports no total cannot give a page count: it offers
  // Previous / Next, Next staying on while the page comes back full.
  if (reportedTotal === undefined) {
    const rowCount = getCollectionItems(
      listViewContext.originalData,
      currentResource.resource
    ).length
    const hasNext = rowCount >= itemPerPage
    if (currentPage === 1 && !hasNext) return <></>

    return (
      <nav
        className="flex items-center justify-between px-4 py-3 sm:px-6 p-5"
        aria-label={translate("Pagination")}
      >
        <Button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={"fc"}
        >
          <Trans>previous</Trans>
        </Button>
        <Button
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className={"fc"}
        >
          <Trans>next</Trans>
        </Button>
      </nav>
    )
  }

  const totalItems = reportedTotal
  const totalPages = Math.ceil((totalItems as number) / itemPerPage)
  const startItem = (currentPage - 1) * itemPerPage + 1
  const endItem = Math.min(currentPage * itemPerPage, totalItems)

  if (totalItems === 0 || totalPages === 1) return <></>

  type PageEntry = number | "start-ellipsis" | "end-ellipsis"

  const getVisiblePages = (): PageEntry[] => {
    const maxVisiblePages = 4
    const pages: PageEntry[] = []

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 2) {
        pages.push("start-ellipsis")
      }

      const startPage = Math.max(2, currentPage - 1)
      const endPage = Math.min(totalPages - 1, currentPage + 1)

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 1) {
        pages.push("end-ellipsis")
      }

      pages.push(totalPages)
    }

    return pages
  }

  const pages = getVisiblePages()

  return (
    <div className="flex items-center justify-between  px-4 py-3 sm:px-6 p-5">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={"fc"}
        >
          <Trans>previous</Trans>
        </Button>
        <Button
          className={"fc"}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <Trans>next</Trans>
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-2xs mr-5"
            aria-label={translate("Pagination")}
          >
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="relative inline-flex items-center rounded-l-md px-2 py-2  ring-1 ring-inset ring-muted/50 hover:bg-primary/90 focus:z-20 focus:outline-offset-0"
            >
              <span className="sr-only">
                <Trans>previous</Trans>
              </span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {pages.map((page) =>
              typeof page === "number" ? (
                <button
                  key={page + "-pagination"}
                  onClick={() => onPageChange(page)}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === currentPage
                      ? "bg-primary/10 text-primary"
                      : "ring-1 ring-inset ring-muted/50 hover:bg-primary/90 hover:text-secondary"
                  } focus:z-20 focus:outline-offset-0`}
                >
                  {page}
                </button>
              ) : (
                <span
                  key={page}
                  aria-hidden="true"
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-muted/50"
                >
                  ...
                </span>
              )
            )}
            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="relative inline-flex items-center rounded-r-md px-2 py-2  ring-1 ring-inset ring-muted/50 hover:bg-primary/90 hover:text-secondary focus:z-20 focus:outline-offset-0"
            >
              <span className="sr-only">
                <Trans>next</Trans>
              </span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>

        <div>
          <p className="text-sm text-foreground">
            {translate("{{start}}–{{end}} of {{total}}", {
              start: startItem,
              end: endItem,
              total: totalItems,
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { Trans, translate } from "react-mini-i18n"
import { createForm, getFormInputsFromForm } from "react-data-form"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { usePermission } from "@/utils/permissionResource"
import {
  ExportColumn,
  ExportFormat,
  ExportProgress,
  downloadText,
  fetchAllRows,
  toCsv,
  toJson,
} from "@/views/list/export/exportRows"

const FORMATS: Record<ExportFormat, { label: string; mime: string }> = {
  csv: { label: "CSV", mime: "text/csv;charset=utf-8" },
  json: { label: "JSON", mime: "application/json;charset=utf-8" },
}

/**
 * Downloads every row the list's filters match, in CSV or JSON.
 *
 * The rows are read page by page through the resource's own repository rather
 * than asked of a backend endpoint, so the export holds what the list holds —
 * its filters, its sort, its columns — on any dialect, and the button can say
 * how far the reading is.
 */
export function ExportButton() {
  const currentResource = useCurrentViewResourceContext()
  const listViewContext = useListViewContext()
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<ExportProgress>()

  const view = currentResource.view
  const resource = currentResource.resource
  const canExport = usePermission("export")

  if (!canExport || !resource?.getCollection) return null

  const isExporting = progress !== undefined

  const handleExport = async (format: ExportFormat) => {
    setOpen(false)
    setProgress({ loaded: 0 })
    try {
      // The columns the table draws: the form's inputs, but for the ones the
      // context generates and the reader never sees.
      const columns: ExportColumn[] = view.form
        ? getFormInputsFromForm(createForm(view.form))
            .filter((input) => !input.generatedValue)
            .map((input) => {
              const field = String(input["name"] ?? input.id)
              return { field, label: translate(String(input.label ?? field)) }
            })
        : []

      const filter = listViewContext.filterContext?.filter ?? {}
      const rows = await fetchAllRows(resource, filter, { onProgress: setProgress })
      const content = format === "csv" ? toCsv(rows, columns) : toJson(rows, columns)
      const fileName = `${view.title ?? resource.name ?? "export"}.${format}`
      downloadText(content, fileName, FORMATS[format].mime)
    } catch {
      toast.error(translate("The export failed. Please try again."))
    } finally {
      setProgress(undefined)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="secondary" disabled={isExporting} />}>
        {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
        {isExporting ? (
          <span aria-live="polite">
            <Trans>Exporter</Trans> {progress.loaded}
            {progress.total !== undefined && ` / ${progress.total}`}
          </span>
        ) : (
          <Trans>Exporter</Trans>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 gap-1 p-2">
        {(Object.keys(FORMATS) as ExportFormat[]).map((format) => (
          <Button
            key={format}
            variant="ghost"
            className="justify-start"
            onClick={() => handleExport(format)}
          >
            {FORMATS[format].label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export default ExportButton

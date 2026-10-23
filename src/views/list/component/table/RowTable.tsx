import { TableCell, TableRow } from "@/ui/table"
import { RowComponentPropsInterface } from "@/ViewResource"
import { Trans } from "react-mini-i18n"
import { getFormInputsFromForm } from "react-data-form"
import getIdFromObject from "@/internal/id/getIdFromObject"
import useFormByResource from "@/hook/useFormByResource"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { useListViewContext } from "@/views/list/provider/useListViewContext"
import { FormContext } from "react-data-form"
import { ActionList } from "react-data-form"
import { JsonLDItem } from "jsonld-item"
import ListResourceViewButton from "@/action/ListResourceViewButton"
import { FormInterface } from "react-data-form"
import { FormGroupProviderPropsInterface } from "react-data-form"
import ItemRender from "@/views/list/ItemRender"
import { FormInputViolation } from "react-data-form"

import { DefaultItemComponent } from "@/views/list/component/DefaultItemComponent"
import { cn } from "@/ui/cn"
import { useLayout } from "@/layout/useLayout"
import type { TableLayoutOptions } from "@/layout/layout"
import {
  STICKY_ACTIONS_CELL,
  stickyFirstCellOfRow,
} from "@/views/list/component/table/stickyCells"
import { SelectRowCheckbox } from "@/views/list/selection/SelectRowCheckbox"
import {
  fieldOfInput,
  useColumnPreferences,
} from "@/views/list/component/table/columnPreferences"

function ListFormGroupProvider({
  formInput,
  onChange,
  formInputComponent,
}: FormGroupProviderPropsInterface) {
  const InputControllerComponent = formInputComponent
  const { resource } = useCurrentViewResourceContext()

  if (!formInput.controller) {
    return ItemRender(formInput.value, resource)
  }

  return (
    <>
      <InputControllerComponent formInput={formInput} onChange={onChange} />
      <FormInputViolation formInput={formInput} />
    </>
  )
}

export function RowTable({ row }: RowComponentPropsInterface) {
  const currentResource = useCurrentViewResourceContext()
  const listViewContext = useListViewContext()
  const { stickyActions, stickyFirstColumn } =
    useLayout<TableLayoutOptions>().options

  // The short form the URL takes: the number behind an IRI, a `documentId`, a
  // primary key — whichever the resource's dialect addresses a row by.
  const id = getIdFromObject(row?.data, true, currentResource.resource)

  const currentForm: FormInterface = {
    components: {
      formGroupProvider: ListFormGroupProvider,
    },
    saveOnChange: true,
    ...currentResource.view.form,
  }

  const formContext = useFormByResource({
    currentResource: {
      ...currentResource,
      id,
      resourceAction: ActionList.update,
    },
    form: currentForm,
    data: row?.data,
    onUpdated: (data: JsonLDItem<any>) => {
      listViewContext.updateData(data, false)
    },
  })

  const inputs = getFormInputsFromForm(formContext.form).filter(
    (formInput) => !formInput.generatedValue
  )
  const columns = useColumnPreferences(inputs.map(fieldOfInput))

  if (!row) return <Trans>No data yet</Trans>

  return (
    <FormContext key={"row-" + id} value={formContext}>
      <TableRow
        aria-busy={row.pending ? true : undefined}
        className={cn(
          stickyFirstColumn &&
            stickyFirstCellOfRow(!!listViewContext.selection?.selectable),
          (currentResource.isSelected(row.data) ||
            (listViewContext.selection?.selectable &&
              row.pending !== "create" &&
              listViewContext.selection.isSelected(
                listViewContext.selection.idOf(row)
              ))) &&
            "bg-primary/10",
          // Shown before the API answered: a discreet "being saved", and
          // nothing to act on for a record that has no identifier yet.
          row.pending && "opacity-60 transition-opacity",
          row.pending === "create" && "pointer-events-none"
        )}
      >
        {listViewContext.selection?.selectable && (
          <TableCell className="w-10">
            <SelectRowCheckbox row={row} />
          </TableCell>
        )}
        {columns.arrange(inputs).map((formInput, e) => (
          <DefaultItemComponent
            formInput={formInput}
            key={"item-cell" + e + formInput.id + formContext.form.version}
          />
        ))}
        <TableCell
          data-slot="row-actions"
          className={cn(
            "[&_button]:min-h-10 [&_button]:min-w-10",
            stickyActions && STICKY_ACTIONS_CELL
          )}
        >
          <div className="flex gap-2">
            {row.pending !== "create" && <ListResourceViewButton data={row.data} />}
          </div>
        </TableCell>
      </TableRow>
    </FormContext>
  )
}

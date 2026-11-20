import { RowComponentPropsInterface } from "@/ViewResource"
import { Trans } from "react-mini-i18n"

import { DefaultItemComponent } from "@/views/list/component/DefaultItemComponent"
import { Field } from "@/views/list/fields/Field"

export function DumpRowComponent({ row }: RowComponentPropsInterface) {
  if (!row || !row.data) return <Trans>No data yet</Trans>

  return (
    <div className={`w-full`}>
      {Object.entries(row.data).map(([key, value]) => (
        <Field key={key} name={key}>
          <div className="flex py-2">
            <div className="w-1/2 font-semibold text-foreground">{key}</div>
            <div className="w-1/2">
              <DefaultItemComponent
                key={"item-cell" + key}
                formInput={{ name: key, value: value }}
              />
            </div>
          </div>
        </Field>
      ))}
    </div>
  )
}

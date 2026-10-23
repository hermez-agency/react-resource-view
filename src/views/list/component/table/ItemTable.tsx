import { TableCell } from "@/ui/table"
import { ItemComponentPropsInterface } from "@/ViewResource"
import { InputControllerProvider } from "react-data-form"
import { MediaCompactContext } from "@/media/mediaInput"

export function ItemTable({ formInput }: ItemComponentPropsInterface) {
  if (!formInput) return null

  return (
    <TableCell>
      {/* A cell has no room for a drop zone: a media field shows its value. */}
      <MediaCompactContext value={true}>
        <InputControllerProvider formInput={formInput} />
      </MediaCompactContext>
    </TableCell>
  )
}

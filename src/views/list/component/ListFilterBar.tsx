import { PropsWithChildren } from "react"
import { ScrollArea } from "@/ui/scroll-area"
import { cn } from "@/ui/cn"

/**
 * Classes for the filter row, applied to the form itself: a single line, no
 * wrapping, every field keeping its width (`shrink-0`) so overflow scrolls
 * rather than squashing the controls.
 */
export const listFilterFormClassName =
  "flex flex-nowrap items-end gap-3 pb-2 [&>*]:shrink-0"

/**
 * Filter bar of a list: the filters read as a single line, which scrolls
 * horizontally when space runs short.
 *
 * Stacked, they used to push the list off screen on mobile — three filters ate
 * half the usable height of the calendar.
 */
export function ListFilterBar({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    // The content no wider than the list: a row of fields that keep their
    // width still runs past its edge and scrolls, and filters of the
    // application's own that wrap — buttons going onto a second line — wrap
    // at the width of the list, rather than being laid out on one line as
    // wide as all of them (Base UI's `min-width: fit-content`).
    <ScrollArea
      orientation="horizontal"
      className={cn("max-w-full", className)}
      contentStyle={{ minWidth: 0 }}
    >
      {children}
    </ScrollArea>
  )
}

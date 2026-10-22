"use client"

import type * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/ui/cn"

function ScrollArea({
  className,
  viewportClassName,
  orientation = "vertical",
  contentStyle,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  // Le viewport porte l'overflow : les contraintes de hauteur (max-h-*)
  // must go here rather than on the Root, or nothing scrolls.
  viewportClassName?: string
  // Scroll direction: "both" shows both bars.
  orientation?: "vertical" | "horizontal" | "both"
  // Written over the inline style Base UI gives the content of a horizontal
  // area — its `min-width: fit-content` among them.
  contentStyle?: React.CSSProperties
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName
        )}
      >
        {orientation === "vertical" ? (
          children
        ) : (
          // `Content` carries `min-width: fit-content`; without it a
          // `flex-nowrap` row is capped at the viewport width and nothing
          // scrolls horizontally.
          <ScrollAreaPrimitive.Content
            data-slot="scroll-area-content"
            style={contentStyle}
          >
            {children}
          </ScrollAreaPrimitive.Content>
        )}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && <ScrollBar />}
      {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }

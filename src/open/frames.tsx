import { ReactNode, useLayoutEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/ui/drawer"
import { ScrollArea } from "@/ui/scroll-area"
import { useMediaQuery } from "@/internal/browser/useMediaQuery"
import { ExpandToPageLink } from "@/components/ExpandToPageLink"
import { forgetChildViewOpener } from "@/components/childViewOpener"
import { cn } from "@/ui/cn"
import type { OpenFrameProps } from "@/open/open"

/**
 * What the library's own frames receive besides what any frame does: the
 * buttons it draws under the title — "Edit" on a record being read — and the
 * view's `className`.
 */
export interface BuiltInFrameProps extends OpenFrameProps {
  actions?: ReactNode
  className?: string
}

function ExpandLink({ href }: { href?: string }) {
  if (!href) return null

  return <ExpandToPageLink to={href} onNavigate={forgetChildViewOpener} />
}

/**
 * A frame animates between two states, and it is given neither for free: it is
 * mounted when the URL names a child view and dropped when the URL stops, so
 * left to itself it appears already open and disappears mid-transition.
 *
 * Opening a frame in a layout effect gives the panel somewhere to come from,
 * and holding `close` back until the closing transition has played gives it
 * somewhere to go — the URL only changes once the frame is off the screen.
 *
 * The effect is a layout one so that the frame opens before the browser paints
 * the page without it: a passive effect would do as well for the eye, but it
 * puts the view a whole tick further from the click that asked for it, and the
 * request it fires on mount with it.
 */
function useFrameTransition(close: () => void) {
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    setOpen(true)
  }, [])

  return {
    open,
    onOpenChange: (next: boolean) => {
      if (!next) setOpen(false)
    },
    onOpenChangeComplete: (next: boolean) => {
      if (!next) close()
    },
  }
}

/** A centred dialog over the page. */
export function DialogFrame({
  title,
  children,
  close,
  expandHref,
  actions,
  className,
}: BuiltInFrameProps) {
  const frame = useFrameTransition(close)

  return (
    <Dialog {...frame}>
      <DialogContent
        showCloseButton={true}
        // No taller than the screen, the title keeping its row and the
        // content scrolling in what is left: capped inside only, a long form
        // on a phone pushed the corners past both edges.
        className={cn(
          "max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] md:min-w-162.5",
          className
        )}
      >
        <DialogHeader className={cn("gap-3", expandHref && "pr-20")}>
          <DialogTitle>{title}</DialogTitle>
          {actions}
          <ExpandLink href={expandHref} />
        </DialogHeader>
        <ScrollArea className="min-h-0">{children}</ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A panel sliding in from the side where there is room for it: the right of a
 * desktop, the bottom of a phone. `md` is the breakpoint the rest of the
 * package sizes against.
 */
export function DrawerFrame({
  title,
  children,
  close,
  expandHref,
  actions,
}: BuiltInFrameProps) {
  const isWideScreen = useMediaQuery("(min-width: 768px)")
  const frame = useFrameTransition(close)

  return (
    <Drawer
      {...frame}
      // The direction the panel travels in is also the direction it is
      // swiped away in, so one prop settles both.
      swipeDirection={isWideScreen ? "right" : "down"}
      showSwipeHandle
    >
      <DrawerContent
        // Given a height of its own rather than the content's, the panel
        // does not resize itself as fields appear, and the form below
        // scrolls inside it instead of pushing it around.
        className="data-[swipe-axis=y]:[--drawer-height:85dvh] md:[--drawer-content-width:40rem]"
      >
        <DrawerHeader className={cn("gap-3", expandHref ? "pr-24" : "pr-14")}>
          <DrawerTitle>{title}</DrawerTitle>
          {actions}
          <ExpandLink href={expandHref} />
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-4 pb-4">
          {children}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

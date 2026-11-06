import { PlayCircle, X } from "lucide-react"
import { type MouseEvent, type ReactNode, useRef } from "react"

/**
 * A button that opens a video from public/videos in a modal, already playing.
 *
 * `play()` is called inside the click handler itself, not in an effect after
 * the dialog has rendered: browsers — Safari first — only let a video start
 * with its sound on during the gesture that asked for it. The native
 * `<dialog>` brings the focus trap, Escape and the backdrop; every way out
 * goes through its `close` event, and that is where the video pauses.
 */
export function VideoDialog({
  src,
  poster,
  title,
  children,
  className,
}: Readonly<{
  src: string
  poster: string
  title: string
  children: ReactNode
  className?: string
}>) {
  const base = `${import.meta.env.BASE_URL}videos/`
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  function open() {
    const element = video.current
    dialog.current?.showModal()
    if (!element) return

    element.muted = false
    // A browser that still refuses leaves the controls showing their own play
    // button, so there is nothing to undo.
    element.play()?.catch(() => {})
  }

  // A click on the backdrop lands on the dialog itself; one on the video or
  // the close button lands on them.
  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) dialog.current?.close()
  }

  return (
    <>
      <button type="button" onClick={open} className={className}>
        <PlayCircle className="size-4" aria-hidden />
        {children}
      </button>

      <dialog
        ref={dialog}
        aria-label={title}
        onClick={closeOnBackdrop}
        onClose={() => video.current?.pause()}
        className="m-auto w-[min(64rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07070d] shadow-lg">
          <video
            ref={video}
            className="block aspect-video w-full"
            controls
            playsInline
            preload="none"
            poster={`${base}${poster}`}
            aria-label={title}
          >
            <source src={`${base}${src}`} type="video/mp4" />
          </video>

          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close the video"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/90 backdrop-blur-md transition-colors hover:bg-black/75 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </dialog>
    </>
  )
}

import { Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"

/** Where the reader is: not started yet, watching (or paused), or at the end. */
type Stage = "idle" | "playing" | "ended"

/** 58.5 → "0:58": the length the capsule under the button announces. */
export function formatDuration(seconds: number): string {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

/** 58.5 → "one-minute": how the button tells a screen reader what it plays. */
function describeLength(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes === 1 ? "one-minute" : `${minutes}-minute`
}

/**
 * A video from public/videos, behind a play button of the site's own until the
 * reader asks for it.
 *
 * `src` and `poster` are file names inside public/videos: their URL is built on
 * BASE_URL, so it carries the same /<repository>/ prefix as every other asset.
 * Only the metadata loads until the reader presses play, and nothing ever
 * starts on its own — the videos have a voice-over.
 *
 * Before the first play, the poster sits under a veil and a round button; the
 * length on the capsule is read from the file's metadata, not written here.
 * Once it plays, the veil fades out and the browser's own controls take over —
 * a pause keeps them, and only the end brings the button back, as "Replay".
 */
export function SiteVideo({
  src,
  poster,
  title,
}: Readonly<{ src: string; poster: string; title: string }>) {
  const base = `${import.meta.env.BASE_URL}videos/`
  const video = useRef<HTMLVideoElement>(null)
  const [stage, setStage] = useState<Stage>("idle")
  const [duration, setDuration] = useState<number | null>(null)

  // The metadata may have arrived before hydration, and then no event is left
  // to tell us the length.
  useEffect(() => {
    readDuration()
  }, [])

  function readDuration() {
    const seconds = video.current?.duration
    if (seconds && Number.isFinite(seconds)) setDuration(seconds)
  }

  function play() {
    const element = video.current
    if (!element) return

    if (stage === "ended") element.currentTime = 0
    element.muted = false
    setStage("playing")
    // A browser that still refuses gets its button back rather than a veil
    // that faded over nothing.
    element
      .play()
      ?.catch(() =>
        setStage((current) => (current === "playing" ? "idle" : current))
      )
  }

  const covered = stage !== "playing"
  const replay = stage === "ended"
  const label = replay
    ? "Replay the video"
    : duration
      ? `Play the ${describeLength(duration)} video`
      : "Play the video"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-[#07070d] shadow-lg">
      <video
        ref={video}
        className="block aspect-video w-full"
        controls={!covered}
        playsInline
        preload="metadata"
        poster={`${base}${poster}`}
        aria-label={title}
        onLoadedMetadata={readDuration}
        onPlay={() => setStage("playing")}
        onEnded={() => setStage("ended")}
      >
        <source src={`${base}${src}`} type="video/mp4" />
      </video>

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-250 ease-out",
          covered ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        inert={!covered}
      >
        {/* A light veil, darker towards the bottom, so the button reads on any frame. */}
        <span
          className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/65"
          aria-hidden
        />

        <button
          type="button"
          onClick={play}
          aria-label={label}
          className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 focus-visible:outline-none"
        >
          <span
            className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-white/80 ring-offset-2 ring-offset-transparent transition-colors group-hover:bg-primary/90 group-focus-visible:ring-2 sm:size-24"
            aria-hidden
          >
            {replay ? (
              <RotateCcw className="size-7 sm:size-9" />
            ) : (
              <Play className="ml-1 size-7 fill-current sm:size-9" />
            )}
          </span>

          <span
            className="relative rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md"
            aria-hidden
          >
            {[
              replay ? "Replay" : "Watch",
              duration && formatDuration(duration),
              "with sound",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </button>
      </div>
    </div>
  )
}
